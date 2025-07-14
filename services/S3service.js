const AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region: process.env.S3_REGION
});
const s3 = new AWS.S3();

/**
 * Returns a signed URL for the given S3 key (object key)
 * @param {string} key - The S3 object key
 * @param {number} expiresInSeconds - Expiry time in seconds (default: 300)
 * @returns {Promise<string>} Signed URL
 */
async function getSignedUrl(key, expiresInSeconds = 300) {
  if (!key) return null;
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Expires: expiresInSeconds
  };
  return s3.getSignedUrlPromise('getObject', params);
}

module.exports = {
  getSignedUrl
};
