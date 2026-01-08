const pool = require('../config/database');
const { generateInvitationCode } = require('../utils/generateCode');

// Create Group
exports.createGroup = async (req, res, next) => {
    try {
        const { name } = req.body;
        const userId = req.user.id;

        if (!name) {
            return res.status(400).json({ error: 'Group name is required' });
        }

        // Generate unique code (simple retry logic could be improved, but sufficient for now)
        let invitationCode = generateInvitationCode();
        
        // Transaction to create group and add creator as member
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const groupResult = await client.query(
                'INSERT INTO groups (name, invitation_code, created_by) VALUES ($1, $2, $3) RETURNING *',
                [name, invitationCode, userId]
            );
            const group = groupResult.rows[0];

            await client.query(
                'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
                [group.id, userId]
            );

            await client.query('COMMIT');
            
            res.status(201).json({ message: 'Group created', group });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        if (error.code === '23505') { // Code collision, rare but possible
             return res.status(409).json({ error: 'Failed to generate unique code, please try again' });
        }
        next(error);
    }
};

// Get User's Groups
exports.getUserGroups = async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT g.*, 
            (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
            FROM groups g
            JOIN group_members gm ON g.id = gm.group_id
            WHERE gm.user_id = $1
            ORDER BY g.created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

// Join Group
exports.joinGroup = async (req, res, next) => {
    try {
        const { code } = req.body;
        const userId = req.user.id;

        if (!code) {
             return res.status(400).json({ error: 'Invitation code is required' });
        }

        const groupResult = await pool.query(
            'SELECT id FROM groups WHERE invitation_code = $1',
            [code]
        );

        if (groupResult.rows.length === 0) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const groupId = groupResult.rows[0].id;

        try {
            await pool.query(
                'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
                [groupId, userId]
            );
            res.json({ message: 'Joined group successfully', groupId });
        } catch (error) {
            if (error.code === '23505') { // Unique violation
                return res.status(400).json({ error: 'You are already a member of this group' });
            }
            throw error;
        }
    } catch (error) {
        next(error);
    }
};

// Get Group Details
exports.getGroupDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Verify membership
        const membershipCheck = await pool.query(
            'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (membershipCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
        }

        const groupResult = await pool.query('SELECT * FROM groups WHERE id = $1', [id]);
        const membersResult = await pool.query(
            `SELECT u.id, u.name, u.email, gm.joined_at 
             FROM users u 
             JOIN group_members gm ON u.id = gm.user_id 
             WHERE gm.group_id = $1`,
            [id]
        );

        res.json({
            group: groupResult.rows[0],
            members: membersResult.rows
        });
    } catch (error) {
        next(error);
    }
};
