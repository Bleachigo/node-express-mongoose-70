import { AppError } from '../utils/AppError.js';
import { usersRepository } from '../repositories/users.repository.js';
import { hashPassword } from '../utils/password.js';

export const userService = {
  async getAllUsers() {
    return await usersRepository.findAll();
  },

  async findUserById(userId) {
    const user = await usersRepository.findById(userId);

    if (!user) {
      throw new AppError(`User ${userId} not found`, 404);
    }

    return user;
  },

  async updateUser(userId, userData) {
    const updatedUser = await usersRepository.update(userId, userData);

    if (!updatedUser) {
      throw new AppError(`User ${userId} not found`, 404);
    }

    return updatedUser;
  },

  async replaceUser(userId, userData) {
    if (!userData.email || !userData.password) {
      throw new AppError('email and password are required', 400);
    }

    const replacedUser = await usersRepository.replace(userId, {
      email: userData.email,
      passwordHash: await hashPassword(userData.password),
      role: userData.role,
    });

    if (!replacedUser) {
      throw new AppError(`User ${userId} not found`, 404);
    }

    return replacedUser;
  },

  async deleteUser(userId) {
    const deletedUser = await usersRepository.delete(userId);

    if (!deletedUser) {
      throw new AppError(`User ${userId} does not exitst`, 404);
    }

    return deletedUser;
  },
};
