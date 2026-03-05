const express= require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require ('cors');


const cookieParser = require("cookie-parser")



dotenv.config();

const app =express();
const allowedOrigins = [
  "http://localhost:8081",  // Expo Web Dev
  "http://10.196.16.136:8081",
  "http://10.196.16.240:8081",
  "http://10.85.153.136:8081",
  "http://localhost:8081",
  "exp://10.98.155.136:8081" // Your Expo Dev
   // Your LAN Expo Dev
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser())

// User Route Setup
const userRoutes = require('./routes/user.routes');
app.use('/api/user', userRoutes);


// Admin Route Setup
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);


// Agency Route Setup
const agencyRoutes = require('./routes/agency');
app.use('/api/agency', agencyRoutes);


// Conductor Route Setup
const conductorRoutes = require('./routes/conductors');
app.use('/api/conductor', conductorRoutes); 


// home route /Deafault Route
// This route is used to check if the server is running or not
app.get('/',(req,res)=>{
    res.send("PrintYatri API is Running");
});



// MongoDb Connection

mongoose.connect(process.env.MONGODB_URI)
.then(()=>{
    console.log("DB Connected Successfully");

    app.listen(process.env.PORT,()=>{
        console.log(`server is running at http://localhost:${process.env.PORT}`)

    })
})
.catch((err)=>
    console.error(err)
)