const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configure Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Google Drive API setup
const auth = new GoogleAuth({
    keyFile: 'credentials.json', // You'll add this file in the next step
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });

// Middleware to parse JSON
app.use(express.json());

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Endpoint to receive photos
app.post('/upload/photo', upload.single('photo'), async (req, res) => {
    try {
        const filePath = req.file.path;
        const fileName = req.file.originalname;

        // Upload to Google Drive
        const fileMetadata = {
            name: fileName,
            parents: ['https://drive.google.com/drive/folders/1pCI9jJ0L80cejvs-HS8Cwz5pMgeMUebC'], // Replace with your folder ID
        };
        const media = {
            mimeType: req.file.mimetype,
            body: fs.createReadStream(filePath),
        };

        const driveResponse = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id',
        });

        // Clean up the local file
        fs.unlinkSync(filePath);

        res.status(200).json({ message: 'Photo uploaded successfully', fileId: driveResponse.data.id });
    } catch (error) {
        console.error('Error uploading photo:', error);
        res.status(500).json({ message: 'Error uploading photo', error: error.message });
    }
});

// Endpoint to receive SMS
app.post('/upload/sms', async (req, res) => {
    try {
        const { sender, messageBody, timestamp } = req.body;
        console.log(`SMS received: ${sender}, ${messageBody}, ${timestamp}`);
        // You can store SMS in Google Drive as a text file or in a database
        res.status(200).json({ message: 'SMS received successfully' });
    } catch (error) {
        console.error('Error receiving SMS:', error);
        res.status(500).json({ message: 'Error receiving SMS', error: error.message });
    }
});

// Endpoint to receive call logs
app.post('/upload/call_logs', async (req, res) => {
    try {
        const callLogs = req.body;
        console.log('Call logs received:', callLogs);
        // You can store call logs in Google Drive as a text file or in a database
        res.status(200).json({ message: 'Call logs received successfully' });
    } catch (error) {
        console.error('Error receiving call logs:', error);
        res.status(500).json({ message: 'Error receiving call logs', error: error.message });
    }
});

// Endpoint to receive health checks
app.get('/upload/health_check', (req, res) => {
    console.log('Health check ping received');
    res.status(200).send('OK');
  });
  
  app.post('/upload/health_check', (req, res) => {
    const { message } = req.body;
    console.log(`Health check received: ${message}`);
    res.status(200).send('Health check received');
  });

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});