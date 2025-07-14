require('dotenv').config();
const express = require('express');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const upload = require('./upload');

const app = express();

// Configure AWS SDK using your .env variables
AWS.config.update({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region: process.env.S3_REGION
});

const s3 = new AWS.S3();

// File upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  const fileContent = fs.readFileSync(req.file.path);

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `uploads/${req.file.filename}`,
    Body: fileContent,
    ContentType: req.file.mimetype
  };

  try {
    const data = await s3.upload(params).promise();

    // Delete the temp file after upload
    fs.unlinkSync(req.file.path);

    res.json({ success: true, url: data.Location });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3000, () => console.log('Server started on http://localhost:3000'));