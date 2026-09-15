const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const { getStaffMessages, sendStaffMessage, getChatMembers, editStaffMessage, deleteStaffMessage, wipeStaffChat } = require('../controllers/staffChatController');

// Both Staff and SuperAdmin can access
router.use(protect);
router.use(requireRole('Staff', 'SuperAdmin'));

router.get('/',    getStaffMessages);
router.get('/members', getChatMembers);
router.post('/',   sendStaffMessage);


router.put('/:messageId', editStaffMessage);
router.delete('/wipe/all', wipeStaffChat);
router.delete('/:messageId', deleteStaffMessage);

module.exports = router;

