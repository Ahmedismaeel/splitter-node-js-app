const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Routes
router.post('/', expenseController.createExpense);
router.get('/group/:groupId', expenseController.getGroupExpenses);
router.get('/:id', expenseController.getExpenseDetails);
router.put('/:id', expenseController.updateExpense);

module.exports = router;
