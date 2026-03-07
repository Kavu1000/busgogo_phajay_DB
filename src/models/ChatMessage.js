const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
    {
        tripId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Schedule',
            required: true,
            index: true,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        senderName: {
            type: String,
            required: true,
        },
        senderRole: {
            type: String,
            enum: ['admin', 'driver'],
            required: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
            maxlength: [1000, 'Message cannot exceed 1000 characters'],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
