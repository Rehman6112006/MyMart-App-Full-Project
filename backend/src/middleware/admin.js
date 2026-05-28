const pool = require('../config/database');

const strictAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access only' });
  }
  next();
};

const adminVendorOnly = async (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access only' });
  }
  req.isAdminView = true;
  next();
};

module.exports = { strictAdmin, adminVendorOnly };
