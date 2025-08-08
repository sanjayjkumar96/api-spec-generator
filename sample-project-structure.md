## Project Structure and Implementation Guide

### Project Overview

This project aims to create a Salesforce Integration Platform using AWS Serverless Services with Node.js, TypeScript, and Express. The platform will facilitate CRUD operations on Salesforce Health Cloud objects via a React frontend. It will use `jsforce` for Salesforce integration, supporting both simple and complex requests (composite and batch requests). The system will allow patients to enroll in specific care programs, validate enrollments, and manage appointments and medication requests.

### Project Structure

```
salesforce-integration-platform/
â”œâ”€â”€ backend/
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ controllers/
â”‚   â”‚   â”œâ”€â”€ models/
â”‚   â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â”œâ”€â”€ utils/
â”‚   â”‚   â”œâ”€â”€ config/
â”‚   â”‚   â”œâ”€â”€ lambdas/
â”‚   â”‚   â”œâ”€â”€ index.ts
â”‚   â”‚   â””â”€â”€ serverless.yml
â”‚   â””â”€â”€ package.json
â”œâ”€â”€ frontend/
â”‚   â”œâ”€â”€ public/
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ pages/
â”‚   â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â”œâ”€â”€ App.tsx
â”‚   â”‚   â””â”€â”€ index.tsx
â”‚   â””â”€â”€ package.json
â”œâ”€â”€ infrastructure/
â”‚   â”œâ”€â”€ main.tf
â”‚   â”œâ”€â”€ variables.tf
â”‚   â”œâ”€â”€ outputs.tf
â”‚   â””â”€â”€ modules/
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ architecture.md
â”‚   â”œâ”€â”€ adr/
â”‚   â””â”€â”€ api-docs.md
â””â”€â”€ README.md
```

### Backend Implementation

#### 1. Environment Setup

- **Node.js and TypeScript**: Ensure Node.js and TypeScript are installed.
- **AWS CLI**: Install and configure AWS CLI.
- **Serverless Framework**: Install the Serverless Framework globally.

#### 2. Backend Directory Structure

```
backend/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ controllers/               # API controllers
â”‚   â”œâ”€â”€ models/                    # Data models
â”‚   â”œâ”€â”€ services/                  # Business logic services
â”‚   â”œâ”€â”€ utils/                     # Utility functions
â”‚   â”œâ”€â”€ config/                    # Configuration files
â”‚   â”œâ”€â”€ lambdas/                   # AWS Lambda functions
â”‚   â”œâ”€â”€ index.ts                   # Entry point
â”‚   â””â”€â”€ serverless.yml             # Serverless configuration
â””â”€â”€ package.json
```

#### 3. Controllers

Create controllers for handling API requests.

```typescript
// src/controllers/patientController.ts
import { APIGatewayEvent, Context, APIGatewayProxyResult } from 'aws-lambda';
import { enrollPatient, validateEnrollment, createAccount, sendOTP } from '../services/patientService';

export const enrollPatientHandler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const patientData = JSON.parse(event.body || '{}');
    const result = await enrollPatient(patientData);
    return {
        statusCode: 200,
        body: JSON.stringify(result),
    };
};

export const validateEnrollmentHandler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const enrollmentId = event.pathParameters?.id;
    const result = await validateEnrollment(enrollmentId);
    return {
        statusCode: 200,
        body: JSON.stringify(result),
    };
};

export const createAccountHandler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const enrollmentId = event.pathParameters?.id;
    const result = await createAccount(enrollmentId);
    return {
        statusCode: 200,
        body: JSON.stringify(result),
    };
};

export const sendOTPHandler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const accountId = event.pathParameters?.id;
    const result = await sendOTP(accountId);
    return {
        statusCode: 200,
        body: JSON.stringify(result),
    };
};
```

#### 4. Services

Implement business logic in services.

```typescript
// src/services/patientService.ts
import * as jsforce from 'jsforce';
import * as nodemailer from 'nodemailer';

const conn = new jsforce.Connection({
    loginUrl: process.env.SF_LOGIN_URL,
});

export const enrollPatient = async (patientData: any) => {
    await conn.login(process.env.SF_USERNAME, process.env.SF_PASSWORD);
    const result = await conn.sobject('Patient__c').create(patientData);
    return result;
};

export const validateEnrollment = async (enrollmentId: string) => {
    await conn.login(process.env.SF_USERNAME, process.env.SF_PASSWORD);
    const result = await conn.sobject('Enrollment__c').update(enrollmentId, { Status__c: 'Validated' });
    return result;
};

export const createAccount = async (enrollmentId: string) => {
    await conn.login(process.env.SF_USERNAME, process.env.SF_PASSWORD);
    const enrollment = await conn.sobject('Enrollment__c').retrieve(enrollmentId);
    const accountData = {
        Name: enrollment.Patient__r.Name,
        EnrollmentId__c: enrollmentId,
    };
    const result = await conn.sobject('Account').create(accountData);
    return result;
};

export const sendOTP = async (accountId: string) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'patient@example.com',
        subject: 'Your OTP for Login',
        text: `Your OTP is ${otp}`,
    };
    await transporter.sendMail(mailOptions);
    return { otp, accountId };
};
```

#### 5. Serverless Configuration

Configure Serverless to deploy AWS Lambda functions.

```yaml
# serverless.yml
service: salesforce-integration

provider:
  name: aws
  runtime: nodejs14.x
  environment:
    SF_LOGIN_URL: ${env:SF_LOGIN_URL}
    SF_USERNAME: ${env:SF_USERNAME}
    SF_PASSWORD: ${env:SF_PASSWORD}
    EMAIL_USER: ${env:EMAIL_USER}
    EMAIL_PASS: ${env:EMAIL_PASS}

functions:
  enrollPatient:
    handler: src/lambdas/enrollPatient.enrollPatientHandler
    events:
      - http:
          path: patients/enroll
          method: post
  validateEnrollment:
    handler: src/lambdas/validateEnrollment.validateEnrollmentHandler
    events:
      - http:
          path: patients/validate/{id}
          method: put
  createAccount:
    handler: src/lambdas/createAccount.createAccountHandler
    events:
      - http:
          path: patients/account/{id}
          method: post
  sendOTP:
    handler: src/lambdas/sendOTP.sendOTPHandler
    events:
      - http:
          path: patients/otp/{id}
          method: post
```

### Frontend Implementation

#### 1. Environment Setup

- **Node.js**: Ensure Node.js is installed.
- **Create React App**: Use `create-react-app` to bootstrap the project.

#### 2. Frontend Directory Structure

```
frontend/
â”œâ”€â”€ public/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ components/                # Reusable components
â”‚   â”œâ”€â”€ pages/                     # Page components
â”‚   â”œâ”€â”€ services/                  # API services
â”‚   â”œâ”€â”€ App.tsx                    # Main App component
â”‚   â””â”€â”€ index.tsx                  # Entry point
â””â”€â”€ package.json
```

#### 3. API Services

Create services to interact with the backend API.

```typescript
// src/services/api.ts
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

export const enrollPatient = async (patientData: any) => {
    const response = await axios.post(`${API_URL}/patients/enroll`, patientData);
    return response.data;
};

export const validateEnrollment = async (enrollmentId: string) => {
    const response = await axios.put(`${API_URL}/patients/validate/${enrollmentId}`);
    return response.data;
};

export const createAccount = async (enrollmentId: string) => {
    const response = await axios.post(`${API_URL}/patients/account/${enrollmentId}`);
    return response.data;
};

export const sendOTP = async (accountId: string) => {
    const response = await axios.post(`${API_URL}/patients/otp/${accountId}`);
    return response.data;
};
```

#### 4. Pages and Components

Create pages and components for the frontend.

```typescript
// src/pages/EnrollmentPage.tsx
import React, { useState } from 'react';
import { enrollPatient } from '../services/api';

const EnrollmentPage = () => {
    const [patientData, setPatientData] = useState({ name: '', email: '' });

    const handleEnroll = async () => {
        const result = await enrollPatient(patientData);
        console.log(result);
    };

    return (
        <div>
            <h1>Enroll in Care Program</h1>
            <input
                type="text"
                placeholder="Name"
                value={patientData.name}
                onChange={(e) => setPatientData({ ...patientData, name: e.target.value })}
            />
            <input
                type="email"
                placeholder="Email"
                value={patientData.email}
                onChange={(e) => setPatientData({ ...patientData, email: e.target.value })}
            />
            <button onClick={handleEnroll}>Enroll</button>
        </div>
    );
};

export default EnrollmentPage;
```

### Infrastructure as Code

#### 1. Terraform Configuration

Use Terraform to provision AWS resources.

```hcl
# infrastructure/main.tf
provider "aws" {
  region = var.region
}

resource "aws_lambda_function" "enroll_patient" {
  function_name = "enrollPatient"
  handler = "src/lambdas/enrollPatient.enrollPatientHandler"
  role = aws_iam_role.lambda_exec.arn
  runtime = "nodejs14.x"
  filename = "backend/dist/lambdas/enrollPatient.zip"
}

resource "aws_iam_role" "lambda_exec" {
  name = "lambda_exec_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com",
        },
      },
    ],
  })
}

resource "aws_api_gateway_rest_api" "api" {
  name = "salesforce-integration-api"
  description = "API for Salesforce Integration"
}

# Additional resources and configurations...
```

### Documentation

#### 1. Architecture Decision Records (ADRs)

Document key architectural decisions.

```markdown
# Architecture Decision Record: Salesforce Integration Platform

## Status
Accepted

## Context
We need to integrate with Salesforce Health Cloud to manage patient enrollments, accounts, and appointments.

## Decision
Use AWS Serverless Services with Node.js, TypeScript, and Express for the backend. Use React for the frontend. Integrate with Salesforce using `jsforce`.

## Consequences
- Scalable and cost-effective backend.
- Easy to maintain and deploy frontend.
- Secure and efficient integration with Salesforce.
```

#### 2. API Documentation

Document API endpoints and their usage.

```markdown
# API Documentation

## Enroll Patient
### POST /patients/enroll
- **Request Body**: `{ "name": "John Doe", "email": "john.doe@example.com" }`
- **Response**: `{ "id": "12345", "status": "enrolled" }`

## Validate Enrollment
### PUT /patients/validate/{id}
- **Path Parameters**: `id` (enrollment ID)
- **Response**: `{ "status": "validated" }`

## Create Account
### POST /patients/account/{id}
- **Path Parameters**: `id` (enrollment ID)
- **Response**: `{ "accountId": "67890", "status": "created" }`

## Send OTP
### POST /patients/otp/{id}
- **Path Parameters**: `id` (account ID)
- **Response**: `{ "otp": "123456", "accountId": "67890" }`
```

### Conclusion

This guide provides a comprehensive structure and implementation details for creating a Salesforce Integration Platform using AWS Serverless Services with Node.js, TypeScript, and Express. The frontend is built with React, and `jsforce` is used for Salesforce integration. The project includes detailed backend and frontend implementations, infrastructure as code using Terraform, and comprehensive documentation.