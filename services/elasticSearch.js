const { getSignedUrl } = require('./S3service');
const { Client } = require('@elastic/elasticsearch');
const mongoose = require('mongoose');
const User = require('../models/mongoDBModal');

// Import credentials from .env
const ES_NODE = process.env.ELASTICSEARCH_NODE;
const ES_USERNAME = process.env.ELASTICSEARCH_USERNAME;
const ES_PASSWORD = process.env.ELASTICSEARCH_PASSWORD;

const esClient = new Client({
  node: ES_NODE,
  auth: {
    username: ES_USERNAME,
    password: ES_PASSWORD
  }
});

// Ensure index and mapping exist
async function ensureUserIndex() {
  const exists = await esClient.indices.exists({ index: 'users_index' });
  if (!exists) {
    await esClient.indices.create({
      index: 'users_index',
      body: {
        mappings: {
          properties: {
            fullName: { type: 'text' },
            email: { type: 'keyword' },
            pic: { type: 'keyword' },
            delete: { type: 'boolean' },
            createdAt: { type: 'date' },
            updatedAt: { type: 'date' }
          }
        }
      }
    });
  }
}

// Add or update user in Elasticsearch
async function indexUser(user) {
  await ensureUserIndex();
  const { _id, ...userBody } = user;
  if (userBody.signedPicUrl) delete userBody.signedPicUrl;

  await esClient.index({
    index: 'users_index',
    id: _id ? _id.toString() : user.id,
    body: userBody,
    refresh: true
  });
}

// Final search function with scoring + pagination
async function searchUsers({ query, page, limit }) {
  await ensureUserIndex();
  const q = query.trim();

  // Use the page and limit values from the frontend, default only if undefined/null/empty
  page = Number(page);
  limit = Number(limit);
  if (!Number.isInteger(page) || page < 1) page = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = 10;

  // If no query, just return all users paginated (like getUsers in MongoDB)
  if (!q) {
    const rawQuery = {
      index: 'users_index',
      from: (page - 1) * limit,
      size: limit,
      body: {
        query: {
          term: { delete: false }
        },
        sort: [
          { updatedAt: { order: 'desc' } }
        ]
      }
    };
    const { hits } = await esClient.search(rawQuery);
    const allHits = hits.hits || [];
    const total = hits.total && hits.total.value ? hits.total.value : allHits.length;
    const users = await Promise.all(
      allHits.map(async hit => {
        const user = { id: hit._id, ...hit._source };
        if (user.pic) {
          try {
            const signedUrl = await getSignedUrl(user.pic);
            user.signedPicUrl = signedUrl;
            user.pic = signedUrl;
          } catch (e) {
            user.signedPicUrl = null;
            user.pic = null;
          }
        } else {
          user.signedPicUrl = null;
          user.pic = null;
        }
        user.name = user.fullName || '';
        delete user.fullName;
        return user;
      })
    );
    return {
      success: true,
      users,
      total
    };
  }

  // If query is present, fetch all, score, sort, and paginate in-memory
  const rawQuery = {
    index: 'users_index',
    from: 0,
    size: 10000, // Get all results for scoring and pagination
    body: {
      query: {
        bool: {
          must: [
            {
              bool: {
                should: [
                  {
                    wildcard: {
                      fullName: {
                        value: `*${q.toLowerCase()}*`,
                        case_insensitive: true
                      }
                    }
                  },
                  {
                    wildcard: {
                      email: {
                        value: `*${q.toLowerCase()}*`,
                        case_insensitive: true
                      }
                    }
                  }
                ]
              }
            },
            { term: { delete: false } }
          ]
        }
      },
      sort: [
        { updatedAt: { order: 'desc' } }
      ]
    }
  };

  const { hits } = await esClient.search(rawQuery);
  const allHits = hits.hits || [];
  // SCORING: sort by score, then updatedAt desc
  let scored = allHits
    .map(hit => ({ id: hit._id, ...hit._source }))
    .map(user => {
      let score = 0;
      if (user.fullName) {
        const name = user.fullName.toLowerCase();
        if (name === q.toLowerCase()) score += 100;
        if (name.startsWith(q.toLowerCase())) score += 50;
        if (name.includes(q.toLowerCase())) score += 20;
        score += (name.split(q.toLowerCase()).length - 1) * 5;
      }
      if (user.email) {
        const email = user.email.toLowerCase();
        if (email === q.toLowerCase()) score += 80;
        if (email.startsWith(q.toLowerCase())) score += 40;
        if (email.includes(q.toLowerCase())) score += 15;
        score += (email.split(q.toLowerCase()).length - 1) * 3;
      }
      return { ...user, _score: score };
    })
    .filter(user => user._score > 0)
    .sort((a, b) => b._score - a._score || new Date(b.updatedAt) - new Date(a.updatedAt));

  // Paginate after scoring and sorting
  const total = scored.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  let paged = (start >= 0 && start < total) ? scored.slice(start, end) : [];
  const users = await Promise.all(
    paged.map(async user => {
      const result = { ...user };
      if (result.pic) {
        try {
          const signedUrl = await getSignedUrl(result.pic);
          result.signedPicUrl = signedUrl;
          result.pic = signedUrl;
        } catch (e) {
          result.signedPicUrl = null;
          result.pic = null;
        }
      } else {
        result.signedPicUrl = null;
        result.pic = null;
      }
      result.name = result.fullName || '';
      delete result.fullName;
      delete result._score;
      return result;
    })
  );

  return {
    success: true,
    users,
    total
  };
}


// Bulk sync
async function bulkSyncUsersToElasticsearch() {
  const users = await User.model.find({});
  for (const user of users) {
    await indexUser(user.toObject());
  }
  console.log('Bulk sync to Elasticsearch complete.');
}

// Realtime sync
async function startMongoToElasticsearchSync() {
  const User = require('../models/mongoDBModal').model;

  let changeStream;
  try {
    changeStream = User.watch();
  } catch (err) {
    console.warn('MongoDB change streams require replica set.');
    return;
  }

  changeStream.on('change', async change => {
    try {
      if (['insert', 'update', 'replace'].includes(change.operationType)) {
        const user = await User.findById(change.documentKey._id);
        if (user) {
          await indexUser(user.toObject());
          console.log(`[ES SYNC] Synced user ${user._id}`);
        }
      }
    } catch (err) {
      console.error('Error syncing MongoDB to Elasticsearch:', err);
    }
  });

  changeStream.on('error', err => console.error('Change Stream error:', err));
  changeStream.on('close', () => console.warn('Change Stream closed'));

  console.log('MongoDB to Elasticsearch realtime sync started');
}

module.exports = {
  esClient,
  indexUser,
  searchUsers,
  bulkSyncUsersToElasticsearch,
  startMongoToElasticsearchSync
};
