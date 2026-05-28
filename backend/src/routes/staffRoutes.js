// ==================== STAFF MANAGEMENT ROUTES ====================
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const staffController = require('../controllers/staffController');

// Public
router.get('/accept', auth, staffController.acceptInvitation);

// Admin/Vendor Routes
router.get('/roles', auth, staffController.getRoles);
router.post('/roles', auth, staffController.createRole);
router.get('/store-staff', auth, staffController.getStoreStaff); // Default route
router.get('/store/:storeId/staff', auth, staffController.getStoreStaff);
router.post('/invite', auth, staffController.inviteStaff);
router.put('/staff/update-role', auth, staffController.updateStaffRole);
router.delete('/staff/:staffId', auth, staffController.removeStaff);
router.get('/activity', auth, staffController.getActivityLog); // Default route
router.get('/store/:storeId/activity', auth, staffController.getActivityLog);
router.get('/store/:storeId/invitations', auth, staffController.getPendingInvitations);
router.delete('/invitations/:invitationId', auth, staffController.cancelInvitation);
router.get('/permissions', auth, staffController.checkMyPermissions);

module.exports = router;
