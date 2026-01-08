const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticate } = require('../middleware/auth');

// All routes here require authentication
router.use(authenticate);

router.post('/', groupController.createGroup);
router.get('/', groupController.getUserGroups);
router.post('/join', groupController.joinGroup);
router.get('/:id', groupController.getGroupDetails);
// router.get('/:id/members', groupController.getGroupMembers); // Already included in details, but good to have separate if needed

module.exports = router;
