const Schedule = require('../models/Schedule');
const Bus = require('../models/Bus');

// @desc    Create new schedule
// @route   POST /api/schedules
// @access  Private/Admin
const createSchedule = async (req, res, next) => {
    try {
        console.log('Create Schedule Request Body:', req.body); // Debug log
        const { busId } = req.body;

        // Validate busId is provided
        if (!busId) {
            res.status(400);
            throw new Error('Please select a bus');
        }

        const bus = await Bus.findById(busId);
        if (!bus) {
            res.status(404);
            throw new Error('Bus not found');
        }

        const schedule = await Schedule.create(req.body);

        res.status(201).json({
            success: true,
            data: schedule,
            message: 'Schedule created successfully',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all schedules
// @route   GET /api/schedules
// @access  Public
const getAllSchedules = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;  // higher default so all schedules return
        const skip = (page - 1) * limit;

        const filter = {};

        if (req.query.status) {
            filter.status = req.query.status;
        }

        if (req.query.from) {
            filter['route.from'] = new RegExp(req.query.from, 'i');
        }

        if (req.query.to) {
            filter['route.to'] = new RegExp(req.query.to, 'i');
        }

        if (req.query.date) {
            // Extend ±12 hours so schedules stored at local midnight UTC+7
            // (= 17:00 UTC the previous calendar day) are never excluded.
            const date = new Date(req.query.date);
            date.setHours(date.getHours() - 12);          // go back 12 h
            const nextDate = new Date(req.query.date);
            nextDate.setDate(nextDate.getDate() + 1);
            nextDate.setHours(nextDate.getHours() + 12);  // go forward 12 h

            const dateFilter = { $gte: date, $lt: nextDate };

            if (filter.status) {
                // A specific status is already filtered – just add the date range
                filter.date = dateFilter;
            } else {
                // No specific status – always show in-progress trips (active driver trips)
                // regardless of the stored date, plus any schedule within the date window
                filter.$or = [
                    { date: dateFilter },
                    { status: 'in-progress' }
                ];
            }
        }

        const schedules = await Schedule.find(filter)
            .populate('busId', 'name company licensePlate capacity phone')
            .populate('driverId', 'username email')
            .limit(limit)
            .skip(skip)
            .sort({ date: -1, departureTime: -1 });

        const total = await Schedule.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: schedules,
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

// @desc    Get schedule by ID
// @route   GET /api/schedules/:id
// @access  Public
const getScheduleById = async (req, res, next) => {
    try {
        const schedule = await Schedule.findById(req.params.id)
            .populate('busId', 'name company licensePlate capacity phone');

        if (!schedule) {
            res.status(404);
            throw new Error('Schedule not found');
        }

        res.status(200).json({
            success: true,
            data: schedule,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update schedule
// @route   PUT /api/schedules/:id
// @access  Private/Admin
const updateSchedule = async (req, res, next) => {
    try {
        const schedule = await Schedule.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true,
            }
        ).populate('busId', 'name company licensePlate capacity phone');

        if (!schedule) {
            res.status(404);
            throw new Error('Schedule not found');
        }

        res.status(200).json({
            success: true,
            data: schedule,
            message: 'Schedule updated successfully',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete schedule
// @route   DELETE /api/schedules/:id
// @access  Private/Admin
const deleteSchedule = async (req, res, next) => {
    try {
        const schedule = await Schedule.findById(req.params.id);

        if (!schedule) {
            res.status(404);
            throw new Error('Schedule not found');
        }

        await schedule.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Schedule deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get unique cities from all schedules
// @route   GET /api/schedules/cities
// @access  Public
const getCities = async (req, res, next) => {
    try {
        // Get all schedules
        const schedules = await Schedule.find({ status: 'active' });

        // Extract unique cities from both 'from' and 'to' fields
        const citiesSet = new Set();
        schedules.forEach(schedule => {
            if (schedule.route.from) citiesSet.add(schedule.route.from);
            if (schedule.route.to) citiesSet.add(schedule.route.to);
        });

        // Convert set to sorted array
        const cities = Array.from(citiesSet).sort();

        res.status(200).json({
            success: true,
            data: cities,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Auto-update expired schedule dates to tomorrow
// @route   POST /api/schedules/update-expired
// @access  Private/Admin
const updateExpiredSchedules = async (req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find all schedules with past dates (keep them active, just update date)
        const expiredSchedules = await Schedule.find({
            date: { $lt: today }
        }).populate('busId', 'capacity');

        if (expiredSchedules.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No expired schedules found',
                data: { updated: 0 }
            });
        }

        let updatedCount = 0;

        // Calculate tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        for (const schedule of expiredSchedules) {
            // Get the bus capacity to reset available seats
            const busCapacity = schedule.busId?.capacity || schedule.availableSeats;

            // Update the same schedule: move date to tomorrow and reset seats
            await Schedule.findByIdAndUpdate(schedule._id, {
                date: tomorrow,
                availableSeats: busCapacity, // Reset to full capacity
                status: 'active' // Ensure it's active
            });

            updatedCount++;
        }

        res.status(200).json({
            success: true,
            message: `Auto-updated ${updatedCount} schedule(s) to ${tomorrow.toLocaleDateString()}`,
            data: {
                updated: updatedCount,
                newDate: tomorrow.toISOString()
            }
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get current trip for logged in driver
// @route   GET /api/schedules/driver/current
// @access  Private/Driver
const getCurrentDriverTrip = async (req, res, next) => {
    try {
        // Look ±1 day around now to handle timezone differences between
        // the server (UTC) and the driver's local timezone.
        // The `status` field (active/in-progress) is the real indicator of a current trip.
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const dayAfterTomorrow = new Date();
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        dayAfterTomorrow.setHours(0, 0, 0, 0);

        // Admins can see any active schedule; drivers only see their assigned ones
        const filter = {
            status: { $in: ['active', 'in-progress'] },
            date: { $gte: yesterday, $lt: dayAfterTomorrow },
        };

        if (req.user.role !== 'admin') {
            filter.driverId = req.user._id;
        }

        const schedule = await Schedule.findOne(filter)
            .populate('busId', 'name licensePlate capacity')
            .sort({ departureTime: 1 });

        if (!schedule) {
            return res.status(200).json({
                success: true,
                data: null,
                message: 'No active trips found',
            });
        }

        res.status(200).json({
            success: true,
            data: schedule,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Start driver trip
// @route   PATCH /api/schedules/:id/start
// @access  Private/Driver
const startTrip = async (req, res, next) => {
    try {
        // Admins can start any schedule; drivers can only start their assigned ones
        const filter = { _id: req.params.id };
        if (req.user.role !== 'admin') {
            filter.driverId = req.user._id;
        }

        const schedule = await Schedule.findOne(filter);

        if (!schedule) {
            res.status(404);
            throw new Error('Schedule not found or not assigned to you');
        }

        if (schedule.status !== 'active') {
            res.status(400);
            throw new Error(`Cannot start trip. Current status is "${schedule.status}"`);
        }

        schedule.status = 'in-progress';
        await schedule.save();

        // Emit socket event to notify staff
        const io = req.app.get('io');
        if (io) {
            io.emit('schedule_updated', { scheduleId: schedule._id, status: 'in-progress' });
        }

        res.status(200).json({
            success: true,
            data: schedule,
            message: 'Trip started successfully',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    End driver trip
// @route   PATCH /api/schedules/:id/end
// @access  Private/Driver
const endTrip = async (req, res, next) => {
    try {
        // Admins can end any schedule; drivers can only end their assigned ones
        const filter = { _id: req.params.id };
        if (req.user.role !== 'admin') {
            filter.driverId = req.user._id;
        }

        const schedule = await Schedule.findOne(filter);

        if (!schedule) {
            res.status(404);
            throw new Error('Schedule not found or not assigned to you');
        }

        if (schedule.status !== 'in-progress') {
            res.status(400);
            throw new Error(`Cannot end trip. Current status is "${schedule.status}"`);
        }

        schedule.status = 'completed';
        await schedule.save();

        // Emit socket event to notify staff
        const io = req.app.get('io');
        if (io) {
            io.emit('schedule_updated', { scheduleId: schedule._id, status: 'completed' });
        }

        res.status(200).json({
            success: true,
            data: schedule,
            message: 'Trip ended successfully',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update driver's current location
// @route   PATCH /api/schedules/:id/location
// @access  Private/Driver
const updateLocation = async (req, res, next) => {
    try {
        const { lat, lng } = req.body;

        if (lat === undefined || lng === undefined) {
            res.status(400);
            throw new Error('Latitude and longitude are required');
        }

        const schedule = await Schedule.findOne({
            _id: req.params.id,
            driverId: req.user._id,
        });

        if (!schedule) {
            res.status(404);
            throw new Error('Schedule not found or not assigned to you');
        }

        if (schedule.status !== 'in-progress') {
            res.status(400);
            throw new Error('Location can only be updated for in-progress trips');
        }

        schedule.currentLocation = {
            lat,
            lng,
            updatedAt: new Date()
        };
        await schedule.save();

        res.status(200).json({
            success: true,
            data: schedule.currentLocation,
            message: 'Location updated',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get passenger list for a trip
// @route   GET /api/schedules/:id/passengers
// @access  Private/Driver/Admin
const getPassengersForTrip = async (req, res, next) => {
    try {
        const schedule = await Schedule.findById(req.params.id);

        if (!schedule) {
            res.status(404);
            throw new Error('Schedule not found');
        }

        // Must be assigned driver or admin
        if (req.user.role !== 'admin' && String(schedule.driverId) !== String(req.user._id)) {
            res.status(403);
            throw new Error('Not authorized to view passengers for this trip');
        }

        // Fetch bookings for this schedule, joining user details
        const Booking = require('../models/Booking');
        const passengers = await Booking.find({ scheduleId: req.params.id })
            .populate('userId', 'username email phone')
            .sort({ seatNumber: 1 });

        res.status(200).json({
            success: true,
            data: passengers,
            count: passengers.length,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
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
};

