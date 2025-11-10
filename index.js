const express = require('express')
const cors = require('cors');
const app = express()
const port = 3000
app.use(cors())
app.use(express.json())


const { MongoClient, ServerApiVersion } = require('mongodb');
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
