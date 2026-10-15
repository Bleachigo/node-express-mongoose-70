import { AppError } from '../utils/AppError.js';
import { balloonsRepository } from '../repositories/balloons.repository.js';

const SHAPES = ['round', 'heart', 'star'];
const MAX_BATCH = 100;

const toBalloonDoc = (item, index) => {
  const { color, shape, size } = item ?? {};

  if (typeof color !== 'string' || !color.trim()) {
    throw new AppError(`Item ${index}: color must be a non empty string`, 400);
  }

  if (!SHAPES.includes(shape)) {
    throw new AppError(
      `Item ${index}: shape must be one of ${SHAPES.join(', ')}`,
      400,
    );
  }

  if (!Number.isInteger(size) || size <= 0) {
    throw new AppError(`Item ${index}: size must be a positive integer`, 400);
  }

  return {
    color,
    shape,
    size,
  };
};

const toFilter = (query = {}) => {
  const filter = {};

  if (query.color !== undefined) {
    filter.color = String(query.color).trim().toLowerCase();
  }

  if (query.shape !== undefined) {
    if (!SHAPES.includes(query.shape)) {
      throw new AppError(`shape must be one of ${SHAPES.join(', ')}`, 400);
    }
    filter.shape = query.shape;
  }

  if (!Object.keys(filter).length) {
    throw new AppError('Filter by color and/or shape is required', 400);
  }

  return filter;
};

export const balloonsService = {
  async createBalloons(items) {
    return balloonsRepository.createMany(items);
  },

  async updateOneBalloon(balloonId, updates) {
    const balloon = await balloonsRepository.updateBalloon(balloonId, updates);

    if (!balloon) {
      throw new AppError(`Balloon ${balloonId} not found`, 404);
    }

    if (!updates || Object.keys(updates).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    return balloon;
  },

  async replaceOneBalloon(balloonId, fields) {
    const balloon = await balloonsRepository.replaceBalloon(balloonId, fields);

    if (!balloon) {
      throw new AppError(`Balloon ${balloonId} not found`, 404);
    }
    return balloon;
  },

  async updateManyBalloons(query, updates) {
    const result = await balloonsRepository.updateBalloons(
      toFilter(query),
      updates,
    );

    if (!result?.matchedCount) {
      throw new AppError(
        `No matches were found by your query ${JSON.stringify(query)}`,
        404,
      );
    }

    const { matchedCount, modifiedCount } = result;

    return { matchedCount, modifiedCount };
  },

  async deleteManyBalloons(query) {
    const result = await balloonsRepository.deleteBalloons(toFilter(query));

    if (!result?.deletedCount) {
      throw new AppError(
        `No documents were deleted by your query: ${JSON.stringify(query)}`,
        404,
      );
    }

    return result.deletedCount;
  },

  async deleteOneBalloon(balloonId) {
    const result = await balloonsRepository.deleteBalloon(balloonId);

    if (!result?.deletedCount) {
      throw new AppError(`Balloon with ${balloonId} not found`, 404);
    }

    return result.deletedCount;
  },

  async getStats({ shape, minPrice, maxPrice, days }) {
    const filters = {};

    if (shape) filters.shape = String(shape);

    if (minPrice !== undefined) {
      filters.minPrice = Number(minPrice);

      if (Number.isNaN(filters.minPrice)) {
        throw new AppError('minPrice must be a number', 400);
      }
    }

    if (maxPrice !== undefined) {
      filters.maxPrice = Number(maxPrice);

      if (Number.isNaN(filters.maxPrice)) {
        throw new AppError('maxPrice must be a number', 400);
      }
    }

    if (days !== undefined) {
      const n = Number(days);

      if (Number.isNaN(n) || n <= 0) {
        throw new AppError('days must be a positive number', 400);
      }

      filters.since = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
    }

    return balloonsRepository.getStats(filters);
  },
};
