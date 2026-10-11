import express from 'express';
import { authController } from '../controllers/auth.controller.js';
import {
  validateUserInput,
  authenticateLocal,
  requireAuth,
} from '../middleware/index.js';

export const authRouter = express.Router();

authRouter.post('/register', authController.registerUser);
authRouter.post(
  '/login',
  validateUserInput,
  authenticateLocal,
  authController.loginUser,
);
authRouter.post('/logout', requireAuth, authController.logout);
authRouter.get('/me', requireAuth, authController.me);
