require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');

async function createDriver() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Driver123!', salt);

        let driver = await User.findOne({ email: 'driver@busgogo.com' });
        if (!driver) {
            driver = await User.create({
                username: 'Demo Driver',
                email: 'driver@busgogo.com',
                password: hashedPassword,
                phone: '02099999999',
                role: 'driver',
                isActive: true
            });
            console.log('Driver created: driver@busgogo.com / Driver123!');
        } else {
            driver.role = 'driver';
            await driver.save();
            console.log('Driver exists: driver@busgogo.com / Driver123!');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
createDriver();
