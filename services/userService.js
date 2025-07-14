// add all user logic here-Done

const User = require('../models/mongoDBModal');
const bcrypt = require('bcrypt');
const { logError } = require('../logger');
const { getSignedUrl } = require('./S3service');
const ValidationError = require('../exceptions/validationError');
const { searchUsers } = require('./elasticSearch');
const mongoose = require('mongoose');
const { indexUser } = require('./elasticSearch');
const { removeUserFromIndex } = require('./elasticSearch');

// Password validation function
const isPasswordValid = (pwd) => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(pwd);
};

const isFullNameValid = (fullName) => {
  return !!fullName && !!fullName.trim();
};

const isEmailValid = (email) => {
  return !!email && !!email.trim() && email.includes('@');
};

// Add User Service
// Validations
async function addUserService({ fullName, email, password, file }) {
  let errors = {};
  if (!isFullNameValid(fullName)) {
    errors.fullName = 'Full name is required.';
  }
  if (!isEmailValid(email)) {
    errors.email = 'Email must contain @.';
  }
  if (!password) {
    errors.password = 'Password is required.';
  } else if (!isPasswordValid(password)) {
    errors.password = 'Password must be at least 8 characters, include uppercase, lowercase, a number, and a special character.';
  }
  if (!file || !file.key) {
    errors.avatar = 'Photo is required.';
  }
  // If there are validation errors, throw a ValidationError
  if (Object.keys(errors).length > 0) {
    return { status: 400, body: { success: false, error: errors } };
  }
  try {
    // Use Mongoose model directly for all user lookups
    let existingUser = await User.model.findOne({ email });
    const hashedPassword = await bcrypt.hash(password, 10);
    let picKey = file && file.key ? file.key : '';
    if (existingUser) {
      if (existingUser.delete === false) {
        logError(`User with email ${email} already exists.`);
        return { status: 400, body: { success: false, error: { email: 'User already exists.' } } };
      } else {
        // Restore soft-deleted user
        existingUser.fullName = fullName;
        existingUser.password = hashedPassword;
        existingUser.pic = picKey;
        existingUser.delete = false;
        await existingUser.save();
        // Sync to Elasticsearch
        try {
          await indexUser(existingUser.toObject());
        } catch (e) {
          logError('Failed to re-index user in Elasticsearch: ' + e.message);
        }
        const userObj = existingUser.toObject();
        userObj.name = userObj.fullName;
        delete userObj.fullName;
        return { status: 200, body: { success: true, user: userObj, message: 'User restored and updated.' } };
      }
    }
    // Create new user
    const user = new User.model({ fullName, email, password: hashedPassword, pic: picKey });
    await user.save();
    const userObj = user.toObject();
    userObj.name = userObj.fullName;
    delete userObj.fullName;
    return { status: 201, body: { success: true, user: userObj } };
  } catch (error) {
    logError(error);
    return { status: 500, body: { success: false, error: 'Internal server error' } };
  }
}

// Get Users Service (paginated)
async function getUsersService({ page = 1, limit = 10 }) {
  try {
    const skip = (page - 1) * limit;
    const users = await User.find({ query: { delete: false }, sort: { updatedAt: -1 }, skip, limit });
    const total = await User.countDocuments({ delete: false });
    const mappedUsers = await Promise.all(users.map(async user => {
      const obj = { ...user };
      obj.name = obj.fullName;
      delete obj.fullName;
      if (obj.pic) {
        try {
          obj.signedPicUrl = await getSignedUrl(obj.pic);
        } catch (e) {
          obj.signedPicUrl = null;
        }
      } else {
        obj.signedPicUrl = null;
      }
      return obj;
    }));
    return { status: 200, body: { success: true, users: mappedUsers, total } };
  } catch (error) {
    logError(error);
    return { status: 500, body: { success: false, error: 'Failed to fetch users.' } };
  }
}

// // Get All Users Service (no pagination)
// async function getAllUsersService() {
//   try {
//     const users = await User.find({ delete: false });
//     const mappedUsers = users.map(user => {
//       const obj = user.toObject();
//       obj.name = obj.fullName || obj.fullname || '';
//       return obj;
//     });
//     return { status: 200, body: { users: mappedUsers, total: mappedUsers.length } };
//   } catch (error) {
//     logError(error);
//     return { status: 500, body: { error: 'Internal server error' } };
//   }
// }

// Delete User Service (soft delete)
async function deleteUserService({ id }) {
  try {
    const objectId = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
    logError(`[deleteUserService] Attempting to soft-delete user with id: ${id} (casted: ${objectId})`);
    const updated = await User.findByIdAndUpdate(objectId, { delete: true }, { new: true });

    // Remove from Elasticsearch as well
    try {
      logError(`[deleteUserService] Removing from Elasticsearch: ${objectId}`);
      await removeUserFromIndex(objectId);
      logError(`[deleteUserService] Removed from Elasticsearch: ${objectId}`);
    } catch (e) {
      logError('Failed to remove user from Elasticsearch: ' + e.message);
    }
    return { status: 200, body: { success: true } };
  } catch (error) {
    logError(error);
    return { status: 500, body: { error: '' } };
  }
}

module.exports = {
  addUserService,
  getUsersService,
  // getAllUsersService,
  deleteUserService,
  searchUsersService: searchUsers
};

