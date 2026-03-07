const Booking = require('../models/Booking');
const { generatePaymentLink } = require('../services/paymentService');

// @desc    Create payment link for booking
// @route   POST /api/payment/create-link
// @access  Private
const createPaymentLink = async (req, res, next) => {
    try {
        const { bookingIds, amount, description } = req.body;

        if (!bookingIds || !amount) {
            res.status(400);
            throw new Error('Booking IDs and amount are required');
        }

        // Generate unique order number
        const orderNo = `BOOKING_${Date.now()}`;

        // Success callback URL – where user lands after completing payment on Phajay
        // Force the use of FRONTEND_URL or localhost instead of relying on potentially incorrect origin headers
        const clientUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        // Next.js uses file-system routing (no hash), so path is /booking-success
        const successCallbackUrl = `${clientUrl}/booking-success?bookingId=${bookingIds[0]}&status=paid`;
        console.log('Generated Phajay callback URL:', successCallbackUrl);

        // Generate payment link
        const paymentData = await generatePaymentLink(
            orderNo,
            amount,
            description || 'Bus ticket booking',
            'BusGoGo',
            req.user._id.toString(),
            successCallbackUrl
        );

        // Store order number with booking IDs for webhook processing
        // You might want to create a Payment model to track this
        // For now, we'll add it to booking metadata
        await Promise.all(
            bookingIds.map(id =>
                Booking.findByIdAndUpdate(id, {
                    paymentOrderNo: orderNo,
                    paymentStatus: 'pending'
                })
            )
        );

        if (!paymentData.redirectURL) {
            res.status(502);
            throw new Error('Phajay gateway did not return a payment URL');
        }

        res.status(200).json({
            success: true,
            data: {
                orderNo,
                redirectURL: paymentData.redirectURL
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Handle payment webhook callback
// @route   POST /api/payment/webhook
// @access  Public (called by LAPNet)
const handleWebhook = async (req, res, next) => {
    try {
        const webhookData = req.body;

        console.log('Payment webhook received:', webhookData);

        // Extract order number from webhook data
        // Note: Actual webhook structure may vary - adjust based on LAPNet documentation
        const { orderNo, status, amount } = webhookData;

        if (status === 'SUCCESS' || status === 'COMPLETED') {
            // Update all bookings with this order number
            await Booking.updateMany(
                { paymentOrderNo: orderNo },
                {
                    paymentStatus: 'completed',
                    status: 'booked'
                }
            );

            console.log(`Payment completed for order: ${orderNo}`);
        } else if (status === 'FAILED' || status === 'CANCELLED') {
            await Booking.updateMany(
                { paymentOrderNo: orderNo },
                {
                    paymentStatus: 'failed',
                    status: 'cancelled'
                }
            );

            console.log(`Payment failed for order: ${orderNo}`);
        }

        // Always respond with 200 to acknowledge receipt
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        // Still return 200 to prevent retries
        res.status(200).json({ success: false, error: error.message });
    }
};

// @desc    Confirm payment success (called by frontend success page)
// @route   POST /api/payment/confirm-success
// @access  Private
const confirmPaymentSuccess = async (req, res, next) => {
    try {
        const { orderNo } = req.body;

        if (!orderNo) {
            res.status(400);
            throw new Error('Order number is required');
        }

        console.log(`Confirming payment success for order: ${orderNo}`);

        // Update all bookings with this order number
        const result = await Booking.updateMany(
            { paymentOrderNo: orderNo },
            {
                paymentStatus: 'completed',
                status: 'booked'
            }
        );

        if (result.matchedCount === 0) {
            res.status(404);
            throw new Error('No bookings found for this order');
        }

        res.status(200).json({
            success: true,
            message: 'Payment confirmed and bookings updated',
            updatedCount: result.modifiedCount
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createPaymentLink,
    handleWebhook,
    confirmPaymentSuccess
};
