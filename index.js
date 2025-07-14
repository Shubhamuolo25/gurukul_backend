require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const AWS = require('aws-sdk');
const fs = require('fs');
const upload = require('./upload');
const app = express();
const PORT = process.env.PORT;
const routes = require('./routes/routes');
const { logError } = require('./logger');
const errorMiddleware = require('./middleware/errorMiddleware');
const { startMongoToElasticsearchSync, bulkSyncUsersToElasticsearch } = require('./services/elasticSearch');
const cookieParser = require('cookie-parser');

app.use(cors({
  origin: 'http://localhost:3000', // your frontend origin
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(routes);
app.use(errorMiddleware);

// // AWS S3 configuration using .env credentials
// AWS.config.update({
//   accessKeyId: process.env.S3_ACCESS_KEY_ID,
//   secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
//   region: process.env.S3_REGION
// });
// const s3 = new AWS.S3();

// // app.use()

// // File upload endpoint for pic
// app.post('/api/upload', upload.single('pic'), async (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ success: false, error: 'No file uploaded' });
//   }
//   // multer-s3 already uploaded the file, and the key is in req.file.key
//   res.json({ success: true, key: req.file.key });
// });

// Use .env for MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  await bulkSyncUsersToElasticsearch(); // Run bulk sync on server start
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
  // Start MongoDB to Elasticsearch realtime sync AFTER MongoDB is connected
  startMongoToElasticsearchSync();
})
.catch(err => {
  logError(err);
  console.error('MongoDB connection error:', err);
});

process.on('uncaughtException', (err) => {
  logError(`Uncaught Exception: ${err.stack || err}`);
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled Rejection: ${reason.stack || reason}`);
  console.error('Unhandled Rejection:', reason);
});
