const mongoose = require('mongoose');

const agencySchema = new mongoose.Schema({
    ownerName:{
        type : String,
        required:true
    },
    agencyName:{
        type : String,
        required : true
    },
    email : {
        type : String,
        required : true
    },
    phone : {
        type : String,
        required :true
    },
    password :{
        type : String,
        required :true
    },
    role :{
        type : String,
        enum :["agency"],
        default: "agency"

    },
    createdBy : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Admin"
    }
    

})

module.exports = mongoose.model("Agency",agencySchema);