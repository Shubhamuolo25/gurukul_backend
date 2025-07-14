const { addUserService, getUsersService, deleteUserService, searchUsersService } = require('../services/userService');
// const { logError } = require('../logger');
const { ValidationError } = require('../exceptions/validationError');
// Validation helpers moved to commonFunction.js
const {validateAddUser } = require('../utils/commonFunction');

const addUser = async (req, res, next) => {
   try {
     const { fullName, email, password, confirmPassword } = req.body;
     const file = req.file;
     // Use centralized validation
     const errors = validateAddUser({ fullName, email, password, confirmPassword, file });
     if (Object.keys(errors).length > 0) {
       throw new ValidationError(Object.values(errors).join(' '), 400);
     }
     const result = await addUserService({ fullName, email, password, file });
     if (result.status === 400 && result.body && result.body.error && result.body.error.email) {
       throw new ValidationError(JSON.stringify({ email: result.body.error.email }), 400);
     }
     return res.status(result.status).json(result.body);
   } catch (error) {
    // console.log('in catch')
     next(error);
   }
};

const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const result = await getUsersService({ page, limit });
    return res.status(result.status).json(result.body);
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await deleteUserService({ id });
    if (result.status !== 200) {
      return res.status(result.status).json(result.body);
    }
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const searchUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const from = (page - 1) * limit;
    const result = await searchUsersService({ query: req.query.query || '', from, size: limit,page });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = { addUser, getUsers, deleteUser, searchUsers };