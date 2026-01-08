const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Routes
router.post('/', expenseController.createExpense);
router.get('/group/:groupId', expenseController.getGroupExpenses);
router.get('/:id', expenseController.getExpenseDetails);

module.exports = router;
