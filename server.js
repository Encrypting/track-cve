const express = require('express');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');
const config = require('./config');
const cveRoutes = require('./routes/cve');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Configure AWS using instance role credentials
AWS.config.update({
  region: config.AWS_REGION
  // No need for access keys as we're using IAM role
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes
app.use('/api/cves', cveRoutes);

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});