import { usersRepository } from '../repositories/users.repository.js';
import { AppError } from '../utils/AppError.js';
import { hashPassword, verifyPassword } from '../utils/password.js';

export const authService = {
  async register(email, password) {
    const existingUser = await usersRepository.findByEmail(email);

    if (existingUser) {
      throw new AppError('User already exists', 409);
    }

    const passwordHash = await hashPassword(password);

    const created = await usersRepository.createOne({
      email,
      passwordHash,
    });

    return { user: created };
  },
};

export const verifyCredentials = async (email, password) => {
  const user = await usersRepository.findCredentialsByEmail(email);

  if (!user?.passwordHash) return null;

  if (!(await verifyPassword(password, user.passwordHash))) return null;

  const { passwordHash, ...publicUser } = user;

  return publicUser;
};
