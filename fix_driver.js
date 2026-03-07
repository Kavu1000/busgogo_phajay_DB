require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function fixDriver() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        let driver = await User.findOne({ email: 'driver@busgogo.com' });
        if (driver) {
            // Because the schema has a pre('save') hook that hashes the password,
            // we just need to set the raw string and let the hook do its job once.
            driver.password = 'Driver123!';
            driver.isActive = true;
            driver.role = 'driver';
            await driver.save();
            console.log('Driver password fixed for: driver@busgogo.com');
        } else {
            console.log('Driver not found');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
fixDriver();
