const QRCode = require('../models/QRCode');
const Booking = require('../models/Booking');
const { generateQRData, generateQRImage, verifyQRData } = require('../utils/qrGenerator');

// @desc    Generate QR code for ticket
// @route   POST /api/qr/generate/:ticketId
// @access  Private
const generateQR = async (req, res, next) => {
    try {
        const { ticketId } = req.params;

        // Verify ticket exists and belongs to user
        const ticket = await Booking.findById(ticketId);

        if (!ticket) {
            res.status(404);
            throw new Error('Ticket not found');
        }

        // Check if user owns the ticket or is admin
        if (ticket.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            res.status(403);
            throw new Error('Not authorized to generate QR for this ticket');
        }

        // Check if ticket is valid for QR generation
        if (ticket.status === 'cancelled' || ticket.status === 'expired') {
            res.status(400);
            throw new Error('Cannot generate QR code for cancelled or expired ticket');
        }

        // Check if QR already exists
        let qrCode = await QRCode.findOne({ ticketId });

        if (qrCode) {
            // Return existing QR if still valid
            if (qrCode.isValid && !qrCode.isExpired()) {
                return res.status(200).json({
                    success: true,
                    data: qrCode,
                    message: 'QR code already exists',
                });
            }
        }

        // Generate QR data
        const qrData = generateQRData(ticketId, ticket.userId, ticket.busId);

        // Generate QR image
        const qrImage = await generateQRImage(qrData);

        // Calculate expiry (24 hours from now or ticket departure time, whichever is earlier)
        const expiryHours = parseInt(process.env.QR_CODE_EXPIRY_HOURS) || 24;
        const defaultExpiry = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
        const ticketExpiry = new Date(ticket.departureTime);
        const expiresAt = ticketExpiry < defaultExpiry ? ticketExpiry : defaultExpiry;

        // Create or update QR code
        if (qrCode) {
            qrCode.qrData = qrData;
            qrCode.qrImage = qrImage;
            qrCode.isValid = true;
            qrCode.expiresAt = expiresAt;
            qrCode.status = 'active';
            await qrCode.save();
        } else {
            qrCode = await QRCode.create({
                ticketId,
                qrData,
                qrImage,
                expiresAt,
            });
        }

        res.status(201).json({
            success: true,
            data: qrCode,
            message: 'QR code generated successfully',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Verify QR code
// @route   POST /api/qr/verify
// @access  Private
const verifyQR = async (req, res, next) => {
    try {
        const { qrData } = req.body;

        if (!qrData) {
            res.status(400);
            throw new Error('QR data is required');
        }

        // Verify QR data format
        const verification = verifyQRData(qrData);

        if (!verification.valid) {
            return res.status(400).json({
                success: false,
                message: verification.message,
            });
        }

        // Find QR code in database
        const qrCode = await QRCode.findOne({ qrData })
            .populate({
                path: 'ticketId',
                populate: {
                    path: 'busId userId',
                    select: 'busNumber type route username email',
                },
            });

        if (!qrCode) {
            return res.status(404).json({
                success: false,
                message: 'QR code not found',
            });
        }

        // Check if QR is valid
        if (!qrCode.isValid) {
            return res.status(400).json({
                success: false,
                message: 'QR code has been invalidated',
            });
        }

        // Check if QR is expired
        if (qrCode.isExpired()) {
            qrCode.status = 'expired';
            qrCode.isValid = false;
            await qrCode.save();

            return res.status(400).json({
                success: false,
                message: 'QR code has expired',
            });
        }

        // Update verification count and scanned info
        qrCode.verificationCount += 1;
        qrCode.scannedAt = new Date();
        qrCode.scannedBy = req.user._id;
        await qrCode.save();

        // Auto-checkin passenger if valid QR
        if (qrCode.ticketId && qrCode.ticketId.status !== 'checked-in') {
            await Booking.findByIdAndUpdate(qrCode.ticketId._id, { status: 'checked-in' });
            qrCode.ticketId.status = 'checked-in';
        }

        res.status(200).json({
            success: true,
            data: {
                qrCode,
                ticket: qrCode.ticketId,
            },
            message: 'QR code verified successfully',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get QR code by ticket ID
// @route   GET /api/qr/ticket/:ticketId
// @access  Private
const getQRByTicket = async (req, res, next) => {
    try {
        const { ticketId } = req.params;

        const qrCode = await QRCode.findOne({ ticketId })
            .populate('ticketId', 'seatNumber departureStation arrivalStation departureTime status');

        if (!qrCode) {
            res.status(404);
            throw new Error('QR code not found for this ticket');
        }

        // Verify ticket belongs to user or user is admin
        const ticket = await Booking.findById(ticketId);
        if (ticket.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            res.status(403);
            throw new Error('Not authorized to access this QR code');
        }

        res.status(200).json({
            success: true,
            data: qrCode,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Invalidate QR code
// @route   PUT /api/qr/:id/invalidate
// @access  Private/Admin
const invalidateQR = async (req, res, next) => {
    try {
        const qrCode = await QRCode.findById(req.params.id);

        if (!qrCode) {
            res.status(404);
            throw new Error('QR code not found');
        }

        qrCode.isValid = false;
        qrCode.status = 'invalid';
        await qrCode.save();

        res.status(200).json({
            success: true,
            data: qrCode,
            message: 'QR code invalidated successfully',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all QR codes (Admin only)
// @route   GET /api/qr
// @access  Private/Admin
const getAllQRCodes = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const filter = {};

        if (req.query.status) {
            filter.status = req.query.status;
        }

        if (req.query.isValid !== undefined) {
            filter.isValid = req.query.isValid === 'true';
        }

        const qrCodes = await QRCode.find(filter)
            .populate({
                path: 'ticketId',
                populate: {
                    path: 'userId busId',
                    select: 'username email busNumber type',
                },
            })
            .limit(limit)
            .skip(skip)
            .sort({ createdAt: -1 });

        const total = await QRCode.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: qrCodes,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    generateQR,
    verifyQR,
    getQRByTicket,
    invalidateQR,
    getAllQRCodes,
};
