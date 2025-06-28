const express= require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require ('cors');
const bcrypt = require('bcryptjs');



dotenv.config();

const app =express();
app.use(cors());
app.use(express.json());



// AdminJs Setup


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