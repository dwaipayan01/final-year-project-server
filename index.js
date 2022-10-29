const express=require("express");
const cors=require("cors");
const jwt = require('jsonwebtoken');
const app=express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port=process.env.PORT || 5000;
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rih71sa.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJwt(req,res,next){
  const authHeader=req.headers.authorization;
   if(!authHeader){
    return res.status(401).send({message : "Unauthorized access"});
   }
   const token=authHeader.split(' ')[1];
   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
    if(err){
      return res.status(403).send({message:"Forbidden access"});
    }
     req.decoded=decoded;
    next();
  });
}
async function run(){
  try{
    await client.connect();
    const packageCollection = client.db("lastProject").collection("packages");
    const bookingCollection = client.db("lastProject").collection("tourBooking");
    const userCollection = client.db("lastProject").collection("users");

    const verifyAdmin=async(req,res,next)=>{
      const requester=req.decoded.email;
      const requesterAccount=await userCollection.findOne({email:requester});
      if(requesterAccount.role==='admin'){
        next();
      }
      else{
        res.status(403).send({message:"Forbidden access"});
      }
    }
    app.get("/product", async (req, res) => {
      const query = {};
      const cursor = packageCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
  });
  app.get("/booking",verifyJwt,async(req,res)=>{
    const email=req.query.email;
    const decodedEmail=req.decoded.email;
    if(email===decodedEmail){
      const query={email:email};
    const bookings=await bookingCollection.find(query).toArray();
    return res.send(bookings);
    }
    else{
      return res.status(403).send({message:"Forbidden access"});
    }
  });
  app.get("/product/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const service = await packageCollection.findOne(query);
    res.send(service);
});
app.get("/admin/:email",verifyJwt,async(req,res)=>{
  const email=req.params.email;
  const user=await userCollection.findOne({email:email});
  const isAdmin=user.role==='admin';
  res.send({admin:isAdmin});
});
app.get("/booking/:id",verifyJwt,async (req,res)=>{
  const id=req.params.id;
  const query={_id:ObjectId(id)};
  const booking=await bookingCollection.findOne(query);
  res.send(booking);
})
app.post("/booking",async (req,res)=>{
   const booking=req.body;
   const query={ date:booking.date, email:booking.email }
   const exists=await bookingCollection.findOne(query);
   if(exists){
     return res.send({success:false, booking:exists})
   }
   const result=await bookingCollection.insertOne(booking);
   return res.send({success:true ,result});
});
app.put("/user/:email",async(req,res)=>{
   const email=req.params.email;
   const user=req.body;
   const filter={email:email};
   const options = { upsert: true };
   const updateDoc = {
    $set: user,
  };
  const result=await userCollection.updateOne(filter,updateDoc,options);
  const token=jwt.sign({email:email},process.env.ACCESS_TOKEN_SECRET,{ expiresIn: '1h' });
  res.send({result,token});
});
app.put("/user/admin/:email",verifyJwt,verifyAdmin,async(req,res)=>{
  const email=req.params.email;
    const filter={email:email};
    const updateDoc = {
     $set: {role:'admin'},
   };
   const result=await userCollection.updateOne(filter,updateDoc);
   res.send(result);
  
 
});
app.get("/user",verifyJwt,async(req,res)=>{
   const users=await userCollection.find().toArray();
   res.send(users);
});
app.delete("/user/:email",verifyJwt,async(req,res)=>{
  const email=req.params.email;
  const query = { email:email };
  const result = await userCollection.deleteOne(query);
  res.send(result);
});
app.post("/data",verifyJwt,verifyAdmin,async(req,res)=>{
   const information=req.body;
   const result=await packageCollection.insertOne(information);
   res.send(result);
});
app.delete("/package/:id",verifyJwt,async(req,res)=>{
  const id=req.params.id;
  const query = { _id: ObjectId(id) };
  const result = await packageCollection.deleteOne(query);
  res.send(result);
});
  }
  finally{

  }
}
run().catch(console.dir);

app.get("/",(req,res)=>{
    res.send("My versity project is running");

});
app.listen(port,()=>{
    console.log("Listening to port",port);
});