const mongoose=require('mongoose')
const schema=new mongoose.Schema({name:String,phone:{type:String,unique:true},password:String,contacts:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],online:{type:Boolean,default:false}})
module.exports=mongoose.model('User',schema)