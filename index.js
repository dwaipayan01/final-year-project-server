const express=require("express");
const cors=require("cors");
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const sgTransport=require('nodemailer-sendgrid-transport');
const app=express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port=process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);



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
    const paymentCollection = client.db('lastProject').collection('payments');
    const informationCollection = client.db('lastProject').collection('information');
    const reviewCollection = client.db('lastProject').collection('reviews');

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
    const option={
      auth:{
        api_key:process.env.EMAIL_SENDER_KEY
      }
    }
    const emailClient=nodemailer.createTransport(sgTransport(option));
    function sendConfirmationEmail(payment){
      const {email,name,date,tourName}=payment;
      var Senderemail = {
        from: process.env.EMAIL_SENDER,
        to: email,
        subject: `Your Booking for ${tourName} confirmation`,
        text: `Your Booking for ${tourName} is on ${date}  is Confirmed`,
        html: `
          <div>
            <p> Hello ${name}, </p>
            <h3>We received your payment.Your Appointment for ${tourName} is confirmed</h3>
            <p>Looking forward to seeing you on ${date} .</p>
            
            <h3>Our Address</h3>
            <p>Zindabazar,Sylher</p>
            <p>Bangladesh</p>
          </div>
        `
      };
      emailClient.sendMail(Senderemail, function(err, info){
        if (err ){
          console.log(err);
        }
        else {
          console.log('Message sent: ', info);
        }
    });

    }
    app.post('/create-payment-intent', verifyJwt, async (req, res) => {
      const service = req.body;
      const price = service.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method_types: ['card']
      });
      res.send({ clientSecret: paymentIntent.client_secret })
  });
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
  app.patch('/booking/:id', verifyJwt, async(req, res) =>{
    const id  = req.params.id;
    const payment = req.body;
    const filter = {_id: ObjectId(id)};
    const updatedDoc = {
      $set: {
        paid: true,
        transactionId: payment.transactionId
      }
    }

    const result = await paymentCollection.insertOne(payment);
    const updatedBooking = await bookingCollection.updateOne(filter, updatedDoc);
    sendConfirmationEmail(payment);
    res.send(updatedBooking);
  })
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
app.post("/information",verifyJwt,async(req,res)=>{
  const information=req.body;
  const result=await informationCollection.insertOne(information);
   res.send({success:true ,result});

});
app.post("/review",verifyJwt,async(req,res)=>{
  const review=req.body;
  const result=await reviewCollection.insertOne(review);
   res.send({success:true ,result});

})
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
app.put("/package/:id",verifyJwt,async(req,res)=>{
  const id=req.params.id;
  const updatedUser=req.body;
  console.log(updatedUser);
  const filter={_id:ObjectId(id)};
  const options={upsert : true}
    const updateDoc = {
     $set: {
                
      picture:updatedUser.picture,
      name:updatedUser.name,
      price:updatedUser.price,
      review:updatedUser.review,
      pacage:updatedUser.pacage,
      location:updatedUser.location
     },
   };
   const result=await packageCollection.updateOne(filter,updateDoc,options);
   res.send(result);
  });

   app.put("/profile/:email",verifyJwt,async(req,res)=>{
    const email=req.params.email;
    const updatedUser=req.body;
    const filter={email:email};
    
    const options={upsert : true}
      const updateDoc = {
       $set: {
                  
       
        name:updatedUser.name,
        email:updatedUser.email,
        address:updatedUser.address,
        number:updatedUser.number,
        gender:updatedUser.gender
       },
     };
     const result=await userCollection.updateOne(filter,updateDoc,options);
     res.send({success:true ,result});
  
 
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