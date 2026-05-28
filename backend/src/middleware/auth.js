const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false,
      error: '❌ No token provided. Please login first.' 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false,
      error: '❌ Invalid or expired token.' 
    });
  }
};

// Vendor role check
const vendorOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  if (req.user.role !== 'vendor') {
    return res.status(403).json({ success: false, error: 'Vendor access only' });
  }
  next();
};

// Customer role check
const customerOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  if (req.user.role !== 'customer') {
    return res.status(403).json({ success: false, error: 'Customer access only' });
  }
  next();
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Token invalid or expired - continue without user
    }
  }
  next();
};

module.exports = authMiddleware;
module.exports.vendorOnly = vendorOnly;
module.exports.customerOnly = customerOnly;
module.exports.optionalAuth = optionalAuth;