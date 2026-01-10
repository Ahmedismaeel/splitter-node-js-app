const prisma = require('../config/prisma');

// Get Group Balances
exports.getGroupBalances = async (req, res, next) => {
    try {
        const { groupId } = req.params;

        // Verify membership
        const isMember = await prisma.group_members.findFirst({
            where: {
                group_id: groupId,
                user_id: req.user.id
            }
        });

        if (!isMember) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get all group members
        const members = await prisma.users.findMany({
            where: {
                group_members: {
                    some: {
                        group_id: groupId
                    }
                }
            },
            select: {
                id: true,
                name: true
            }
        });

        // 1. Calculate Expenses Paid (Credit)
        const expensesPaid = await prisma.expenses.groupBy({
            by: ['paid_by'],
            where: {
                group_id: groupId
            },
            _sum: {
                amount: true
            }
        });

        // 2. Calculate Share Owed (Debit)
        const expensesOwed = await prisma.expense_splits.groupBy({
            by: ['user_id'],
            where: {
                expenses: {
                    group_id: groupId
                }
            },
            _sum: {
                amount_owed: true
            }
        });

        // 3. Calculate Settlements Given
        const settlementsGiven = await prisma.settlements.groupBy({
            by: ['from_user_id'],
            where: {
                group_id: groupId
            },
            _sum: {
                amount: true
            }
        });

        // 4. Calculate Settlements Received
        const settlementsReceived = await prisma.settlements.groupBy({
            by: ['to_user_id'],
            where: {
                group_id: groupId
            },
            _sum: {
                amount: true
            }
        });

        // Calculate balances
        const balances = {};

        // Initialize members
        members.forEach(m => {
            balances[m.id] = { id: m.id, name: m.name, balance: 0.0 };
        });

        // Add Paid (Credit)
        expensesPaid.forEach(r => {
            if (balances[r.paid_by]) {
                balances[r.paid_by].balance += parseFloat(r._sum.amount || 0);
            }
        });

        // Subtract Owed (Debit)
        expensesOwed.forEach(r => {
            if (balances[r.user_id]) {
                balances[r.user_id].balance -= parseFloat(r._sum.amount_owed || 0);
            }
        });

        // Add Settlements Given (Credit)
        settlementsGiven.forEach(r => {
            if (balances[r.from_user_id]) {
                balances[r.from_user_id].balance += parseFloat(r._sum.amount || 0);
            }
        });

        // Subtract Settlements Received (Debit)
        settlementsReceived.forEach(r => {
            if (balances[r.to_user_id]) {
                balances[r.to_user_id].balance -= parseFloat(r._sum.amount || 0);
            }
        });

        // Format for response
        const response = Object.values(balances).map(b => ({
            ...b,
            balance: parseFloat(b.balance.toFixed(2))
        }));

        res.json(response);

    } catch (error) {
        next(error);
    }
};

// Create Settlement
exports.createSettlement = async (req, res, next) => {
    try {
        const { groupId, toUserId, amount } = req.body;
        const fromUserId = req.user.id;

        if (!groupId || !toUserId || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid settlement details' });
        }

        if (fromUserId === toUserId) {
            return res.status(400).json({ error: 'Cannot settle with yourself' });
        }

        // Verify membership for both
        const membersCount = await prisma.group_members.count({
            where: {
                group_id: groupId,
                user_id: {
                    in: [fromUserId, toUserId]
                }
            }
        });
        
        if (membersCount !== 2) {
             return res.status(403).json({ error: 'One or both users are not in the group' });
        }

        const settlement = await prisma.settlements.create({
            data: {
                group_id: groupId,
                from_user_id: fromUserId,
                to_user_id: toUserId,
                amount
            }
        });

        res.status(201).json({ message: 'Settlement recorded', settlement });

    } catch (error) {
        next(error);
    }
};

// Get Settlements History
exports.getSettlements = async (req, res, next) => {
    try {
        const { groupId } = req.params;

        const settlements = await prisma.settlements.findMany({
            where: {
                group_id: groupId
            },
            include: {
                users_settlements_from_user_idTousers: {
                    select: {
                        name: true
                    }
                },
                users_settlements_to_user_idTousers: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                settled_at: 'desc'
            }
        });

        // Format response to match original structure
        const formattedSettlements = settlements.map(s => ({
            ...s,
            from_name: s.users_settlements_from_user_idTousers.name,
            to_name: s.users_settlements_to_user_idTousers.name,
            users_settlements_from_user_idTousers: undefined,
            users_settlements_to_user_idTousers: undefined
        }));
        
        res.json(formattedSettlements);
    } catch (error) {
         next(error);
    }
};
