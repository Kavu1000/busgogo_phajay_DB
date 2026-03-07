require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const bcrypt = require('bcryptjs');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ email: 'driver@busgogo.com' });
    console.log(user);
    if (user) {
        const isMatch = await bcrypt.compare('Driver123!', user.password);
        console.log('Password match:', isMatch);
    }
    process.exit(0);
}
check();
