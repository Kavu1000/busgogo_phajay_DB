const Bus = require('../models/Bus');

// @desc    Create new bus
// @route   POST /api/buses
// @access  Private/Admin
const createBus = async (req, res, next) => {
    try {
        console.log('Creating bus with data:', req.body);
        const bus = await Bus.create(req.body);

        res.status(201).json({
            success: true,
            data: bus,
            message: 'Bus created successfully',
        });
    } catch (error) {
        console.error('Error creating bus:', error);
        console.error('Error name:', error.name);
        console.error('Error code:', error.code);
        if (error.errors) {
            console.error('Validation errors:', error.errors);
        }
        next(error);
    }
};

// @desc    Get all buses
// @route   GET /api/buses
// @access  Public
const getAllBuses = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build filter
        const filter = {};

        if (req.query.company) {
            filter.company = new RegExp(req.query.company, 'i');
        }

        if (req.query.name) {
            filter.name = new RegExp(req.query.name, 'i');
        }

        const buses = await Bus.find(filter)
            .limit(limit)
            .skip(skip)
            .sort({ createdAt: -1 });

        const total = await Bus.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: buses,
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

// @desc    Get bus by ID
// @route   GET /api/buses/:id
// @access  Public
const getBusById = async (req, res, next) => {
    try {
        const bus = await Bus.findById(req.params.id);

        if (!bus) {
            res.status(404);
            throw new Error('Bus not found');
        }

        res.status(200).json({
            success: true,
            data: bus,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update bus
// @route   PUT /api/buses/:id
// @access  Private/Admin
const updateBus = async (req, res, next) => {
    try {
        const bus = await Bus.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!bus) {
            res.status(404);
            throw new Error('Bus not found');
        }

        res.status(200).json({
            success: true,
            data: bus,
            message: 'Bus updated successfully',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete bus
// @route   DELETE /api/buses/:id
// @access  Private/Admin
const deleteBus = async (req, res, next) => {
    try {
        const bus = await Bus.findById(req.params.id);

        if (!bus) {
            res.status(404);
            throw new Error('Bus not found');
        }

        await bus.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Bus deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get available seats for a bus
// @route   GET /api/buses/:id/seats
// @access  Public
const getAvailableSeats = async (req, res, next) => {
    try {
        const bus = await Bus.findById(req.params.id);

        if (!bus) {
            res.status(404);
            throw new Error('Bus not found');
        }

        res.status(200).json({
            success: true,
            data: {
                busId: bus._id,
                name: bus.name,
                company: bus.company,
                licensePlate: bus.licensePlate,
                capacity: bus.capacity,
                phone: bus.phone,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all bus locations (lat/lng) for map display
// @route   GET /api/buses/locations
// @access  Public
const getBusLocations = async (req, res, next) => {
    try {
        const buses = await Bus.find({
            lat: { $ne: null },
            lng: { $ne: null },
        }).select('name licensePlate lat lng locationName company');

        res.status(200).json({
            success: true,
            data: buses,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createBus,
    getAllBuses,
    getBusById,
    updateBus,
    deleteBus,
    getAvailableSeats,
    getBusLocations,
};
