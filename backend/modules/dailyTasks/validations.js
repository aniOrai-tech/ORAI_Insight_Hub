const { body } = require('express-validator');

exports.validateTask = [
  body('memberId').isMongoId().withMessage('Valid Member ID is required'),
  body('clientId').isMongoId().withMessage('Valid Client ID is required'),
  body('date').isISO8601().withMessage('Valid Date is required'),
  
  body('loginTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Login Time must be in HH:mm format'),
    
  body('logoutTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Logout Time must be in HH:mm format')
    .custom((value, { req }) => {
      if (!req.body.loginTime) return true;
      const [loginH, loginM] = req.body.loginTime.split(':').map(Number);
      const [logoutH, logoutM] = value.split(':').map(Number);
      
      const loginTotal = loginH * 60 + loginM;
      const logoutTotal = logoutH * 60 + logoutM;
      
      if (logoutTotal <= loginTotal) {
        throw new Error('Logout time must be after login time (no overnight shifts allowed)');
      }
      return true;
    }),

  body('taskActivity')
    .notEmpty().trim().withMessage('Task/Activity description is required')
    .isLength({ min: 5 }).withMessage('Activity description is too short'),
    
  body('status')
    .optional()
    .isIn(['not_started', 'in_progress', 'pending', 'completed']).withMessage('Invalid status selected')
];
