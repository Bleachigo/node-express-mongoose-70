// import { getCollection } from '../config/mongodb.config.js';

export const mongoRepository = {
  async insertDocument(collectionName, document) {
    const collection = getCollection(collectionName);
    const result = await collection.insertOne(document);

    return {
      ...document,
      _id: result.insertedId,
    };
  },

  async insertDocuments(collectionName, documents) {
    const collection = getCollection(collectionName);
    const result = await collection.insertMany(documents);

    return documents.map((doc, index) => ({
      ...doc,
      _id: result.insertedIds[index],
    }));
  },

  async findDocument(collectionName, filter, options = {}) {
    return getCollection(collectionName).findOne(filter, options);
  },

  async findDocuments(collectionName, filter = {}, options = {}) {
    return getCollection(collectionName).find(filter, options).toArray();
  },

  async updateDocument(collectionName, filter, changes, options = {}) {
    return getCollection(collectionName).findOneAndUpdate(
      filter,
      { $set: changes },
      { returnDocument: 'after', ...options },
    );
  },

  async updateDocuments(collectionName, filter, changes, options = {}) {
    return getCollection(collectionName).updateMany(
      filter,
      { $set: changes },
      options,
    );
  },

  async replaceDocument(collectionName, filter, replacement, options = {}) {
    return getCollection(collectionName).findOneAndReplace(
      filter,
      replacement,
      {
        returnDocument: 'after',
        ...options,
      },
    );
  },

  async deleteDocument(collectionName, filter, options = {}) {
    return getCollection(collectionName).deleteOne(filter, options);
  },

  async deleteDocuments(collectionName, filter, options = {}) {
    return getCollection(collectionName).deleteMany(filter, options);
  },

  async updateOne(collectionName, filter, changes, options = {}) {
    return getCollection(collectionName).updateOne(
      filter,
      { $set: changes },
      options,
    );
  },

  async replaceOne(collectionName, filter, changes, options = {}) {
    return getCollection(collectionName).replaceOne(filter, changes, options);
  },
};
