import rateLimit from 'express-rate-limit';
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } from '../constants/rateLimit';

// Debug: Log the rate limiting configuration
console.log(`🔒 Rate limiting config: ${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS}ms (${RATE_LIMIT_WINDOW_MS/1000/60} minutes)`);

// Global rate limiting middleware
const globalRateLimit = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export default globalRateLimit;
