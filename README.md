
# CVE Tracker Application

A simple web application for tracking Common Vulnerabilities and Exposures (CVEs). This application allows users to add, view, and delete CVE entries, storing them in an AWS DynamoDB database.

## Team

- **Joe O'Brien**
- **Damian Ramirez**
## Architecture

- **Frontend**: HTML, CSS, JavaScript with Bootstrap
- **Backend**: Node.js with Express
- **Database**: AWS DynamoDB
- **Hosting**: AWS EC2 instance

## Project Structure

```
cve-tracker/
├── public/
│   ├── index.html      # Frontend HTML
│   ├── app.js          # Frontend JavaScript
├── server.js           # Express server and API
├── setup-dynamodb.js   # Script to create DynamoDB table
├── package.json        # Project dependencies
├── ec2-user-data.sh    # EC2 instance setup script
```

## Deployment Instructions

### Step 1: Set Up DynamoDB

1. Go to the AWS Management Console and navigate to the DynamoDB service.
2. Click "Create table" and use the following settings:
   - Table name: `CVETracker`
   - Primary key: `cveId` (string)
   - Use default settings for everything else
3. Click "Create" to create the table.

### Step 2: Create an IAM Role for EC2

1. Navigate to the IAM service in the AWS Management Console.
2. Go to Roles and click "Create role".
3. Select "AWS service" as the trusted entity and "EC2" as the use case.
4. Add the following permissions policies:
   - `AmazonDynamoDBFullAccess` (for simplicity in this example; in production, use more restrictive permissions)
5. Name the role `CVETrackerEC2Role` and create it.

### Step 3: Create Security Group

1. Navigate to the EC2 service in the AWS Management Console.
2. Go to Security Groups and click "Create security group".
3. Add a name, description, and select the default VPC.
4. Add the following Inbound Rules

| Type       | Protocol | Port Range | Source          | Description        |
| ---------- | -------- | ---------- | --------------- | ------------------ |
| SSH        | TCP      | 22         | Your IP address | Admin Access       |
| Custom TCP | TCP      | 3000       | 0.0.0.0/0       | Application Access |

### Step 3: Launch EC2 Instance

1. Navigate to the EC2 service in the AWS Management Console.
2. Click "Launch Instance".
3. Choose Amazon Linux 2 AMI.
4. In "Instance Type" select t2.micro instance type (free tier eligible).
5. In "Key Pair" Select an existing key pair.
6. Choose "Select existing security group" in "Network Settings" and choose the group from Step 3.
7. Go to "Advance Details" and do the following:
   - IAM instance profile: Select the `CVETrackerEC2Role` created earlier
   - User data: Upload `ec2-user-data.sh` file or copy and paste its contents
8. Review and launch the instance.

### Step 4: Access the Application

1. Once the instance is running, find its Public IPv4 address in the EC2 Management Console.
2. Open a web browser and navigate to `http://<your-instance-public-ip>:3000`.
3. You should see the CVE Tracker application running.
