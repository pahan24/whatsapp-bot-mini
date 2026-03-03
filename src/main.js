
import makeWASocket,{useMultiFileAuthState,DisconnectReason} from '@whiskeysockets/baileys'
import express from 'express'
import P from 'pino'

const app=express()
app.use(express.json())

let sock

async function startBot(){
 const {state,saveCreds}=await useMultiFileAuthState('session')

 sock=makeWASocket({
   auth:state,
   printQRInTerminal:false,
   logger:P({level:"silent"})
 })

 sock.ev.on('creds.update',saveCreds)

 sock.ev.on('connection.update',(update)=>{
  const {connection,lastDisconnect}=update

  if(connection==="close"){
    const shouldReconnect=lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut
    if(shouldReconnect) startBot()
  }

  if(connection==="open"){
    console.log("Bot connected")
  }
 })

 sock.ev.on('messages.upsert',async(m)=>{
   const msg=m.messages[0]
   if(!msg.message) return

   const from=msg.key.remoteJid
   const text=msg.message.conversation || msg.message.extendedTextMessage?.text || ""

   const command=text.toLowerCase()

   if(command==="ping"){
     await sock.sendMessage(from,{text:"pong 🏓"})
   }

   if(command==="menu"){
     await sock.sendMessage(from,{text:`🤖 Simple Bot Menu

ping - bot test
menu - command list
time - server time
owner - owner info
hello - greeting

Enjoy!`})
   }

   if(command==="hello"){
     await sock.sendMessage(from,{text:"Hello 👋 I'm alive!"})
   }

   if(command==="time"){
     const time=new Date().toLocaleString()
     await sock.sendMessage(from,{text:"⏰ Server Time: "+time})
   }

   if(command==="owner"){
     await sock.sendMessage(from,{text:"Bot Owner: Your Name"})
   }

 })
}

app.get("/",(req,res)=>{
 res.sendFile(new URL('../pair-site/index.html',import.meta.url).pathname)
})

app.post("/pair",async(req,res)=>{
 try{
  const number=req.body.number
  const code=await sock.requestPairingCode(number)
  res.json({pair_code:code})
 }catch(e){
  res.json({error:String(e)})
 }
})

const PORT=process.env.PORT||3000

app.listen(PORT,()=>{
 console.log("Pair site running on "+PORT)
})

startBot()
