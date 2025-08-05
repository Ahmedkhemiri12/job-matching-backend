import rateLimit from 'express-rate-limit';


export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  // Add this handler to return JSON
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again in 15 minutes'
    });
  }
});


// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests
  message: 'Too many requests, please try again later'
});