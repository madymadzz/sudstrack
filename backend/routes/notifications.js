const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const { getMyNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationsController');

router.use(protect);
router.use(requireRole('Staff', 'SuperAdmin'));

router.get('/', getMyNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

module.exports = router;
