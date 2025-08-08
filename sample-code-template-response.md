Certainly! Below is a comprehensive set of code templates and API specifications for creating a Salesforce integration platform using AWS Serverless Services with Node.js, TypeScript, and Express for CRUD operations on Salesforce Health Cloud objects. The frontend will be built using React.

### 1. OpenAPI 3.0 Specification

```yaml
openapi: 3.0.3
info:
  title: Salesforce Health Cloud Integration API
  version: 1.0.0
  description: API for integrating with Salesforce Health Cloud for patient enrollment, account management, and appointment scheduling.
servers:
  - url: https://your-api-gateway.execute-api.region.amazonaws.com/prod
paths:
  /enroll:
    post:
      summary: Enroll a patient in a care program
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/EnrollmentRequest'
      responses:
        '201':
          description: Enrollment request submitted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EnrollmentResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '500':
          $ref: '#/components/responses/InternalServerError'
  /validate-enrollment:
    post:
      summary: Validate an enrollment request
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ValidateEnrollmentRequest'
      responses:
        '200':
          description: Enrollment validated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ValidateEnrollmentResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '500':
          $ref: '#/components/responses/InternalServerError'
  /appointments:
    post:
      summary: Schedule an appointment
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AppointmentRequest'
      responses:
        '201':
          description: Appointment scheduled
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AppointmentResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '500':
          $ref: '#/components/responses/InternalServerError'
  /medications:
    post:
      summary: Request medication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MedicationRequest'
      responses:
        '201':
          description: Medication request submitted
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MedicationResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '500':
          $ref: '#/components/responses/InternalServerError'
components:
  schemas:
    EnrollmentRequest:
      type: object
      required:
        - patientId
        - careProgramId
      properties:
        patientId:
          type: string
        careProgramId:
          type: string
    EnrollmentResponse:
      type: object
      properties:
        enrollmentId:
          type: string
    AppointmentRequest:
      type: object
      required:
        - patientId
        - doctorId
        - date
      properties:
        patientId:
          type: string
        doctorId:
          type: string
        date:
          type: string
          format: date-time
    AppointmentResponse:
      type: object
      properties:
        appointmentId:
          type: string
    MedicationRequest:
      type: object
      required:
        - patientId
        - medicationId
      properties:
        patientId:
          type: string
        medicationId:
          type: string
    MedicationResponse:
      type: object
      properties:
        medicationRequestId:
          type: string
    ValidateEnrollmentRequest:
      type: object
      required:
        - enrollmentId
      properties:
        enrollmentId:
          type: string
    ValidateEnrollmentResponse:
      type: object
      properties:
        accountId:
          type: string
  responses:
    BadRequest:
      description: Bad Request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    InternalServerError:
      description: Internal Server Error
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    ErrorResponse:
      type: object
      properties:
        error:
          type: string
        message:
          type: string
security:
  - BearerAuth: []
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

### 2. TypeScript Interfaces & DTOs

```typescript
// dtos/EnrollmentRequest.ts
export interface EnrollmentRequest {
  patientId: string;
  careProgramId: string;
}

// dtos/EnrollmentResponse.ts
export interface EnrollmentResponse {
  enrollmentId: string;
}

// dtos/AppointmentRequest.ts
export interface AppointmentRequest {
  patientId: string;
  doctorId: string;
  date: Date;
}

// dtos/AppointmentResponse.ts
export interface AppointmentResponse {
  appointmentId: string;
}

// dtos/MedicationRequest.ts
export interface MedicationRequest {
  patientId: string;
  medicationId: string;
}

// dtos/MedicationResponse.ts
export interface MedicationResponse {
  medicationRequestId: string;
}

// dtos/ValidateEnrollmentRequest.ts
export interface ValidateEnrollmentRequest {
  enrollmentId: string;
}

// dtos/ValidateEnrollmentResponse.ts
export interface ValidateEnrollmentResponse {
  accountId: string;
}
```

### 3. API Implementation Templates

```typescript
// controllers/EnrollmentController.ts
import { Request, Response } from 'express';
import { EnrollmentRequest, EnrollmentResponse } from '../dtos';
import { sfConnection } from '../salesforce';

export const enrollPatient = async (req: Request, res: Response) => {
  try {
    const { patientId, careProgramId }: EnrollmentRequest = req.body;
    // Use jsforce to create enrollment record in Salesforce
    const result = await sfConnection.sobject('Enrollment__c').create({
      PatientId__c: patientId,
      CareProgramId__c: careProgramId,
    });
    res.status(201).json({ enrollmentId: result.id } as EnrollmentResponse);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// controllers/ValidationController.ts
import { Request, Response } from 'express';
import { ValidateEnrollmentRequest, ValidateEnrollmentResponse } from '../dtos';
import { sfConnection } from '../salesforce';

export const validateEnrollment = async (req: Request, res: Response) => {
  try {
    const { enrollmentId }: ValidateEnrollmentRequest = req.body;
    // Use jsforce to validate enrollment record in Salesforce
    const enrollment = await sfConnection.sobject('Enrollment__c').retrieve(enrollmentId);
    if (enrollment) {
      // Create account and send OTP
      const accountId = await createAccount(enrollment);
      res.status(200).json({ accountId } as ValidateEnrollmentResponse);
    } else {
      res.status(400).json({ error: 'Enrollment not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// utils/salesforce.ts
import jsforce from 'jsforce';

export const sfConnection = new jsforce.Connection({
  // Your Salesforce OAuth configuration
});

// Example function to create an account
async function createAccount(enrollment: any) {
  // Implement account creation logic
  return 'account-id';
}
```

### 4. Database Integration & Repository Pattern

```typescript
// repositories/EnrollmentRepository.ts
import { Enrollment__c } from '../generated/salesforce';

export class EnrollmentRepository {
  private sfConnection: jsforce.Connection;

  constructor(sfConnection: jsforce.Connection) {
    this.sfConnection = sfConnection;
  }

  public async createEnrollment(patientId: string, careProgramId: string): Promise<string> {
    const result = await this.sfConnection.sobject('Enrollment__c').create({
      PatientId__c: patientId,
      CareProgramId__c: careProgramId,
    });
    return result.id;
  }

  public async getEnrollment(enrollmentId: string): Promise<Enrollment__c | null> {
    return await this.sfConnection.sobject('Enrollment__c').retrieve(enrollmentId);
  }
}
```

### 5. Security Implementation

```typescript
// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET as string, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
      req.body.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};
```

### 6. Testing Templates

```typescript
// tests/EnrollmentController.test.ts
import { enrollPatient } from '../controllers/EnrollmentController';
import { Request, Response } from 'express';

describe('EnrollmentController', () => {
  it('should enroll a patient', async () => {
    const req: Partial<Request> = {
      body: { patientId: 'patient-id', careProgramId: 'care-program-id' },
    };
    const res: Partial<Response> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await enrollPatient(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ enrollmentId: expect.any(String) });
  });
});
```

### 7. Infrastructure & Configuration

#### Dockerfile

```dockerfile
FROM node:14-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
```

#### Kubernetes Deployment Manifest

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: salesforce-integration-api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: salesforce-integration-api
  template:
    metadata:
      labels:
        app: salesforce-integration-api
    spec:
      containers:
        - name: salesforce-integration-api
          image: your-docker-repo/salesforce-integration-api:latest
          ports:
            - containerPort: 3000
          env:
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: jwt-secret
                  key: jwt-secret
            - name: SALESFORCE_USERNAME
              valueFrom:
                secretKeyRef:
                  name: salesforce-credentials
                  key: username
            - name: SALESFORCE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: salesforce-credentials
                  key: password
            - name: SALESFORCE_SECURITY_TOKEN
              valueFrom:
                secretKeyRef:
                  name: salesforce-credentials
                  key: security-token
```

#### Terraform Template

```hcl
provider "aws" {
  region = "us-west-2"
}

resource "aws_lambda_function" "salesforce_integration_api" {
  function_name = "salesforce-integration-api"
  handler       = "index.handler"
  role          = aws_iam_role.lambda_exec.arn
  runtime       = "nodejs14.x"

  source_code_hash = filebase64sha256("dist/index.js")
  s3_bucket        = "your-s3-bucket"
  s3_key           = "dist/index.js"

  environment {
    variables = {
      JWT_SECRET     = var.jwt_secret
      SALESFORCE_USERNAME = var.salesforce_username
      SALESFORCE_PASSWORD = var.salesforce_password
      SALESFORCE_SECURITY_TOKEN = var.salesforce_security_token
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  name = "lambda_exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_role_policy" "lambda_exec_policy" {
  name = "lambda_exec_policy"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Effect = "Allow"
        Resource = "arn:aws:logs:*:*:*"
      },
    ]
  })
}
```

### React Frontend

#### Enrollment Form

```jsx
// components/EnrollmentForm.jsx
import React, { useState } from 'react';
import axios from 'axios';

const EnrollmentForm = () => {
  const [patientId, setPatientId] = useState('');
  const [careProgramId, setCareProgramId] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post('/enroll', { patientId, careProgramId });
      console.log(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Patient ID:</label>
        <input type="text" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
      </div>
      <div>
        <label>Care Program ID:</label>
        <input type="text" value={careProgramId} onChange={(e) => setCareProgramId(e.target.value)} />
      </div>
      <button type="submit">Enroll</button>
    </form>
  );
};

export default EnrollmentForm;
```

This comprehensive set of code templates and API specifications should provide a solid foundation for building a Salesforce integration platform using AWS Serverless Services with Node.js, TypeScript, and Express, along with a React frontend.