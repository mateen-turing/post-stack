import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } from '../constants/rateLimit';

describe('Rate Limiting', () => {
  const baseUrl = `http://localhost:${process.env.PORT}`;

  describe('Global Rate Limiting', () => {
    it('should allow requests within the rate limit', async () => {
      for (let i = 0; i < Math.min(RATE_LIMIT_MAX_REQUESTS, 10); i++) {
        const response = await fetch(`${baseUrl}/health`);
        expect(response.status).toBe(200);
      }
    });

    it('should include rate limit headers in responses', async () => {
      const response = await fetch(`${baseUrl}/health`);

      expect(response.headers.get('ratelimit-limit')).toBeTruthy();
      expect(response.headers.get('ratelimit-remaining')).toBeTruthy();
      expect(response.headers.get('ratelimit-reset')).toBeTruthy();

      const limit = parseInt(response.headers.get('ratelimit-limit') || '0');
      const remaining = parseInt(response.headers.get('ratelimit-remaining') || '0');

      expect(limit).toBe(RATE_LIMIT_MAX_REQUESTS);
      expect(remaining).toBeLessThanOrEqual(RATE_LIMIT_MAX_REQUESTS);
    });

    it('should block requests when rate limit is exceeded', async () => {
      const promises: any[] = [];

      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS + 5; i++) {
        promises.push(fetch(`${baseUrl}/health`));
      }

      const responses: any = await Promise.all(promises);

      const rateLimitedResponses = responses.filter((res: any) => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      if (rateLimitedResponses.length > 0) {
        const errorResponse = rateLimitedResponses[0];
        const errorData = await errorResponse.json();
        expect(errorData).toHaveProperty('error', 'Too many requests');
        expect(errorData).toHaveProperty('message', 'Rate limit exceeded. Please try again later.');
      }
    }, 10000);

    it('should apply rate limiting to all API endpoints', async () => {
      const endpoints = [
        '/health',
        '/api/auth/login',
        '/api/posts',
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(`${baseUrl}${endpoint}`);

        expect(response.headers.get('ratelimit-limit')).toBeTruthy();
        expect(response.headers.get('ratelimit-remaining')).toBeTruthy();
      }
    });

    it('should include reset header for rate limit window', async () => {

      const response = await fetch(`${baseUrl}/health`);

      expect(response.headers.get('ratelimit-reset')).toBeTruthy();

      const resetValue = response.headers.get('ratelimit-reset');
      expect(resetValue).toBeTruthy();
      expect(resetValue).not.toBe('0');
    });
  });

  describe('Rate Limiting Configuration', () => {
    it('should have correct production values', () => {

      expect(RATE_LIMIT_MAX_REQUESTS).toBe(100);
      expect(RATE_LIMIT_WINDOW_MS).toBe(15 * 60 * 1000);
    });

    it('should have reasonable default values', () => {

      expect(RATE_LIMIT_MAX_REQUESTS).toBeGreaterThan(0);
      expect(RATE_LIMIT_WINDOW_MS).toBeGreaterThan(0);
    });
  });
});