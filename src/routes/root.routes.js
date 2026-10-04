import express from 'express';

export const rootRouter = express.Router();

rootRouter.get('/', (req, res) => {
  res.render('../views/root/index.pug');
});
