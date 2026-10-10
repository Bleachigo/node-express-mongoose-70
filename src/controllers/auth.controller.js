import { authService } from '../services/auth.service.js';

export const authController = {
  async registerUser(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user } = await authService.register(email, password);

      res.status(201).json({ user });
    } catch (error) {
      next(error);
    }
  },

  // async loginUser(req, res) {
  //   res.status(200).json({
  //     message: 'Login successful',
  //     user: {
  //       id: req.user.id,
  //       email: req.user.email,
  //     },
  //   });
  // },

  async me(req, res) {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
      },
    });
  },

  logout(req, res, next) {
    req.logout((error) => {
      if (error) return next(error);

      req.session.destroy((destroyErr) => {
        if (destroyErr) return next(destroyErr);

        res.clearCookie('sid');
        res.status(200).json({
          message: 'Logout successful',
        });
      });
    });
  },
};
