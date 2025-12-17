const express=require('express')
const jwt=require('jsonwebtoken')
const Group=require('../models/group')
const User=require('../models/user')
const router=express.Router()
async function auth(req,res,next){
  const h=req.headers.authorization
  if(!h)return res.status(401).end()
  try{const t=h.split(' ')[1];const p=jwt.verify(t,process.env.JWT_SECRET||'secret');req.user=await User.findById(p.id);next()}catch(e){res.status(401).end()}
}
router.post('/',auth,async(req,res)=>{
  const {name,description,members=[]}=req.body
  const g=await Group.create({name,description,members:[...members,req.user._id],admin:req.user._id})
  res.json(g)
})
router.get('/',auth,async(req,res)=>{
  const gs=await Group.find({members:req.user._id})
  res.json(gs)
})
module.exports=router