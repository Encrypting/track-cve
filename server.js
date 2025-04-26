const express = require('express');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const path = require('path');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure AWS
AWS.config.update({
    region: 'us-east-1', // Choose your AWS region
    // We'll use instance role credentials when deployed to EC2
    // For local development, you would specify credentials here
});

// Initialize DynamoDB client
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const tableName = 'CVETracker';

// Routes
// Get all CVEs
app.get('/api/cves', async (req, res) => {
    try {
        const params = {
            TableName: tableName
        };
        
        const data = await dynamoDB.scan(params).promise();
        res.json(data.Items);
    } catch (error) {
        console.error('Error fetching CVEs:', error);
        res.status(500).json({ error: 'Failed to fetch CVEs' });
    }
});

// Add a new CVE
app.post('/api/cves', async (req, res) => {
    try {
        const cve = req.body;
        
        const params = {
            TableName: tableName,
            Item: cve
        };
        
        await dynamoDB.put(params).promise();
        res.status(201).json(cve);
    } catch (error) {
        console.error('Error adding CVE:', error);
        res.status(500).json({ error: 'Failed to add CVE' });
    }
});

// Delete a CVE
app.delete('/api/cves/:id', async (req, res) => {
    try {
        const params = {
            TableName: tableName,
            Key: {
                cveId: req.params.id
            }
        };
        
        await dynamoDB.delete(params).promise();
        res.json({ message: 'CVE deleted successfully' });
    } catch (error) {
        console.error('Error deleting CVE:', error);
        res.status(500).json({ error: 'Failed to delete CVE' });
    }
});

// Serve the main HTML file for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
