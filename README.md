# dazzler-web-push

Serverless adaptation of the [Web API (Push Payload) Demo](https://serviceworke.rs/push-payload_demo.html) using **Serverless framework** and **AWS Lambda**

## Requirements

- Node.js 
- AWS Account

## Setup

- Install and authenticate [aws-cli](https://aws.amazon.com/cli/)  
- Install and configure [Serverless](https://serverless.com/)
- Make sure the aws cli default user has at least the following permissions:

AWSLambdaFullAccess, AmazonAPIGatewayPushToCloudWatchLogs, CloudWatchLogsFullAccess, AmazonAPIGatewayAdministrator, IAMReadOnlyAccess, AWSCloudFormationFullAccess, iam:CreateRole, iam:PutRolePolicy", iam:DeleteRole, iam:DeleteRolePolicy

## Deployment

- Clone this repo
- Move to this repo's folder
- Execute 
```
  npm install
  sls deploy
```
- Open `index.html` path

