const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const config = require('../config');

const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Get all CVEs
router.get('/', async (req, res) => {
  const params = {
    TableName: config.DYNAMODB_TABLE_NAME
  };

  try {
    const data = await dynamoDB.scan(params).promise();
    res.json(data.Items);
  } catch (error) {
    console.error('Error fetching CVEs:', error);
    res.status(500).json({ error: 'Could not retrieve CVEs' });
  }
});

// Add a new CVE
router.post('/', async (req, res) => {
  const { cveId, description, severity, dateReported } = req.body;
  
  // Basic validation
  if (!cveId || !description) {
    return res.status(400).json({ error: 'CVE ID and description are required' });
  }

  const params = {
    TableName: config.DYNAMODB_TABLE_NAME,
    Item: {
      cveId,
      description,
      severity: severity || 'Unknown',
      dateReported: dateReported || new Date().toISOString(),
      dateAdded: new Date().toISOString()
    }
  };

  try {
    await dynamoDB.put(params).promise();
    res.status(201).json(params.Item);
  } catch (error) {
    console.error('Error adding CVE:', error);
    res.status(500).json({ error: 'Could not add CVE' });
  }
});

// Delete a CVE
router.delete('/:cveId', async (req, res) => {
  const params = {
    TableName: config.DYNAMODB_TABLE_NAME,
    Key: {
      cveId: req.params.cveId
    }
  };

  try {
    await dynamoDB.delete(params).promise();
    res.status(200).json({ message: 'CVE deleted successfully' });
  } catch (error) {
    console.error('Error deleting CVE:', error);
    res.status(500).json({ error: 'Could not delete CVE' });
  }
});

module.exports = router;