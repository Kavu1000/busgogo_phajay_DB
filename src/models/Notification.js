const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        message: {
            type: String,
            required: [true, 'Message is required'],
            trim: true,
        },
        details: {
            type: String,
            default: '',
        },
        type: {
            type: String,
            enum: ['info', 'warning', 'success', 'error'],
            default: 'info',
        },
        category: {
            type: String,
            enum: ['schedule', 'maintenance', 'system', 'passenger'],
            default: 'system',
        },
        // Who should see this notification
        targetRole: {
            type: String,
            enum: ['all', 'admin', 'staff'],
            default: 'all',
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        // Optional: which user created this notification
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient querying
notificationSchema.index({ isRead: 1, createdAt: -1 });
notificationSchema.index({ category: 1 });
notificationSchema.index({ targetRole: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
