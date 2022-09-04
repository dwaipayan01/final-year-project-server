const express=require("express");
const cors=require("cors");
const app=express();
require('dotenv').config()
const port=process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qoriule.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
client.connect(err => {
  const collection = client.db("test").collection("devices");
  console.log("Connect hoise re");
  // perform actions on the collection object
  client.close();
});

app.get("/",(req,res)=>{
    res.send("My versity project is running");

});
app.listen(port,()=>{
    console.log("Listening to port",port);
});