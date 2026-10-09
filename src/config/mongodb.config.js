// import { MongoClient } from 'mongodb';
import 'dotenv/config';
import mongoose from 'mongoose';

// export const client = new MongoClient(process.env.MONGODB_URI);

// let db;

// export const connectMongo = async () => {
//   await client.connect();
//
//   db = client.db(process.env.MONGODB_DB_NAME);
//
//   await db.command({ ping: 1 });
//
//   console.log('MongoDB connected successfully');
// };

export const connectMongo = async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME,
  });
};

// export const getCollection = (collectionName) => {
//   if (!db) {
//     throw new Error('MongoDB is not connected');
//   }
//
//   return db.collection(collectionName);
// };

export const closeMongo = async () => {
  await mongoose.disconnect();
  // db = undefined;
};
