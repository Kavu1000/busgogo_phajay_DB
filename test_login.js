require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ email: 'driver@busgogo.com' }).select('+password');
    console.log(user);
    const isMatch = await user.comparePassword('Driver123!');
    console.log('Password match:', isMatch);
    process.exit(0);
}
test();
