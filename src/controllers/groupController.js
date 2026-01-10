const prisma = require('../config/prisma');
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
        const group = await prisma.$transaction(async (tx) => {
            const newGroup = await tx.groups.create({
                data: {
                    name,
                    invitation_code: invitationCode,
                    created_by: userId
                }
            });

            await tx.group_members.create({
                data: {
                    group_id: newGroup.id,
                    user_id: userId
                }
            });

            return newGroup;
        });
            
        res.status(201).json({ message: 'Group created', group });
    } catch (error) {
        if (error.code === 'P2002') { // Unique constraint violation
             return res.status(409).json({ error: 'Failed to generate unique code, please try again' });
        }
        next(error);
    }
};

// Get User's Groups
exports.getUserGroups = async (req, res, next) => {
    try {
        const groups = await prisma.groups.findMany({
            where: {
                group_members: {
                    some: {
                        user_id: req.user.id
                    }
                }
            },
            include: {
                _count: {
                    select: { group_members: true }
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        // Format response to match original structure
        const formattedGroups = groups.map(group => ({
            ...group,
            member_count: group._count.group_members,
            _count: undefined
        }));

        res.json(formattedGroups);
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

        const group = await prisma.groups.findUnique({
            where: { invitation_code: code },
            select: { id: true }
        });

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const groupId = group.id;

        try {
            await prisma.group_members.create({
                data: {
                    group_id: groupId,
                    user_id: userId
                }
            });
            res.json({ message: 'Joined group successfully', groupId });
        } catch (error) {
            if (error.code === 'P2002') { // Unique constraint violation
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
        const isMember = await prisma.group_members.findFirst({
            where: {
                group_id: id,
                user_id: req.user.id
            }
        });

        if (!isMember) {
            return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
        }

        const group = await prisma.groups.findUnique({
            where: { id }
        });

        const members = await prisma.users.findMany({
            where: {
                group_members: {
                    some: {
                        group_id: id
                    }
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                group_members: {
                    where: { group_id: id },
                    select: { joined_at: true }
                }
            }
        });

        // Format members response to match original structure
        const formattedMembers = members.map(member => ({
            id: member.id,
            name: member.name,
            email: member.email,
            joined_at: member.group_members[0]?.joined_at
        }));

        res.json({
            group,
            members: formattedMembers
        });
    } catch (error) {
        next(error);
    }
};

// Update Group Name
exports.updateGroupName = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const userId = req.user.id;

        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Group name is required' });
        }

        // Verify the user is a member of the group
        const isMember = await prisma.group_members.findFirst({
            where: {
                group_id: id,
                user_id: userId
            }
        });

        if (!isMember) {
            return res.status(403).json({ error: 'Access denied: You are not a member of this group' });
        }

        // Update the group name
        const group = await prisma.groups.update({
            where: { id },
            data: {
                name: name.trim()
            }
        });

        res.json({ 
            message: 'Group name updated successfully', 
            group 
        });
    } catch (error) {
        next(error);
    }
};
