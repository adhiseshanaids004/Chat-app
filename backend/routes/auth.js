const express=require('express')
const bcrypt=require('bcrypt')
const jwt=require('jsonwebtoken')
const User=require('../models/user')
const router=express.Router()
router.post('/signup',async(req,res)=>{
  const {name,phone,password}=req.body
  const hash=await bcrypt.hash(password,10)
  try{
    const u=await User.create({name,phone,password:hash})
    const token=jwt.sign({id:u._id},process.env.JWT_SECRET||'secret')
    res.json({token,user:{id:u._id,name:u.name,phone:u.phone}})
  }catch(e){res.status(400).json({error:'phone already used'})}
})
router.post('/login',async(req,res)=>{
  const {phone,password}=req.body
  const u=await User.findOne({phone})
  if(!u)return res.status(400).json({error:'invalid'})
  const ok=await bcrypt.compare(password,u.password)
  if(!ok)return res.status(400).json({error:'invalid'})
  const token=jwt.sign({id:u._id},process.env.JWT_SECRET||'secret')
  res.json({token,user:{id:u._id,name:u.name,phone:u.phone}})
})
module.exports=router