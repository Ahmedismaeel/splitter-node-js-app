const express = require('express');
const router = express.Router();
const balanceController = require('../controllers/balanceController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/group/:groupId', balanceController.getGroupBalances);
router.post('/settlements', balanceController.createSettlement);
router.get('/settlements/group/:groupId', balanceController.getSettlements);

module.exports = router;
