const roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '❌ Not authenticated'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `❌ Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

module.exports = roleMiddleware;
