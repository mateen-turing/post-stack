import { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';
import { CACHE_CONFIG } from '../constants/cache';
import { AuthRequest } from '../utils/auth';

const cache = new NodeCache({
  stdTTL: CACHE_CONFIG.TTL_DEFAULT,
  maxKeys: CACHE_CONFIG.MAX_SIZE,
  checkperiod: 120 // Check for expired keys every 2 minutes
});

export const generateCacheKey = (req: AuthRequest): string => {
  const { query, user, originalUrl, path } = req;
  const userId = user?.id || 'anonymous';

  const fullPath = originalUrl ? originalUrl.split('?')[0] : path;

  const queryString = Object.keys(query)
    .sort()
    .map(key => `${key}:${query[key]}`)
    .join(':');

  return `${fullPath}:${userId}:${queryString}`;
};

export const cacheMiddleware = (ttl?: number) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {

    if (req.method !== 'GET' || !CACHE_CONFIG.ENABLED) {
      return next();
    }

    const cacheKey = generateCacheKey(req);
    const cachedData = cache.get(cacheKey);

    if (cachedData) {

      return res.json(cachedData);
    }


    const originalJson = res.json;


    res.json = function (data: any) {

      const cacheTTL = ttl || CACHE_CONFIG.TTL_DEFAULT;
      cache.set(cacheKey, data, cacheTTL);


      return originalJson.call(this, data);
    };

    next();
  };
};


export const invalidateCache = {

  invalidateListCaches: () => {
    const keys = cache.keys();
    keys.forEach(key => {
      if (key.startsWith('/api/posts:') && !key.includes('/api/posts/')) {
        cache.del(key);
      }
      if (key.startsWith('/api/posts/my-posts:')) {
        cache.del(key);
      }
    });
  },


  invalidatePostCache: (slug: string) => {
    const keys = cache.keys();
    keys.forEach(key => {
      if (key.includes(`/api/posts/${slug}`)) {
        cache.del(key);
      }
    });
  },


  invalidateUserCaches: (userId: string) => {
    const keys = cache.keys();
    keys.forEach(key => {
      if (key.includes(`:${userId}:`)) {
        cache.del(key);
      }
    });
  },


  invalidateAll: () => {
    cache.flushAll();
  }
};

export default cache;
