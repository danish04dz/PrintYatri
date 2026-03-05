const mongoose = require('mongoose');

const agencySchema = new mongoose.Schema({
    
    agencyName:{
        type : String,
        required : true
    },
    

    owner :{
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
    },
    buses :[
        {
            type : mongoose.Schema.Types.ObjectId,
            ref : "Bus"
        }
    ]
},{timestamps:true})

module.exports = mongoose.model("Agency",agencySchema);