const pool = require('../config/database');

// Get Group Balances
exports.getGroupBalances = async (req, res, next) => {
    try {
        const { groupId } = req.params;

        // Verify membership
        const memberCheck = await pool.query(
            'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, req.user.id]
        );
        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // 1. Calculate Expenses Paid (Credit)
        const expensesPaidQuery = `
            SELECT paid_by as user_id, SUM(amount) as total_paid
            FROM expenses
            WHERE group_id = $1
            GROUP BY paid_by
        `;
        
        // 2. Calculate Share Owed (Debit)
        const expensesOwedQuery = `
            SELECT es.user_id, SUM(es.amount_owed) as total_owed
            FROM expense_splits es
            JOIN expenses e ON es.expense_id = e.id
            WHERE e.group_id = $1
            GROUP BY es.user_id
        `;

        // 3. Calculate Settlements Given (Debit for payer, Credit for receiver)
        // Wait, Settlement is: User A pays User B.
        // A's balance increases (or debt decreases). A is "giving" money.
        // B's balance decreases (or credit decreases). B is "receiving" money.
        // Effectively, A has "paid" more into the group pot (via direct transfer), and B has "received" back.
        
        // Let's stick to "Net Balance" = (Total Paid in Expenses + Total Settlements Given) - (Total Share of Expenses + Total Settlements Received)
        
        const settlementsGivenQuery = `
            SELECT from_user_id as user_id, SUM(amount) as total_given
            FROM settlements
            WHERE group_id = $1
            GROUP BY from_user_id
        `;

        const settlementsReceivedQuery = `
            SELECT to_user_id as user_id, SUM(amount) as total_received
            FROM settlements
            WHERE group_id = $1
            GROUP BY to_user_id
        `;

        const [paidResult, owedResult, givenResult, receivedResult, membersResult] = await Promise.all([
            pool.query(expensesPaidQuery, [groupId]),
            pool.query(expensesOwedQuery, [groupId]),
            pool.query(settlementsGivenQuery, [groupId]),
            pool.query(settlementsReceivedQuery, [groupId]),
            pool.query('SELECT u.id, u.name FROM users u JOIN group_members gm ON u.id = gm.user_id WHERE gm.group_id = $1', [groupId])
        ]);

        const balances = {};
        
        // Initialize members
        membersResult.rows.forEach(m => {
            balances[m.id] = { id: m.id, name: m.name, balance: 0.0 };
        });

        // Add Paid (Credit)
        paidResult.rows.forEach(r => {
            if (balances[r.user_id]) balances[r.user_id].balance += parseFloat(r.total_paid);
        });

        // Subtract Owed (Debit)
        owedResult.rows.forEach(r => {
             if (balances[r.user_id]) balances[r.user_id].balance -= parseFloat(r.total_owed);
        });

        // Add Settlements Given (Credit - effectively paying off debt)
        givenResult.rows.forEach(r => {
             if (balances[r.user_id]) balances[r.user_id].balance += parseFloat(r.total_given);
        });

        // Subtract Settlements Received (Debit - effectively getting paid back)
        receivedResult.rows.forEach(r => {
             if (balances[r.user_id]) balances[r.user_id].balance -= parseFloat(r.total_received);
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
        const membersCheck = await pool.query(
            'SELECT user_id FROM group_members WHERE group_id = $1 AND user_id IN ($2, $3)',
            [groupId, fromUserId, toUserId]
        );
        
        if (membersCheck.rows.length !== 2) {
             return res.status(403).json({ error: 'One or both users are not in the group' });
        }

        const result = await pool.query(
            'INSERT INTO settlements (group_id, from_user_id, to_user_id, amount) VALUES ($1, $2, $3, $4) RETURNING *',
            [groupId, fromUserId, toUserId, amount]
        );

        res.status(201).json({ message: 'Settlement recorded', settlement: result.rows[0] });

    } catch (error) {
        next(error);
    }
};

// Get Settlements History
exports.getSettlements = async (req, res, next) => {
    try {
        const { groupId } = req.params;

        const result = await pool.query(
            `SELECT s.*, u1.name as from_name, u2.name as to_name
             FROM settlements s
             JOIN users u1 ON s.from_user_id = u1.id
             JOIN users u2 ON s.to_user_id = u2.id
             WHERE s.group_id = $1
             ORDER BY s.settled_at DESC`,
            [groupId]
        );
        
        res.json(result.rows);
    } catch (error) {
         next(error);
    }
};
