import { userService } from '../services/users.service.js';

export const userController = {
  async postUsers(req, res, next) {
    res.send(`Post user by id: ${req.params.userId}`);
  },

  async getUsers(req, res, next) {
    try {
      const users = await userService.getAllUsers();

      res.render('../views/users/index.pug', { users });
    } catch (error) {
      next(error);
    }
  },

  async getUserById(req, res, next) {
    try {
      const { userId } = req.params;

      const user = await userService.findUserById(userId);

      res.render('../views/users/details.pug', { user });
    } catch (error) {
      next(error);
    }
  },

  async putUserById(req, res, next) {
    try {
      const { userId } = req.params;

      const replacedUser = await userService.replaceUser(userId, req.body);

      res.json(replacedUser);
    } catch (error) {
      next(error);
    }
  },

  async patchUserById(req, res, next) {
    try {
      const { userId } = req.params;

      const updatedUser = await userService.updateUser(userId, req.body);

      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  },

  async deleteUserById(req, res, next) {
    try {
      const { userId } = req.params;

      const deletedUser = await userService.deleteUser(userId);

      res.json(deletedUser);
    } catch (error) {
      next(error);
    }
  },
};
