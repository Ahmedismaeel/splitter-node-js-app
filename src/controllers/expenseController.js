const prisma = require('../config/prisma');

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
        const isMember = await prisma.group_members.findFirst({
            where: {
                group_id: groupId,
                user_id: paidBy
            }
        });

        if (!isMember) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        // Validate splits sum matches total amount
        const totalSplitAmount = splits.reduce((sum, s) => sum + s.amount, 0);
        if (Math.abs(totalSplitAmount - amount) > 0.01) { // Floating point tolerance
             return res.status(400).json({ error: 'Split amounts do not equal total amount' });
        }

        // Transaction with Prisma
        const expense = await prisma.$transaction(async (tx) => {
            // 1. Create Expense
            const newExpense = await tx.expenses.create({
                data: {
                    group_id: groupId,
                    title,
                    amount,
                    paid_by: paidBy,
                    split_type: splitType
                }
            });

            // 2. Create Splits
            await tx.expense_splits.createMany({
                data: splits.map(split => ({
                    expense_id: newExpense.id,
                    user_id: split.userId,
                    amount_owed: split.amount
                }))
            });

            return newExpense;
        });

        res.status(201).json({ message: 'Expense added successfully', expense });

    } catch (error) {
        next(error);
    }
};

// Get Group Expenses
exports.getGroupExpenses = async (req, res, next) => {
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

        const expenses = await prisma.expenses.findMany({
            where: { group_id: groupId },
            include: {
                users: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: [
                { date: 'desc' },
                { created_at: 'desc' }
            ]
        });

        // Format response to match original structure
        const formattedExpenses = expenses.map(expense => ({
            ...expense,
            paid_by_name: expense.users.name,
            users: undefined
        }));

        res.json(formattedExpenses);
    } catch (error) {
        next(error);
    }
};

// Get Expense Details (with splits)
exports.getExpenseDetails = async (req, res, next) => {
    try {
        const { id } = req.params;

        const expense = await prisma.expenses.findUnique({
            where: { id },
            include: {
                users: {
                    select: {
                        name: true
                    }
                },
                expense_splits: {
                    include: {
                        users: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
        });

        if (!expense) {
             return res.status(404).json({ error: 'Expense not found' });
        }

        // Check group access for this expense
        const isMember = await prisma.group_members.findFirst({
            where: {
                group_id: expense.group_id,
                user_id: req.user.id
            }
        });

        if (!isMember) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Format splits to match original structure
        const formattedSplits = expense.expense_splits.map(split => ({
            ...split,
            user_name: split.users.name,
            users: undefined
        }));

        res.json({
            ...expense,
            paid_by_name: expense.users.name,
            splits: formattedSplits,
            users: undefined,
            expense_splits: undefined
        });

    } catch (error) {
        next(error);
    }
};

// Update Expense
exports.updateExpense = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, amount, splitType, splits } = req.body;
        const userId = req.user.id;

        // Validation
        if (!title || !amount || !splitType || !splits) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get the expense to check permissions
        const expense = await prisma.expenses.findUnique({
            where: { id }
        });

        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        // Verify membership in the group
        const isMember = await prisma.group_members.findFirst({
            where: {
                group_id: expense.group_id,
                user_id: userId
            }
        });

        if (!isMember) {
            return res.status(403).json({ error: 'You are not a member of this group' });
        }

        // Validate splits sum matches total amount
        const totalSplitAmount = splits.reduce((sum, s) => sum + s.amount, 0);
        if (Math.abs(totalSplitAmount - amount) > 0.01) { // Floating point tolerance
            return res.status(400).json({ error: 'Split amounts do not equal total amount' });
        }

        // Transaction with Prisma
        const updatedExpense = await prisma.$transaction(async (tx) => {
            // 1. Update Expense
            const updated = await tx.expenses.update({
                where: { id },
                data: {
                    title,
                    amount,
                    split_type: splitType
                }
            });

            // 2. Delete old splits
            await tx.expense_splits.deleteMany({
                where: { expense_id: id }
            });

            // 3. Create new splits
            await tx.expense_splits.createMany({
                data: splits.map(split => ({
                    expense_id: id,
                    user_id: split.userId,
                    amount_owed: split.amount
                }))
            });

            return updated;
        });

        res.json({ 
            message: 'Expense updated successfully', 
            expense: updatedExpense 
        });

    } catch (error) {
        next(error);
    }
};
