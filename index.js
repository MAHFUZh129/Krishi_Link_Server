const express = require('express')
const cors = require('cors');
const app = express()
const port = 3000
app.use(cors())
app.use(express.json())




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = "mongodb+srv://krishi-link:TxVY3DfzUZ5EjOYX@cluster0.7gwzlnt.mongodb.net/?appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});




async function run() {
  try {
    await client.connect();
    const db =client.db('krishi-link')
    const corpsColl=db.collection('corps')

    // find or findOne
    app.get('/corps',async(req,res)=>{
        const result=await corpsColl.find().toArray()
        res.send(result)
    })

    app.get('/latest-corps',async(req,res)=>{
        const result=await corpsColl.find().sort({
             quantity:-1}).limit(6).toArray()
        res.send(result)
    })

     app.get('/corps/:id',async(req,res)=>{
        const {id}=req.params
        const result=await corpsColl.findOne({_id:new ObjectId(id)})
        res.send(result)
    })

    // insert or insertOne
     app.post("/corps",   async (req, res) => {
      const data = req.body;
      // console.log(data)
      const result = await corpsColl.insertOne(data);
      res.send({
        success: true,
        result,
      });
    });

    // update or updateOne
    app.post('/interests',async(req,res)=>{
         const { cropId, quantity, message } = req.body;
          const userEmail = req.body.userEmail

          if (quantity < 1) return res.status(400).json({ error: "Quantity must be at least 1" });

    const crop = await corpsColl.findOne({ _id: new ObjectId(cropId) });
    if (!crop) return res.status(404).json({ error: "Crop not found" });

    
    if (userEmail === crop.owner.ownerEmail) {
      return res.status(400).json({ error: "Owner cannot send interest on own crop" })
    }

     
    const alreadySent = crop.interests?.some(i => i.userEmail === userEmail);
    if (alreadySent) return res.status(400).json({ error: "Interest already sent" });

    const interestId = new ObjectId();
    const newInterest = {
      _id: interestId,
      cropId,
      userEmail,
      userName: req.body.userName, 
      quantity,
      message,
      status: "pending",
    };
    await corpsColl.updateOne(
      { _id: new ObjectId(cropId) },
      { $push: { interests: newInterest } }
    );

    res.status(201).json({ message: "Interest submitted successfully", interest: newInterest });
  
    })







    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.listen(port, () => {
  console.log(`server running on port ${port}`)
})
