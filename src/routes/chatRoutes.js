const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/auth');
const ChatMessage = require('../models/ChatMessage');
const Schedule = require('../models/Schedule');

/**
 * GET /api/chat/:tripId
 * Fetch message history for a trip.
 * Admin: always allowed. Driver: only if assigned to that trip.
 */
router.get('/:tripId', protect, async (req, res, next) => {
    try {
        const { tripId } = req.params;
        const user = req.user;

        if (user.role !== 'admin') {
            const schedule = await Schedule.findById(tripId);
            if (!schedule) return res.status(404).json({ success: false, message: 'Trip not found.' });

            const isAssignedDriver =
                user.role === 'driver' &&
                schedule.driverId &&
                schedule.driverId.toString() === user._id.toString();

            if (!isAssignedDriver) {
                return res.status(403).json({ success: false, message: 'Not authorized.' });
            }
        }

        const messages = await ChatMessage.find({ tripId })
            .sort({ createdAt: 1 })
            .lean();

        res.json({ success: true, data: messages });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
