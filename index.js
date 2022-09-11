const express=require("express");
const cors=require("cors");
const app=express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port=process.env.PORT || 5000;
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rih71sa.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run(){
  try{
    await client.connect();
    const packageCollection = client.db("lastProject").collection("packages");
    const bookingCollection = client.db("lastProject").collection("tourBooking");
    app.get("/product", async (req, res) => {
      const query = {};
      const cursor = packageCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
  });
  app.get("/booking",async(req,res)=>{
    const email=req.query.email;
    console.log(email);
    const query={email:email};
    const bookings=await bookingCollection.find(query).toArray();
    res.send(bookings);
  });
  app.get("/product/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const service = await packageCollection.findOne(query);
    res.send(service);
});
app.post("/booking",async (req,res)=>{
   const booking=req.body;
   const query={ date:booking.date, email:booking.email }
   const exists=await bookingCollection.findOne(query);
   if(exists){
     return res.send({success:false, booking:exists})
   }
   const result=await bookingCollection.insertOne(booking);
   return res.send({success:true ,result});
})
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