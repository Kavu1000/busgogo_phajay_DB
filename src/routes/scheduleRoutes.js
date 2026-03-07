const express = require('express');
const router = express.Router();
const {
    createSchedule,
    getAllSchedules,
    getScheduleById,
    updateSchedule,
    deleteSchedule,
    updateExpiredSchedules,
    getCities,
    getCurrentDriverTrip,
    startTrip,
    endTrip,
    updateLocation,
    getPassengersForTrip,
} = require('../controllers/scheduleController');
const { protect, admin } = require('../middleware/auth');

// Public routes
router.get('/', getAllSchedules);
router.get('/cities', getCities);

// Driver routes
router.get('/driver/current', protect, getCurrentDriverTrip);
router.patch('/:id/start', protect, startTrip);
router.patch('/:id/end', protect, endTrip);
router.patch('/:id/location', protect, updateLocation);
router.get('/:id/passengers', protect, getPassengersForTrip);

// Admin routes - specific routes before :id
router.post('/update-expired', protect, admin, updateExpiredSchedules);

router.get('/:id', getScheduleById);
router.post('/', protect, admin, createSchedule);
router.put('/:id', protect, admin, updateSchedule);
router.delete('/:id', protect, admin, deleteSchedule);

module.exports = router;

