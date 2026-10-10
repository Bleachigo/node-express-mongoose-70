import 'dotenv/config';
import mongoose from 'mongoose';

export const connectMongo = async () => {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB_NAME,
  });
};

export const closeMongo = async () => {
  await mongoose.disconnect();
};
