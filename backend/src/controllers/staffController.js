// ==================== STAFF MANAGEMENT CONTROLLER ====================

const staffService = require('../services/staffService');
const pool = require('../config/database');

exports.getRoles = async (req, res) => {
  try {
    const result = await staffService.getStaffRoles();
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, roles: result.roles });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.createRole = async (req, res) => {
  try {
    const { roleName, description, permissions } = req.body;
    const result = await staffService.createRole({ roleName, description, permissions });
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    res.json({ success: true, role: result.role });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.inviteStaff = async (req, res) => {
  try {
    const { storeId, email, roleId } = req.body;
    const invitedBy = req.user.id;

    if (!storeId || !email || !roleId) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Verify store ownership
    const store = await pool.query(
      'SELECT id FROM stores WHERE id = $1 AND owner_id = $2',
      [storeId, req.user.id]
    );

    if (store.rows.length === 0 && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized for this store' });
    }

    const result = await staffService.inviteStaff(storeId, invitedBy, email, roleId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({
      success: true,
      invitation: result.invitation,
      inviteLink: `${req.protocol}://${req.get('host')}/api/staff/accept?token=${result.token}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.acceptInvitation = async (req, res) => {
  try {
    const { token } = req.query;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({ success: false, error: 'Token required' });
    }

    const result = await staffService.acceptInvitation(token, userId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, message: 'Invitation accepted', staff: result.staff });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getStoreStaff = async (req, res) => {
  try {
    const { storeId } = req.params;

    const result = await staffService.getStoreStaff(storeId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, staff: result.staff });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.updateStaffRole = async (req, res) => {
  try {
    const { staffId, roleId } = req.body;

    const result = await staffService.updateStaffRole(staffId, roleId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, staff: result.staff });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.removeStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    const result = await staffService.removeStaff(staffId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, message: 'Staff removed' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getActivityLog = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { staffId, limit } = req.query;

    const result = await staffService.getStaffActivity(storeId, staffId, parseInt(limit) || 50);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, logs: result.logs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.getPendingInvitations = async (req, res) => {
  try {
    const { storeId } = req.params;

    const result = await staffService.getPendingInvitations(storeId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, invitations: result.invitations });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.cancelInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;

    const result = await staffService.cancelInvitation(invitationId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, message: 'Invitation cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

exports.checkMyPermissions = async (req, res) => {
  try {
    const { storeId, permission } = req.query;
    const userId = req.user.id;

    const result = await staffService.getStaffPermissions(userId, storeId);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    if (permission) {
      const permCheck = await staffService.checkPermission(userId, storeId, permission);
      res.json({ success: true, ...permCheck });
    } else {
      res.json({ success: true, ...result });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

console.log('✅ Staff Controller Loaded');
