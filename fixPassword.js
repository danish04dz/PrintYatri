const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    console.log("Connected to MongoDB");
    
    let admin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    
    if (!admin) {
        console.log("Admin not found, creating new one...");
        admin = new Admin({
            name: process.env.ADMIN_NAME,
            email: process.env.ADMIN_EMAIL,
            role: 'admin'
        });
    }
    
    // Set the plain text password and let the pre('save') hook hash it!
    admin.password = process.env.ADMIN_PASSWORD;
    await admin.save();
    console.log("Admin credentials updated successfully! Password:", process.env.ADMIN_PASSWORD);
}).catch(err => {
    console.error("Error connecting to MongoDB or updating admin:", err);
}).finally(() => {
    mongoose.connection.close();
});
