const pool = require('../config/database');

// Create Expense
exports.createExpense = async (req, res, next) => {
    try {
        const { groupId, title, amount, splitType, splits } = req.body;
        const paidBy = req.user.id;

        // Validation
        if (!groupId || !title || !amount || !splitType || !splits) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify membership
        const memberCheck = await pool.query(
            'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
            [groupId, paidBy]
        );
        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        // Validate splits sum matches total amount
        const totalSplitAmount = splits.reduce((sum, s) => sum + s.amount, 0);
        if (Math.abs(totalSplitAmount - amount) > 0.01) { // Floating point tolerance
             return res.status(400).json({ error: 'Split amounts do not equal total amount' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Create Expense
            const expenseResult = await client.query(
                'INSERT INTO expenses (group_id, title, amount, paid_by, split_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [groupId, title, amount, paidBy, splitType]
            );
            const expense = expenseResult.rows[0];

            // 2. Create Splits
            for (const split of splits) {
                await client.query(
                    'INSERT INTO expense_splits (expense_id, user_id, amount_owed) VALUES ($1, $2, $3)',
                    [expense.id, split.userId, split.amount]
                );
            }

            await client.query('COMMIT');
            res.status(201).json({ message: 'Expense added successfully', expense });

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (error) {
        next(error);
    }
};

// Get Group Expenses
exports.getGroupExpenses = async (req, res, next) => {
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

        const result = await pool.query(
            `SELECT e.*, u.name as paid_by_name 
             FROM expenses e 
             JOIN users u ON e.paid_by = u.id 
             WHERE e.group_id = $1 
             ORDER BY e.date DESC, e.created_at DESC`,
            [groupId]
        );

        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

// Get Expense Details (with splits)
exports.getExpenseDetails = async (req, res, next) => {
    try {
        const { id } = req.params;

        const expenseResult = await pool.query(
            'SELECT e.*, u.name as paid_by_name FROM expenses e JOIN users u ON e.paid_by = u.id WHERE e.id = $1',
             [id]
        );

        if (expenseResult.rows.length === 0) {
             return res.status(404).json({ error: 'Expense not found' });
        }
        
        const expense = expenseResult.rows[0];

        // Check group access for this expense
        const memberCheck = await pool.query(
            'SELECT 1 FROM group_members WHERE group_id = $1 AND user_id = $2',
            [expense.group_id, req.user.id]
        );
        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const splitsResult = await pool.query(
            `SELECT es.*, u.name as user_name 
             FROM expense_splits es 
             JOIN users u ON es.user_id = u.id 
             WHERE es.expense_id = $1`,
            [id]
        );

        res.json({
            ...expense,
            splits: splitsResult.rows
        });

    } catch (error) {
        next(error);
    }
};
