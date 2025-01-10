const { RateLimiterMemory } = require('rate-limiter-flexible');

// Rate limiter for summarize command (per user)
const summarizeRateLimiter = new RateLimiterMemory({
  points: 5, // Number of points
  duration: 60, // Per 60 seconds
});

// Rate limiter for message fetching (global)
const messageFetchRateLimiter = new RateLimiterMemory({
  points: 30, // Number of points
  duration: 60, // Per 60 seconds
});

module.exports = {
  summarizeRateLimiter,
  messageFetchRateLimiter,
}; 