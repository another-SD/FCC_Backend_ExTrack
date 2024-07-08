const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// this is where the project starts 

// to parse json objects and middleware for it
app.use(express.json())
app.use(express.urlencoded({extended: true}))

// for mongoDB
// 0. adding schema for database
const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI)

let logSchema = new mongoose.Schema({
  username: {type: String, require: true},
  ref_id: {type: String, require: true},
  description: {type: String, require: true},
  duration: {type: Number, require: true},
  date: {type: Date}
})

let logModel = mongoose.model('logModel', logSchema)

let userSchema = new mongoose.Schema({username: String})
let userModel = mongoose.model('userModel', userSchema)

// 1. Creating a new user
app.post("/api/users", (req, res) => {
  const name = req.body.username;
  userModel.create({username: name})
    .then(data => res.json(data))
    .catch(err => res.send("1"))
})

// 2. Getting all users
app.get("/api/users", (req, res) => {
  userModel.find({})
    .then(data => res.json(data))
    .catch(err => res.send("2"))
})

// 3. Creating logs
app.post("/api/users/:_id/exercises", async(req, res) => {
  let newLogEntry = new logModel({
    ref_id: req.params._id,
    description: req.body.description,
    duration: parseInt(req.body.duration, 10),
    date: req.body.date ? new Date(req.body.date) : new Date()
  })

  try {
    // check if the user with id is present or not
    const user = await userModel.findById(req.params._id)
    if (!user) {
      res.send("3.1: Could not find that user.")
    } else {
      const log0 = await newLogEntry.save()
        res.json({
          username: user.username,
          _id: user._id,
          description: log0.description,
          duration: log0.duration,
          date: new Date(log0.date).toDateString()
        })
    }
  } catch(err) {
    console.error(err);
    res.send("3");
  }
})

// 4. all logs of a user(improved version ahead)
/* app.get("/api/users/:_id/logs", async(req, res) => {
  let id = req.params._id;
  let user = await userModel.findById(id);
  if(!user){
    res.send("4.1")
  } else {
    let logs = await logModel.find({ref_id: id});
    // 5. count the logs
    let counter = logs.length;
    res.json({...user.toJSON(), log: logs, count: counter})
  }
}) */

// 6. querying
app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;
  const user = await userModel.findById(id)
  if(!user){
    res.send("6.1: Could not find the user")
    return
  } 
    let dateObj = {}
    if (from) dateObj["$gte"] = new Date(from);
    if (to) dateObj["$lte"] = new Date(to);
    let filter = {ref_id: id}
    if (from || to) filter.date = dateObj;

    const logs = await logModel.find(filter).limit(limit ?? 500);

    const log = logs.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    }))

    let counter = logs.length;
    res.json({
      username: user.username,
      count: counter,
      log
    })
  
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
