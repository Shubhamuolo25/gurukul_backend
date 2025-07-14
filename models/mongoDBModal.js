const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email:    { type: String, required: true },
  password: { type: String, required: true },
  delete:   { type: Boolean, default: false },
  pic:      { type: String }
}, { timestamps: true }); // Enable createdAt and updatedAt
//This ensures no duplication
const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

const User = {
  create: async ({ insertDict }) => new UserModel(insertDict).save(),
  findOne: async ({ query, projection }) => UserModel.findOne(query, projection).lean(),
  find: async ({ query, projection, sort = { updatedAt: -1 }, skip = 0, limit = 10 }) => {
    let cursor = UserModel.find(query, projection).sort(sort);
    if (skip) cursor = cursor.skip(skip);
    if (limit) cursor = cursor.limit(limit);
    return cursor.lean();
  },
  updateOne: ({ query, updateDict, options }) => UserModel.updateOne(query, updateDict, options),
  findByIdAndUpdate: (id, updateDict, options) => UserModel.findByIdAndUpdate(id, updateDict, options),
  countDocuments: (query) => UserModel.countDocuments(query),
  model: UserModel
};

module.exports = User;

