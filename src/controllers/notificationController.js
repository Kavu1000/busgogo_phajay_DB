const Notification = require('../models/Notification');

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all notifications (supports filtering by category / unread)
// @route   GET /api/notifications
// @access  Protected (admin / staff)
// ─────────────────────────────────────────────────────────────────────────────
const getNotifications = async (req, res, next) => {
    try {
        const { category, unread, limit = 50, page = 1 } = req.query;

        const filter = {
            // Show notifications targeted at 'all' or the user's specific role
            $or: [{ targetRole: 'all' }, { targetRole: req.user.role }],
        };

        if (category && category !== 'all') {
            filter.category = category;
        }

        if (unread === 'true') {
            filter.isRead = false;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [notifications, total] = await Promise.all([
            Notification.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit))
                .populate('createdBy', 'name email'),
            Notification.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            total,
            page: Number(page),
            data: notifications,
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Protected
// ─────────────────────────────────────────────────────────────────────────────
const getUnreadCount = async (req, res, next) => {
    try {
        const count = await Notification.countDocuments({
            isRead: false,
            $or: [{ targetRole: 'all' }, { targetRole: req.user.role }],
        });

        res.status(200).json({ success: true, count });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Create a new notification
// @route   POST /api/notifications
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
const createNotification = async (req, res, next) => {
    try {
        const { title, message, details, type, category, targetRole } = req.body;

        if (!title || !message) {
            res.status(400);
            throw new Error('Title and message are required');
        }

        const notification = await Notification.create({
            title,
            message,
            details: details || '',
            type: type || 'info',
            category: category || 'system',
            targetRole: targetRole || 'all',
            createdBy: req.user._id,
        });

        res.status(201).json({ success: true, data: notification });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Mark a single notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Protected
// ─────────────────────────────────────────────────────────────────────────────
const markAsRead = async (req, res, next) => {
    try {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            res.status(404);
            throw new Error('Notification not found');
        }

        res.status(200).json({ success: true, data: notification });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Mark ALL notifications as read for the current user's role
// @route   PATCH /api/notifications/read-all
// @access  Protected
// ─────────────────────────────────────────────────────────────────────────────
const markAllAsRead = async (req, res, next) => {
    try {
        const result = await Notification.updateMany(
            {
                isRead: false,
                $or: [{ targetRole: 'all' }, { targetRole: req.user.role }],
            },
            { isRead: true }
        );

        res.status(200).json({
            success: true,
            message: 'All notifications marked as read',
            updatedCount: result.modifiedCount,
        });
    } catch (error) {
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Admin only
// ─────────────────────────────────────────────────────────────────────────────
const deleteNotification = async (req, res, next) => {
    try {
        const notification = await Notification.findByIdAndDelete(req.params.id);

        if (!notification) {
            res.status(404);
            throw new Error('Notification not found');
        }

        res.status(200).json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
};
