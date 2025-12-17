const mongoose=require('mongoose')
const schema=new mongoose.Schema({from:{type:mongoose.Schema.Types.ObjectId,ref:'User'},to:{type:mongoose.Schema.Types.ObjectId,ref:'User'},group:{type:mongoose.Schema.Types.ObjectId,ref:'Group'},text:String,createdAt:{type:Date,default:Date.now}})
module.exports=mongoose.model('Message',schema)