const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    busId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
        required: [true, 'Bus is required'],
    },
    route: {
        from: {
            type: String,
            required: [true, 'Starting location is required'],
        },
        to: {
            type: String,
            required: [true, 'Destination is required'],
        },
    },
    departureTime: {
        type: String,
        required: [true, 'Departure time is required'],
    },
    arrivalTime: {
        type: String,
        required: [true, 'Arrival time is required'],
    },
    duration: {
        type: String,
        required: [true, 'Duration is required'],
    },
    date: {
        type: Date,
        required: [true, 'Date is required'],
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative'],
    },
    pricePerSeat: {
        type: Number,
        required: [true, 'Price per seat is required'],
        min: [0, 'Price per seat cannot be negative'],
    },
    availableSeats: {
        type: Number,
        required: [true, 'Available seats is required'],
        min: [0, 'Available seats cannot be negative'],
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'in-progress', 'completed', 'cancelled'],
        default: 'active',
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    currentLocation: {
        lat: { type: Number },
        lng: { type: Number },
        updatedAt: { type: Date }
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('Schedule', scheduleSchema);
