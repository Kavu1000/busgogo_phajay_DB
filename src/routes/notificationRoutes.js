const express = require('express');
const router = express.Router();
const {
    getNotifications,
    getUnreadCount,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
} = require('../controllers/notificationController');
const { protect, admin } = require('../middleware/auth');

// ── All routes require authentication ────────────────────────────────────────

// GET /api/notifications              – list (with ?category=&unread=true)
router.get('/', protect, getNotifications);

// GET /api/notifications/unread-count – badge count
router.get('/unread-count', protect, getUnreadCount);

// PATCH /api/notifications/read-all   – mark everything as read
router.patch('/read-all', protect, markAllAsRead);

// PATCH /api/notifications/:id/read   – mark one as read
router.patch('/:id/read', protect, markAsRead);

// POST /api/notifications             – create (admin only)
router.post('/', protect, admin, createNotification);

// DELETE /api/notifications/:id       – delete (admin only)
router.delete('/:id', protect, admin, deleteNotification);

module.exports = router;
