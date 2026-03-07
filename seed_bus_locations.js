/**
 * seed_bus_locations.js
 * Patches all Bus documents with realistic Lao GPS coordinates.
 * Run once:  node seed_bus_locations.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

// Minimal inline schema (avoids requiring the full server stack)
const busSchema = new mongoose.Schema({}, { strict: false });
const Bus = mongoose.model('Bus', busSchema, 'buses');

// Realistic Lao locations along common bus routes
const LAO_LOCATIONS = [
    { lat: 17.9757, lng: 102.6331, locationName: 'ວຽງຈັນ (ສະຖານີຂົນສົ່ງໃຕ້)' },   // Vientiane South
    { lat: 18.9333, lng: 102.4500, locationName: 'ວັງວຽງ' },                        // Vang Vieng
    { lat: 19.8853, lng: 102.1348, locationName: 'ຫຼວງພະບາງ' },                    // Luang Prabang
    { lat: 16.5568, lng: 104.7503, locationName: 'ສະຫວັນນະເຂດ' },                 // Savannakhet
    { lat: 15.1202, lng: 105.7986, locationName: 'ປາກເຊ' },                        // Pakse
    { lat: 17.4000, lng: 104.8000, locationName: 'ທ່າແຂກ' },                       // Thakhek
    { lat: 18.4500, lng: 102.5000, locationName: 'ກາສີ' },                         // Kasi
    { lat: 20.9667, lng: 101.9833, locationName: 'ຫຼວງນ້ຳທາ' },                   // Luang Namtha
    { lat: 21.7500, lng: 101.9833, locationName: 'ຜົ້ງສາລີ' },                    // Phongsali
    { lat: 20.3333, lng: 103.1167, locationName: 'ອຸດົມໄຊ' },                     // Udomxai
];

async function seed() {
    try {
        const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!uri) {
            console.error('❌  MONGODB_URI not found in .env');
            process.exit(1);
        }

        await mongoose.connect(uri);
        console.log('✅  Connected to MongoDB');

        const buses = await Bus.find({});
        console.log(`📋  Found ${buses.length} bus(es)`);

        if (buses.length === 0) {
            console.log('⚠️   No buses in database. Add buses first.');
            process.exit(0);
        }

        for (let i = 0; i < buses.length; i++) {
            const loc = LAO_LOCATIONS[i % LAO_LOCATIONS.length];
            // Add tiny random offset so buses don't all stack on same point
            const jitter = () => (Math.random() - 0.5) * 0.04;
            await Bus.findByIdAndUpdate(buses[i]._id, {
                lat: parseFloat((loc.lat + jitter()).toFixed(6)),
                lng: parseFloat((loc.lng + jitter()).toFixed(6)),
                locationName: loc.locationName,
            });
            console.log(`  ✔  ${buses[i].name || buses[i].licensePlate} → ${loc.locationName}`);
        }

        console.log('\n🎉  Seed complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌  Seed failed:', err.message);
        process.exit(1);
    }
}

seed();
