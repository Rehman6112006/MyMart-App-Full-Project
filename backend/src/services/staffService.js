// ==================== STAFF MANAGEMENT SERVICE ====================

const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

exports.getStaffRoles = async () => {
  try {
    const result = await pool.query(
      'SELECT * FROM staff_roles WHERE is_active = true ORDER BY role_name'
    );
    return { success: true, roles: result.rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.getRoleByName = async (roleName) => {
  try {
    const result = await pool.query(
      'SELECT * FROM staff_roles WHERE role_name = $1 AND is_active = true',
      [roleName]
    );
    return { success: true, role: result.rows[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.createRole = async (roleData) => {
  try {
    const result = await pool.query(
      `INSERT INTO staff_roles (role_name, description, permissions)
       VALUES ($1, $2, $3) RETURNING *`,
      [roleData.roleName, roleData.description, JSON.stringify(roleData.permissions || [])]
    );
    return { success: true, role: result.rows[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.inviteStaff = async (storeId, invitedBy, email, roleId) => {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO invitations (store_id, email, role_id, token, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [storeId, email, roleId, token, invitedBy, expiresAt]
    );

    return { success: true, invitation: result.rows[0], token };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.acceptInvitation = async (token, userId) => {
  try {
    const invitation = await pool.query(
      `SELECT * FROM invitations WHERE token = $1 AND status = 'pending' AND expires_at > NOW()`,
      [token]
    );

    if (invitation.rows.length === 0) {
      return { success: false, error: 'Invalid or expired invitation' };
    }

    const inv = invitation.rows[0];

    const staff = await pool.query(
      `INSERT INTO store_staff (store_id, user_id, role_id, invited_by, accepted_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (store_id, user_id) DO UPDATE SET role_id = $3, accepted_at = NOW()
       RETURNING *`,
      [inv.store_id, userId, inv.role_id, inv.invited_by]
    );

    await pool.query(
      `UPDATE invitations SET status = 'accepted', accepted_at = NOW() WHERE id = $1`,
      [inv.id]
    );

    return { success: true, staff: staff.rows[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.getStoreStaff = async (storeId) => {
  try {
    const result = await pool.query(
      `SELECT ss.*, u.first_name, u.last_name, u.email,
              sr.role_name, sr.description as role_description, sr.permissions
       FROM store_staff ss
       JOIN users u ON ss.user_id = u.id
       JOIN staff_roles sr ON ss.role_id = sr.id
       WHERE ss.store_id = $1 AND ss.status = 'active'
       ORDER BY ss.created_at`,
      [storeId]
    );
    return { success: true, staff: result.rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.getStaffPermissions = async (userId, storeId) => {
  try {
    const result = await pool.query(
      `SELECT sr.permissions
       FROM store_staff ss
       JOIN staff_roles sr ON ss.role_id = sr.id
       WHERE ss.user_id = $1 AND ss.store_id = $2 AND ss.status = 'active'`,
      [userId, storeId]
    );

    if (result.rows.length === 0) {
      return { success: false, error: 'No staff record found' };
    }

    const permissions = result.rows[0].permissions;
    const hasFullAccess = permissions.includes('*');

    return {
      success: true,
      permissions,
      hasFullAccess,
      isStaff: true
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.checkPermission = async (userId, storeId, permission) => {
  try {
    const result = await this.getStaffPermissions(userId, storeId);

    if (!result.success) return result;

    if (result.hasFullAccess) {
      return { success: true, allowed: true };
    }

    const hasPermission = result.permissions.some(p => {
      if (p === permission) return true;
      const [entity, action] = permission.split(':');
      return p === `${entity}:*` || p === `${entity}:${action}`;
    });

    return { success: true, allowed: hasPermission };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.updateStaffRole = async (staffId, roleId) => {
  try {
    const result = await pool.query(
      `UPDATE store_staff SET role_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [roleId, staffId]
    );
    return { success: true, staff: result.rows[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.removeStaff = async (staffId) => {
  try {
    await pool.query(
      `UPDATE store_staff SET status = 'removed', updated_at = NOW() WHERE id = $1`,
      [staffId]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.logActivity = async (storeId, staffId, action, entityType, entityId, details, ipAddress) => {
  try {
    await pool.query(
      `INSERT INTO staff_activity_logs (store_id, staff_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [storeId, staffId, action, entityType, entityId, JSON.stringify(details || {}), ipAddress]
    );
    return { success: true };
  } catch (error) {
    console.error('Activity log error:', error);
    return { success: false, error: error.message };
  }
};

exports.getStaffActivity = async (storeId, staffId = null, limit = 50) => {
  try {
    let query = `
      SELECT sal.*, u.first_name, u.last_name
      FROM staff_activity_logs sal
      JOIN users u ON sal.staff_id = u.id
      WHERE sal.store_id = $1
    `;
    const params = [storeId];

    if (staffId) {
      query += ' AND sal.staff_id = $2';
      params.push(staffId);
    }

    query += ' ORDER BY sal.created_at DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await pool.query(query, params);
    return { success: true, logs: result.rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.getPendingInvitations = async (storeId) => {
  try {
    const result = await pool.query(
      `SELECT i.*, sr.role_name
       FROM invitations i
       JOIN staff_roles sr ON i.role_id = sr.id
       WHERE i.store_id = $1 AND i.status = 'pending' AND i.expires_at > NOW()
       ORDER BY i.created_at DESC`,
      [storeId]
    );
    return { success: true, invitations: result.rows };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

exports.cancelInvitation = async (invitationId) => {
  try {
    await pool.query(
      `UPDATE invitations SET status = 'cancelled' WHERE id = $1`,
      [invitationId]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

console.log('✅ Staff Service Loaded');
