import { User } from '../models/user.model.js';

export const usersRepository = {
  async findAll() {
    return await User.find();
  },

  async findById(id) {
    return await User.findById(id);
  },

  async findByEmail(email) {
    return await User.findOne({ email });
  },

  async findCredentialsByEmail(email) {
    return await User.findOne({ email }).select('+passwordHash');
  },

  async createOne(user) {
    return await User.create(user);
  },

  async update(id, changes) {
    return await User.findByIdAndUpdate(id, changes, {
      returnDocument: 'after',
      runValidators: true,
    });
  },

  async replace(id, user) {
    return await User.findOneAndReplace({ _id: id }, user, {
      returnDocument: 'after',
      runValidators: true,
    });
  },

  async delete(id) {
    return await User.findByIdAndDelete(id);
  },
};
