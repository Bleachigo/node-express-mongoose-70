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
  async findAll(options) {
    const docs = await mongoRepository.findDocuments(
      COLLECTION,
      {},
      withDefaults(options),
    );

    return docs.map(toUser);
  },

  async findById(id, options) {
    const _id = toObjectId(id);

    if (!_id) return null;

    return toUser(
      await mongoRepository.findDocument(
        COLLECTION,
        { _id },
        withDefaults(options),
      ),
    );
  },

  async findByEmail(email, options) {
    return toUser(
      await mongoRepository.findDocument(
        COLLECTION,
        { email },
        withDefaults(options),
      ),
    );
  },

  // async findCredentialsByEmail(email) {
  //   return toUser(
  //     await mongoRepository.findDocument(
  //       COLLECTION,
  //       { email },
  //       { projection: { ...PUBLIC_FIELDS, passwordHash: 1 } },
  //     ),
  //   );
  // },

  async findCredentialsByEmail(email) {
    return toUser(await User.findOne({ email }).select('+passwordHash').lean());
  },

  async createOne(user) {
    const { passwordHash, ...created } = toUser(
      await mongoRepository.insertDocument(COLLECTION, user),
    );

    return created;
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
