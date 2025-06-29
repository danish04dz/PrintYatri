const express= require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require ('cors');
const bcrypt = require('bcryptjs');



dotenv.config();

const app =express();
app.use(cors());
app.use(express.json());



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