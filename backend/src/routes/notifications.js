const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/auth');

// Simple role authorization middleware
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }
        
        next();
    };
};

// All routes require authentication
router.use(authMiddleware);

// ========================
// USER NOTIFICATIONS
// ========================

// Get user notifications
router.get('/', notificationController.getNotifications);

// Mark all as read
router.put('/read-all', notificationController.markAllRead);

// ========================
// TEMPLATES
// ========================

// Get all templates
router.get('/templates', notificationController.getTemplates);

// Create template
router.post('/templates', authorizeRoles('admin'), notificationController.createTemplate);

// ========================
// NOTIFICATIONS
// ========================

// Send unified notification
router.post('/send', notificationController.sendNotification);

// Send email notification
router.post('/email', notificationController.sendEmailNotification);

// Send SMS notification
router.post('/sms', notificationController.sendSMSNotification);

// Send WhatsApp notification
router.post('/whatsapp', notificationController.sendWhatsAppNotification);

// ========================
// QUEUE MANAGEMENT
// ========================

// Get queue status
router.get('/queue/status', authorizeRoles('admin'), notificationController.getQueueStatus);

// ========================
// LOGS
// ========================

// Get notification logs
router.get('/logs', authorizeRoles('admin'), notificationController.getLogs);

// ========================
// PREFERENCES
// ========================

// Get user preferences
router.get('/preferences/:user_id', notificationController.getPreferences);

// Update user preferences
router.put('/preferences/:user_id', notificationController.updatePreferences);

// ========================
// PUSH NOTIFICATIONS
// ========================

// Register push token
router.post('/push/register', notificationController.registerPushToken);

// Send push notification
router.post('/push/send', authorizeRoles('admin', 'vendor'), notificationController.sendPushNotification);

module.exports = router;
