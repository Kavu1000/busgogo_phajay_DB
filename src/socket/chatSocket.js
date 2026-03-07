const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const ChatMessage = require('../models/ChatMessage');
const Notification = require('../models/Notification');

/**
 * Attach Socket.io to the HTTP server.
 * @param {import('http').Server} httpServer
 */
function attachChatSocket(httpServer) {
    const { Server } = require('socket.io');

    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });

    // ─── JWT Auth Middleware ────────────────────────────────────────────
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) return next(new Error('AUTH_MISSING_TOKEN'));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');
            if (!user || !user.isActive) return next(new Error('AUTH_INVALID_USER'));

            socket.user = user; // attach to socket for later use
            next();
        } catch (err) {
            next(new Error('AUTH_FAILED'));
        }
    });

    // ─── Connection Handler ─────────────────────────────────────────────
    io.on('connection', (socket) => {
        console.log(`[Chat] Connected: ${socket.user.username} (${socket.user.role})`);

        // All admins auto-join a global room so they receive driver messages
        // even without having opened a specific trip chat.
        if (socket.user.role === 'admin') {
            socket.join('admins');
        }

        // ── Join Trip Room ──────────────────────────────────────────────
        socket.on('join_trip', async ({ tripId }) => {
            try {
                const schedule = await Schedule.findById(tripId);
                if (!schedule) {
                    return socket.emit('error', { message: 'Trip not found.' });
                }

                const user = socket.user;
                const isAdmin = user.role === 'admin';
                const isAssignedDriver =
                    user.role === 'driver' &&
                    schedule.driverId &&
                    schedule.driverId.toString() === user._id.toString();

                if (!isAdmin && !isAssignedDriver) {
                    return socket.emit('error', {
                        message: 'Not authorized to join this trip chat.',
                    });
                }

                const room = `trip:${tripId}`;
                socket.join(room);
                socket.currentRoom = room;
                socket.currentTripId = tripId;

                // Load message history
                const history = await ChatMessage.find({ tripId })
                    .sort({ createdAt: 1 })
                    .lean();

                socket.emit('chat_history', history);
                console.log(`[Chat] ${user.username} joined room ${room}`);
            } catch (err) {
                console.error('[Chat] join_trip error:', err);
                socket.emit('error', { message: 'Failed to join trip.' });
            }
        });

        // ── Send Message ────────────────────────────────────────────────
        socket.on('send_message', async ({ message }) => {
            try {
                if (!socket.currentRoom || !socket.currentTripId) {
                    return socket.emit('error', { message: 'Join a trip room first.' });
                }
                if (!message || !message.trim()) return;

                const user = socket.user;
                if (user.role !== 'admin' && user.role !== 'driver') {
                    return socket.emit('error', { message: 'Not authorized to send messages.' });
                }

                const chatMsg = await ChatMessage.create({
                    tripId: socket.currentTripId,
                    senderId: user._id,
                    senderName: user.username,
                    senderRole: user.role,
                    message: message.trim(),
                });

                // ── Broadcast to trip room (everyone in this chat) ──────
                io.to(socket.currentRoom).emit('new_message', chatMsg);

                // ── If driver message: push to all admins in real-time ──
                if (user.role === 'driver') {
                    // Determine notification severity from message emojis
                    let category = 'system';
                    let type = 'info';
                    const lowerMsg = message.toLowerCase();
                    if (lowerMsg.includes('🚨')) { category = 'system'; type = 'error'; }
                    else if (lowerMsg.includes('⚠️')) { category = 'schedule'; type = 'warning'; }
                    else if (lowerMsg.includes('🔧')) { category = 'maintenance'; type = 'warning'; }

                    // Persist notification to DB
                    const notification = await Notification.create({
                        title: `ຂໍ້ຄວາມຈາກໂຊເຟີ: ${user.username}`,
                        message: chatMsg.message.length > 80
                            ? chatMsg.message.substring(0, 80) + '...'
                            : chatMsg.message,
                        details: `Trip ID: ${socket.currentTripId}`,
                        type,
                        category,
                        targetRole: 'admin',
                        createdBy: user._id,
                    });

                    // Push real-time event to all connected admins so their
                    // badge / notification bell updates without a page refresh.
                    io.to('admins').emit('new_notification', {
                        notification: notification.toObject(),
                    });

                    // Also push the chat message itself to admins who haven't
                    // opened this specific trip chat yet.
                    io.to('admins').emit('driver_message', {
                        tripId: socket.currentTripId,
                        message: chatMsg,
                    });
                }
            } catch (err) {
                console.error('[Chat] send_message error:', err);
                socket.emit('error', { message: 'Failed to send message.' });
            }
        });

        // ── Leave Room ──────────────────────────────────────────────────
        socket.on('leave_trip', () => {
            if (socket.currentRoom) {
                socket.leave(socket.currentRoom);
                console.log(`[Chat] ${socket.user.username} left room ${socket.currentRoom}`);
                socket.currentRoom = null;
                socket.currentTripId = null;
            }
        });

        socket.on('disconnect', () => {
            console.log(`[Chat] Disconnected: ${socket.user.username}`);
        });
    });

    return io;
}

module.exports = { attachChatSocket };
