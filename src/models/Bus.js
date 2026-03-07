const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Bus name is required'],
        trim: true,
    },
    company: {
        type: String,
        required: [true, 'Company name is required'],
        trim: true,
    },
    licensePlate: {
        type: String,
        required: [true, 'License plate is required'],
        unique: true,
        trim: true,
        uppercase: true,
    },
    capacity: {
        type: Number,
        required: [true, 'Capacity is required'],
        min: [1, 'Capacity must be at least 1'],
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
    },
    lat: {
        type: Number,
        default: null,
    },
    lng: {
        type: Number,
        default: null,
    },
    locationName: {
        type: String,
        default: '',
        trim: true,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Bus', busSchema);
