// Load environment variables if available
require('dotenv').config();

module.exports = {
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || 'CVETracker'
};