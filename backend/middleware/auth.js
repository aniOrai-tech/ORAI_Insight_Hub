/**
 * Auth Middleware
 * JWT verification and role-based access control
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verify JWT token and attach user to request
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or user is inactive.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token has expired.' });
    }
    next(error);
  }
};

/**
 * Restrict to specific departments
 * @param {...string} departments - Allowed departments
 */
const allowDepartments = (...departments) => {
  return (req, res, next) => {
    if (!departments.includes(req.user.department)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This feature is not available for ${req.user.department}.`
      });
    }
    next();
  };
};

/**
 * Check specific permission
 * @param {string} permission - Permission key
 */
const checkPermission = (permission) => {
  return (req, res, next) => {
    const permissions = req.user.getPermissions();
    if (!permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You do not have permission to access ${permission}.`
      });
    }
    next();
  };
};

module.exports = { protect, allowDepartments, checkPermission };
