const mongoose =require ('mongoose');
const bcrypt = require ('bcrypt');
const Admin = require ("./models/Admin");
require ('dotenv').config();

mongoose.connect(process.env.MONGODB_URI,)
.then(async () => {
    console.log("Connected to MongoDB");
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    if (existingAdmin) {
        console.log("Admin already exists. Skipping creation.");
        return;
    }

    // Create a new admin
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    const newAdmin = new Admin({
        name: process.env.ADMIN_NAME,
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
        role: "admin"
    });

    await newAdmin.save();
    console.log("Admin created successfully");
}).catch(err => {
    console.error("Error connecting to MongoDB or creating admin:", err);
}).finally(() => {
    mongoose.connection.close();
});
