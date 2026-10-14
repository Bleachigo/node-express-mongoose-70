import 'dotenv/config';
import { ObjectId } from 'mongodb';
import { mongoRepository } from './mongodb.repository.js';
import { Balloon } from '../models/balloon.model.js';
import { UPDATABLE_FIELDS } from '../models/balloon.model.js';

const COLLECTION = 'balloons';
const toBalloon = ({ _id, ...rest }) => ({ ...rest, id: _id.toString() });
const toObjectId = (id) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

export const balloonsRepository = {
  async createMany(items) {
    return await Balloon.create(items);
  },

  async updateBalloon(id, changes) {
    return await Balloon.findByIdAndUpdate(id, changes, {
      returnDocument: 'after',
      runValidators: true,
    });
  },

  // async replaceBalloon(id, changes, options) {
  //   const _id = toObjectId(id);
  //
  //   if (!_id) return null;
  //
  //   return await mongoRepository.replaceOne(
  //     COLLECTION,
  //     { _id },
  //     changes,
  //     options,
  //   );
  // },

  async replaceBalloon(id, fields) {
    const fieldsToSet = {};
    const fieldsToUnset = {};

    for (const field of UPDATABLE_FIELDS) {
      if (fields[field] !== undefined) {
        fieldsToSet[field] = fields[field];
      } else {
        fieldsToUnset[field] = '';
      }
    }

    const update = {};
    if (Object.keys(fieldsToSet).length) update.$set = fieldsToSet;
    if (Object.keys(fieldsToUnset).length) update.$unset = fieldsToUnset;

    return await Balloon.findByIdAndUpdate(id, update, {
      returnDocument: 'after',
      runValidators: true,
    });
  },

  async updateBalloons(query, changes, options) {
    return await mongoRepository.updateDocuments(
      COLLECTION,
      query,
      changes,
      options,
    );
  },

  async deleteBalloons(filter) {
    return mongoRepository.deleteDocuments(COLLECTION, filter);
  },

  async deleteBalloon(id) {
    const _id = toObjectId(id);

    if (!_id) return null;

    return mongoRepository.deleteDocument(COLLECTION, { _id });
  },

  async getStats({ shape, minPrice, maxPrice, since } = {}) {
    const match = {};

    if (shape) match.shape = shape;

    if (minPrice !== undefined || maxPrice !== undefined) {
      match.price = {};
      if (minPrice !== undefined) match.price.$gte = minPrice;
      if (maxPrice !== undefined) match.price.$lte = maxPrice;
    }

    if (since) match.createdAt = { $gte: since };

    const pipeline = [
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      {
        $group: {
          _id: '$shape',
          count: { $sum: 1 },
          totalPrice: { $sum: '$price' },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
      {
        $project: {
          _id: 0,
          shape: '$_id',
          count: 1,
          totalPrice: 1,
          avgPrice: { $round: ['$avgPrice', 2] },
          minPrice: 1,
          maxPrice: 1,
        },
      },
      { $sort: { count: -1 } },
    ];

    return getCollection(COLLECTION).aggregate(pipeline).toArray();
  },

  async randomizePrices(min = 10, max = 200) {
    return getCollection(COLLECTION).updateMany({ price: { $exists: false } }, [
      {
        $set: {
          price: {
            $round: [
              { $add: [min, { $multiply: [{ $rand: {} }, max - min] }] },
              2,
            ],
          },
        },
      },
    ]);
  },
};
