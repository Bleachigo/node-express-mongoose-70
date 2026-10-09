import cookieParser from 'cookie-parser';
import 'dotenv/config';
import helmet from 'helmet';
import ejs from 'ejs';
import express from 'express';
import session from 'express-session';
import MongoStore from 'connect-mongo';
// import { client } from './src/config/mongodb.config.js';
import mongoose from 'mongoose';
import passport from './src/config/passport.config.js';
import path from 'node:path';
import pug from 'pug';
import {
  errorHandler,
  logRequest,
  notFound,
  themeMiddleware,
} from './src/middleware/index.js';
import {
  articleRouter,
  authRouter,
  rootRouter,
  themeRouter,
  usersRouter,
  balloonsRouter,
} from './src/routes/index.js';

export const createApp = () => {
  const app = express();

  const isProd = process.env.NODE_ENV === 'production';
  const MAX_AGE = 60 * 60 * 1000;

  if (isProd) app.set('trust proxy', 1);

  app.set('views', './src/views');

  app.engine('ejs', ejs.__express);
  app.engine('pug', pug.__express);

  app.use(logRequest);
  app.use(helmet());
  app.use(express.static(path.join(import.meta.dirname, './public')));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    session({
      store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        dbName: process.env.MONGODB_DB_NAME,
        collectionName: 'sessions',
        ttl: MAX_AGE / 1000,
        autoRemove: 'native',
        touchAfter: 10 * 60,
      }),
      name: 'sid',
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        maxAge: MAX_AGE,
      },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(themeMiddleware);
  app.use('/auth', authRouter);
  app.use('/theme', themeRouter);
  app.use('/', rootRouter);
  app.use('/users', usersRouter);
  app.use('/articles', articleRouter);
  app.use('/balloons', balloonsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
