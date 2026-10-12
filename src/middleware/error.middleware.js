import { AppError } from '../utils/AppError.js';

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let statusCode = err.statusCode || err.status || 500;
  let message = err instanceof AppError ? err.message : 'Internal server error';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}. Expected ${err.kind}`;
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join('; ');
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = `This ${Object.keys(err.keyValue)[0]} already exists`;
  }

  if (statusCode >= 500) console.error(err);
  res.status(statusCode).type('text/plain').send(message);
};
