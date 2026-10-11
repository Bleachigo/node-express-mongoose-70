import { ObjectId } from 'mongodb';
import { mongoRepository } from './mongodb.repository.js';
import { User } from '../models/user.model.js';

const COLLECTION = 'users';
const PUBLIC_FIELDS = { email: 1, role: 1 };

const withDefaults = (options = {}) => ({
  projection: PUBLIC_FIELDS,
  ...options,
});

const toObjectId = (id) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

const toUser = (doc) => {
  if (!doc) return null;

  const { _id, ...rest } = doc;

  return { ...rest, id: _id.toString() };
};

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

  async update(id, changes, options) {
    const _id = toObjectId(id);

    if (!_id) return null;

    return toUser(
      await mongoRepository.updateDocument(
        COLLECTION,
        { _id },
        changes,
        withDefaults(options),
      ),
    );
  },

  async replace(id, user, options) {
    const _id = toObjectId(id);

    if (!_id) return null;

    return toUser(
      await mongoRepository.replaceDocument(
        COLLECTION,
        { _id },
        user,
        withDefaults(options),
      ),
    );
  },

  async delete(id) {
    const _id = toObjectId(id);

    if (!_id) return null;

    return toUser(
      await mongoRepository.deleteDocument(
        COLLECTION,
        { _id },
        { projection: PUBLIC_FIELDS },
      ),
    );
  },
};
