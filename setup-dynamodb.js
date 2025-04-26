const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
    region: 'us-east-1', // Choose your AWS region
    // For local development, specify credentials here
    // For EC2 deployment, instance role will provide credentials
});

// Initialize DynamoDB client
const dynamoDB = new AWS.DynamoDB();
const tableName = 'CVETracker';

// Function to create the DynamoDB table
async function createTable() {
    const params = {
        TableName: tableName,
        KeySchema: [
            { AttributeName: 'cveId', KeyType: 'HASH' } // Partition key
        ],
        AttributeDefinitions: [
            { AttributeName: 'cveId', AttributeType: 'S' }
        ],
        ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
        }
    };

    try {
        const data = await dynamoDB.createTable(params).promise();
        console.log('Table created successfully:', data);
        return data;
    } catch (error) {
        if (error.code === 'ResourceInUseException') {
            console.log(`Table ${tableName} already exists`);
        } else {
            console.error('Error creating table:', error);
        }
    }
}

// Execute the function
createTable();
