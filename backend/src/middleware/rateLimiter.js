const rateLimitStore = new Map();

const rateLimiter = (options = {}) => {
    const windowMs = options.windowMs || 15 * 60 * 1000;
    const maxRequests = options.maxRequests || 100;
    const message = options.message || { success: false, error: 'Too many requests. Please try again later.' };

    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        const key = `${ip}:${userAgent}`;
        const now = Date.now();
        
        let requestData = rateLimitStore.get(key);
        
        if (!requestData) {
            requestData = { count: 0, resetTime: now + windowMs };
            rateLimitStore.set(key, requestData);
        }
        
        if (now > requestData.resetTime) {
            requestData.count = 0;
            requestData.resetTime = now + windowMs;
        }
        
        requestData.count++;
        
        if (requestData.count > maxRequests) {
            return res.status(429).json({
                ...message,
                retryAfter: Math.ceil((requestData.resetTime - now) / 1000)
            });
        }
        
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - requestData.count));
        res.setHeader('X-RateLimit-Reset', new Date(requestData.resetTime).toISOString());
        
        next();
    };
};

setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
        if (now > data.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 60 * 1000);

module.exports = rateLimiter;