const express = require('express');
const router = express.Router();
const {
    createBooking,
    getUserBookings,
    getBookingById,
    updateBooking,
    cancelBooking,
    getAllBookings,
    getBookingsByOrderNo,
    getOccupiedSeats,
} = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/auth');

// Public route — occupied seats for a schedule (no auth needed for seat map)
router.get('/seats/:scheduleId', getOccupiedSeats);

// User routes
router.post('/', protect, createBooking);
router.get('/my-bookings', protect, getUserBookings);
router.get('/order/:orderNo', protect, getBookingsByOrderNo);
router.get('/:id', protect, getBookingById);
router.put('/:id', protect, updateBooking);
router.delete('/:id', protect, cancelBooking);

// Admin routes
router.get('/', protect, admin, getAllBookings);

module.exports = router;
