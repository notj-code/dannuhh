require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to DB
const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/dannuhh';
let DB_CONNECTED = false;
mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true }).then(()=>{
  DB_CONNECTED = true;
  console.log('Connected to MongoDB');
}).catch(err=>{
  DB_CONNECTED = false;
  console.error('MongoDB error (continuing without DB):', err.message);
});

// Keep the server alive even if the DB is not available — this lets the static frontend work
process.on('unhandledRejection', (err)=>{
  console.error('UnhandledRejection:', err && err.message ? err.message : err);
});
process.on('uncaughtException', (err)=>{
  console.error('UncaughtException:', err && err.message ? err.message : err);
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/words', require('./routes/words'));

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=>console.log('Server running on port', PORT));
