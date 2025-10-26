import { Response } from 'express';
import { cacheMiddleware, generateCacheKey, invalidateCache } from '../middleware/cache';
import { CACHE_CONFIG } from '../constants/cache';
import { AuthRequest } from '../utils/auth';
import cache from '../middleware/cache';

describe('Cache Middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/api/posts',
      originalUrl: '/api/posts?page=1&limit=10',
      query: { page: '1', limit: '10' },
      user: undefined
    };
    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnThis();

    mockRes = {
      json: jsonMock,
      status: statusMock,
    };
    mockNext = jest.fn();

    invalidateCache.invalidateAll();
  });

  afterEach(() => {
    invalidateCache.invalidateAll();
    jest.clearAllMocks();
  });

  it('should cache GET requests and serve from cache on subsequent calls', () => {
    const middleware = cacheMiddleware(CACHE_CONFIG.TTL_POSTS_LIST);

    // 1️⃣ First request → cache miss → should call next()
    middleware(mockReq as AuthRequest, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledTimes(1);

    const testKey = generateCacheKey(mockReq as AuthRequest);
    const testData = { posts: [{ id: 1, title: 'Test' }], pagination: {} };

    cache.set(testKey, testData, CACHE_CONFIG.TTL_POSTS_LIST);

    // 2️⃣ Second request → cache hit → should NOT call next()
    jest.clearAllMocks();
    middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(jsonMock).toHaveBeenCalledWith(testData);
  });

  it('should skip caching for non-GET requests', () => {
    mockReq.method = 'POST';
    const middleware = cacheMiddleware(CACHE_CONFIG.TTL_POSTS_LIST);

    middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockRes.json).not.toHaveBeenCalled();
  });

  it('should invalidate cache correctly', () => {
    expect(() => invalidateCache.invalidateListCaches()).not.toThrow();
    expect(() => invalidateCache.invalidatePostCache('test-slug')).not.toThrow();
    expect(() => invalidateCache.invalidateUserCaches('user123')).not.toThrow();
    expect(() => invalidateCache.invalidateAll()).not.toThrow();
  });
});
