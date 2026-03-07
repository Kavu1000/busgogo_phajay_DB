const cron = require('node-cron');
const Schedule = require('../models/Schedule');

// Function to update expired schedules and create new ones
const updateExpiredSchedules = async () => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find all active schedules with past dates
        const expiredSchedules = await Schedule.find({
            date: { $lt: today },
            status: 'active'
        });

        if (expiredSchedules.length === 0) {
            console.log('[Scheduler] No expired schedules found');
            return;
        }

        console.log(`[Scheduler] Found ${expiredSchedules.length} expired schedule(s)`);

        for (const schedule of expiredSchedules) {
            // Mark as completed
            await Schedule.findByIdAndUpdate(schedule._id, { status: 'completed' });
            console.log(`[Scheduler] Marked schedule ${schedule._id} as completed`);

            // Create new schedule for tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const newSchedule = new Schedule({
                busId: schedule.busId,
                route: schedule.route,
                departureTime: schedule.departureTime,
                arrivalTime: schedule.arrivalTime,
                duration: schedule.duration,
                date: tomorrow,
                price: schedule.price,
                pricePerSeat: schedule.pricePerSeat,
                availableSeats: schedule.availableSeats,
                status: 'active',
                driverId: schedule.driverId || null,  // carry driver assignment forward
            });

            await newSchedule.save();
            console.log(`[Scheduler] Created new schedule for ${tomorrow.toDateString()}`);
        }

        console.log('[Scheduler] Schedule update completed');
    } catch (error) {
        console.error('[Scheduler] Error updating schedules:', error);
    }
};

// Start the cron job - runs daily at midnight (00:00)
const startScheduler = () => {
    console.log('[Scheduler] Starting schedule updater cron job...');

    // Run every day at midnight
    cron.schedule('0 0 * * *', () => {
        console.log('[Scheduler] Running daily schedule update...');
        updateExpiredSchedules();
    });

    // Also run once on server start to catch any missed updates
    console.log('[Scheduler] Running initial schedule check...');
    updateExpiredSchedules();
};

module.exports = { startScheduler, updateExpiredSchedules };
