#!/bin/bash

# Update system
yum update -y

# Install Node.js
curl -sL https://rpm.nodesource.com/setup_16.x | bash -
yum install -y nodejs

# Install Git
yum install -y git

# Create app directory
mkdir -p /home/ec2-user/track-cve
cd /home/ec2-user/track-cve

# Clone the repository 
# IMPORTANT: Replace with your actual GitHub repository URL
git clone https://github.com/Encrypting/track-cve.git .

# Install dependencies
npm install

# Create DynamoDB table
node setup-dynamodb.js

# Set up application to start automatically
cat > /etc/systemd/system/track-cve.service << 'EOL'
[Unit]
Description=CVE Tracker Application
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/track-cve
ExecStart=/usr/bin/node /home/ec2-user/track-cve/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOL

# Enable and start the service
systemctl enable track-cve
systemctl start track-cve

# Ensure proper permissions
chown -R ec2-user:ec2-user /home/ec2-user/track-cve

# Add a message indicating completion
echo "CVE Tracker application setup complete!" > /home/ec2-user/setup-complete.txt