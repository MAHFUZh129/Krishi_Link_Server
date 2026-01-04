const express = require('express')
const cors = require('cors');
require("dotenv").config()
const app = express()
const port = 5000
app.use(cors())
app.use(express.json())




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7gwzlnt.mongodb.net/?appName=Cluster0`;

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
    // await client.connect();
    const db =client.db('krishi-link')
    const corpsColl=db.collection('corps')

    // find or findOne
    // app.get('/corps',async(req,res)=>{
    //     const result=await corpsColl.find().toArray()
    //     res.send(result)
    // })
    app.get("/corps", async (req, res) => {
  try {
    const { search, type, location, minPrice, maxPrice, sort } = req.query;

    let query = {};

    // name search
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // filters
    if (type && type !== "all") {
      query.type = type;
    }

    if (location && location !== "all") {
      query.location = location;
    }

    // price Filter 
    if (minPrice || maxPrice) {
      query.pricePerUnit = {};
      if (minPrice) query.pricePerUnit.$gte = Number(minPrice);
      if (maxPrice) query.pricePerUnit.$lte = Number(maxPrice);
    }

    // sorting
    let sortQuery = {};
    if (sort === "price_asc") sortQuery.pricePerUnit = 1;
    if (sort === "price_desc") sortQuery.pricePerUnit = -1;
    if (sort === "latest") sortQuery._id = -1;

    const result = await corpsColl
      .find(query)
      .sort(sortQuery)
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to getting crops" });
  }
});


    app.get('/latest-corps',async(req,res)=>{
        const result=await corpsColl.find().sort({
             quantity:-1}).limit(8).toArray()
        res.send(result)
    })

     app.get('/corps/:id',async(req,res)=>{
        const {id}=req.params
        const result=await corpsColl.findOne({_id:new ObjectId(id)})
        res.send(result)
    })

    app.get("/search", async(req, res) => {
      const search = req.query.search
      const result = await corpsColl.find({name: {$regex: search, $options: "i"}}).toArray()
      res.send(result)
    })

app.get("/my-interests", async (req, res) => {
  const email = req.query.email;

  const result = await corpsColl
    .find({ "interests.userEmail": email })
    .project({ name: 1, owner: 1, interests: 1 }) 
    .toArray();

  const filtred = result.flatMap((crop) =>
    crop.interests
      .filter((i) => i.userEmail === email)
      .map((i) => ({
        cropName: crop.name,
        ownerName: crop.owner.ownerName,
        ownerEmail: crop.owner.ownerEmail,
        quantity: i.quantity,
        message: i.message,
        status: i.status,
      }))
  );

  res.send(filtred)
});

// Dashboard overview stats
app.get("/dashboard-overview", async (req, res) => {
  const totalCrops = await corpsColl.countDocuments();
  const totalQuantity = await corpsColl.aggregate([
    { $group: { _id: null, total: { $sum: "$quantity" } } }
  ]).toArray();

  const categoryWise = await corpsColl.aggregate([
    { $group: { _id: "$type", count: { $sum: 1 } } }
  ]).toArray();

  res.send({
    totalCrops,
    totalQuantity: totalQuantity[0]?.total || 0,
    categoryWise,
  });
});

    app.get("/my-posts", async(req, res) => {
      const email = req.query.email
      const result = await corpsColl.find({ "owner.ownerEmail": email }).toArray()
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

          if (quantity < 1) return res.status(400).json({ error: "Quantity must be at least 1" })

    const crop = await corpsColl.findOne({ _id: new ObjectId(cropId) });
    if (!crop) return res.status(404).json({ error: "Crop not found" });

    
    if (userEmail === crop.owner.ownerEmail) {
      return res.status(400).json({ error: "Owner cannot send interest on own crop" })
    }

     
    const alreadySent = crop.interests?.some(i => i.userEmail === userEmail);
    if (alreadySent) return res.status(400).json({ error: "Interest already sent" })

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

    res.status(201).json({ message: "interest submitted successfully", interest: newInterest })
  
    })


    app.patch("/corps/:corpId/interests/:interestId", async (req, res) => {
  const cropId = req.params.corpId;
  const interestId = req.params.interestId;
  const { status } = req.body; 


  const crop = await corpsColl.findOne({ _id: new ObjectId(cropId) });

  if (!crop) {
    return res.send({ message: "corp not found" });
  }

  const interest = crop.interests.find(
    (item) =>
       item._id.toString() === interestId
  );

  if (!interest) {
    return res.send({ message: "interset not found" })
  }

  interest.status = status;

  if (status === "accepted") {
    const quantityToReduce = parseInt(interest.quantity) || 0;
    crop.quantity = crop.quantity - quantityToReduce;


    if (crop.quantity < 0) crop.quantity = 0
  }


     await corpsColl.updateOne(
    { _id: new ObjectId(cropId) },
    {
      $set: {


        interests: crop.interests,
        quantity: crop.quantity,
      },
    }
  );

  res.send({ message: `Interest ${status} succcessfully` });
});
    
app.put("/corps/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const result = await corpsColl.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "corpp not found or no changes made" })
    }

    res.json({ success: true, message: "crop updated successfully" })
  } 
  catch (error) {
    console.error( error);
    res.status(500).json({ message: "failed to update crop" })
  }
});

// delete or deleteOne
app.delete("/corps/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await corpsColl.deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Crop not found" })
    }

    res.json({ success: true, message: "Crop deleted successfully" })
  } catch (error) {
    console.error("error deleting crop:", error)
    res.status(500).json({ message: "Failed to delete crop" })
  }
});






    // await client.db("admin").command({ ping: 1 });
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
