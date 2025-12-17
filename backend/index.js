const express=require('express')
const http=require('http')
const WebSocket=require('ws')
const mongoose=require('mongoose')
const cors=require('cors')
const authRoutes=require('./routes/auth')
const groupsRoutes=require('./routes/groups')
const jwt=require('jsonwebtoken')
const User=require('./models/user')
const Message=require('./models/message')
const Group=require('./models/group')
mongoose.connect('mongodb+srv://sanjaypc2004_db_user:pc1234@chat.f6ak80c.mongodb.net/simplechat?appName=Chat')
const app=express()
app.use(cors())
app.use(express.json())
app.use('/auth',authRoutes)
app.use('/groups',groupsRoutes)
const path=require('path')
app.use(express.static(path.join(__dirname,'..','client')))
app.get('/',async(req,res)=>{res.sendFile(path.join(__dirname,'..','client','index.html'))})
app.get('/me',async(req,res)=>{const h=req.headers.authorization;if(!h)return res.status(401).json({error:'No authorization header'});try{const t=h.split(' ')[1];const p=jwt.verify(t,process.env.JWT_SECRET||'secret');const u=await User.findById(p.id);if(!u)return res.status(404).json({error:'User not found'});res.json({id:u._id,name:u.name,phone:u.phone})}catch(e){console.error('Auth error:',e.message);res.status(401).json({error:'Unauthorized'})}})
const server=http.createServer(app)
const wss=new WebSocket.Server({server})
const sockets=new Map()
wss.on('connection',socket=>{
  socket.isAlive=true
  socket.on('pong',()=>socket.isAlive=true)
  socket.on('message',async msg=>{
    try{const data=JSON.parse(msg)
      if(data.type==='auth'){
        const p=jwt.verify(data.token,process.env.JWT_SECRET||'secret')
        const u=await User.findById(p.id)
        if(u){socket.userId=u._id;sockets.set(u._id.toString(),socket);u.online=true;await u.save();await User.updateMany({_id:{$ne:u._id},contacts:{$ne:u._id}},{$push:{contacts:u._id}});broadcastContacts()}
      }
      if(data.type==='message'){
        const m=await Message.create({from:data.from,to:data.to,group:data.group,text:data.text})
        const msg=await Message.findById(m._id).populate('from','name phone')
        if(data.to){
          const recipientSocket=sockets.get(data.to)
          if(recipientSocket&&recipientSocket.readyState===WebSocket.OPEN){
            recipientSocket.send(JSON.stringify({type:'message',message:msg}))
          }
        }
        if(data.group){
          broadcast(JSON.stringify({type:'message',message:msg}))
        }
        const senderSocket=sockets.get(data.from)
        if(senderSocket&&senderSocket.readyState===WebSocket.OPEN){
          senderSocket.send(JSON.stringify({type:'message',message:msg}))
        }
      }
    }catch(e){console.log('err',e.message)}
  })
  socket.on('close',async ()=>{
    if(socket.userId){
      sockets.delete(socket.userId.toString())
      const u=await User.findById(socket.userId)
      if(u){u.online=false;await u.save();broadcastContacts()}
    }
  })
})
function broadcast(msg){wss.clients.forEach(c=>{if(c.readyState===WebSocket.OPEN)c.send(msg)})}
async function broadcastContacts(){
  const users=await User.find()
  const payload=JSON.stringify({type:'contacts',contacts:users.map(u=>({id:u._id,name:u.name,phone:u.phone,online:u.online}))})
  broadcast(payload)
}
app.get('/contacts',async(req,res)=>{const h=req.headers.authorization;if(!h)return res.status(401).end();try{const t=h.split(' ')[1];const p=jwt.verify(t,process.env.JWT_SECRET||'secret');const u=await User.findById(p.id).populate('contacts','name phone online');res.json(u.contacts)}catch(e){res.status(401).end()}})
setInterval(()=>{
  wss.clients.forEach(s=>{if(!s.isAlive) return s.terminate();s.isAlive=false;s.ping(()=>{})})
},30000)
server.listen(8080,()=>console.log('server started on 8080'))