Of course. As a Technical Architect, I have prepared a detailed Technical Design Document (TDD) for the **SpecGen AI** application. This document covers the vision, architecture, user flows, API specifications, and a full project breakdown for development.

-----

### **Technical Design Document: SpecGen AI**

  * **Version:** 1.0
  * **Date:** July 26, 2025
  * **Author:** Gemini (Technical Architect)
  * **Status:** Draft

### **1. Introduction & Vision**

#### **1.1. Document Purpose**

This document provides a comprehensive technical blueprint for the design and development of the SpecGen AI application. It is intended for project managers, developers, and QA engineers to align on the technical direction, scope, and implementation details.

#### **1.2. Application Vision**

SpecGen AI will be a collaborative, cloud-native platform that empowers Product Owners, Business Analysts, and Developers. It will automate the generation of standardized technical documentation (like EARS requirements and user stories) and provide a curated library of prompts to enhance the effectiveness of AI pair-programming tools, thereby improving productivity, consistency, and quality across the software development lifecycle.

#### **1.3. Target Personas**

  * **Product Owner / Business Analyst:** Primary users of the document generation feature to articulate requirements quickly and consistently.
  * **Developer:** Primary users of the Prompt Library to accelerate coding, testing, and refactoring tasks.

-----

### **2. System Architecture & Design**

#### **2.1. High-Level Architecture (Textual Description)**

The system is designed as a serverless, event-driven application on AWS.

1.  **User Interaction:** A user interacts with the React frontend hosted on **AWS Amplify**.
2.  **Authentication:** **Amazon Cognito** handles all user authentication, providing JWT tokens to the frontend upon successful login.
3.  **API Communication:** The frontend sends API requests with the JWT token to **Amazon API Gateway**.
4.  **Request Handling:** API Gateway routes requests to specific **AWS Lambda** functions based on the endpoint. These Lambdas handle business logic (e.g., CRUD operations on prompts).
5.  **Document Generation Workflow:** For the `/documents` endpoint, the Lambda function initiates an **AWS Step Functions** state machine. This orchestrates the complex, multi-step process of:
      * Validating input.
      * Calling the **Amazon Bedrock** API with a structured prompt.
      * Parsing the AI model's response.
      * Saving the final document to **Amazon S3**.
      * Updating the document's metadata in **Amazon DynamoDB**.
      * Sending a notification via **Amazon SES**.
6.  **Data Storage:**
      * **Amazon DynamoDB:** Stores structured data like user profiles, project metadata, document statuses, and all prompts in the Prompt Library.
      * **Amazon S3:** Stores the generated document artifacts (e.g., `.md` files).

#### **2.2. Technology Stack**

  * **Frontend:** React.js, AWS Amplify UI components
  * **Backend:** AWS Lambda (Node.js/Python), Amazon API Gateway, AWS Step Functions
  * **AI Engine:** Amazon Bedrock (Anthropic Claude V3 Sonnet model)
  * **Database:** Amazon DynamoDB
  * **Storage:** Amazon S3
  * **Authentication:** Amazon Cognito
  * **CI/CD:** AWS CodePipeline, AWS CodeBuild

#### **2.3. Data Model (DynamoDB)**

  * **`Users` Table:**

      * `userId` (Partition Key): String (Cognito Sub)
      * `email`: String
      * `role`: String ('Analyst', 'Developer')
      * `createdAt`: Timestamp

  * **`Documents` Table:**

      * `documentId` (Partition Key): String (UUID)
      * `userId` (Global Secondary Index): String
      * `documentTitle`: String
      * `status`: String ('PENDING', 'COMPLETED', 'FAILED')
      * `s3_path`: String
      * `createdAt`: Timestamp

  * **`Prompts` Table:**

      * `promptId` (Partition Key): String (UUID)
      * `category`: String (e.g., 'Python', 'React', 'Testing')
      * `title`: String
      * `promptText`: String
      * `authorId`: String
      * `createdAt`: Timestamp

-----

### **3. User Experience (UX) & User Flows**

#### **3.1. Wireframes (Textual Description)**

  * **Dashboard Screen:**

      * **Layout:** Header with app logo, user profile dropdown. Main content area with two sections.
      * **Section 1 ("My Recent Documents"):** A list/card view of the 5 most recently generated documents. Each card shows the title, creation date, status, and a "View" button.
      * **Section 2 ("Quick Actions"):** Large buttons for "Generate New Document" and "Browse Prompt Library".

  * **Document Generation Form:**

      * **Layout:** A multi-step form.
      * **Step 1 ("Setup"):** Input fields for "Document Title" and a dropdown for "Document Type" (e.g., EARS Specification, User Stories).
      * **Step 2 ("Content"):** A large text area for the user to input high-level requirements, goals, or context.
      * **Step 3 ("Review"):** Displays a summary of the inputs. A "Generate" button submits the form.

  * **Document View Page:**

      * **Layout:** Header with the document title.
      * **Content Area:** A rich text editor (displaying the Markdown content from S3) that allows for minor edits.
      * **Actions:** "Save Changes" and "Export as PDF/MD" buttons.

  * **Prompt Library Page:**

      * **Layout:** A search bar and category filters at the top.
      * **Content Area:** A list of prompt cards. Each card displays the prompt title, category, and a snippet of the prompt text.
      * **Card Actions:** A "Copy Prompt" button and a "View" button to see the full prompt text and any usage notes.

#### **3.2. User Flow 1: Generating a New Document (BA/PO)**

1.  User logs in and lands on the **Dashboard**.
2.  User clicks "Generate New Document".
3.  User is navigated to the **Document Generation Form**.
4.  User fills in the title, selects "EARS Specification", and pastes their raw notes into the content box.
5.  User clicks "Generate". The system shows a loading indicator and informs the user they will be notified upon completion.
6.  The user receives an email notification with a link.
7.  Clicking the link opens the **Document View Page**, displaying the fully formatted EARS specification.

#### **3.3. User Flow 2: Using the Prompt Library (Developer)**

1.  User logs in and lands on the **Dashboard**.
2.  User clicks "Browse Prompt Library".
3.  User is navigated to the **Prompt Library Page**.
4.  User filters by the "Testing" category.
5.  User finds a prompt titled "Generate Python Pytest for FastAPI endpoint" and clicks the "Copy Prompt" button.
6.  The full prompt text is copied to their clipboard.
7.  The user pastes the prompt into their AI pair-programming tool.

-----

### **4. API Specification (OpenAPI 3.0.x Style)**

```yaml
openapi: 3.0.1
info:
  title: SpecGen AI API
  version: 1.0.0
paths:
  /documents:
    post:
      summary: Create a new document generation job
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                title: { type: string }
                type: { type: string, enum: ['EARS', 'USER_STORY'] }
                rawContent: { type: string }
      responses:
        '202':
          description: Accepted. Generation job started.
          content:
            application/json:
              schema:
                type: object
                properties:
                  documentId: { type: string }
                  status: { type: string, default: 'PENDING' }
    get:
      summary: List all documents for the authenticated user
      security:
        - bearerAuth: []
      responses:
        '200':
          description: A list of documents.
          content:
            application/json:
              schema:
                type: array
                items:
                  # Document schema reference
  /documents/{documentId}:
    get:
      summary: Get a specific document and its content
      security:
        - bearerAuth: []
      parameters:
        - name: documentId
          in: path
          required: true
          schema: { type: string }
      responses:
        '200':
          description: Document details and content.
  /prompts:
    get:
      summary: Get or search for prompts
      security:
        - bearerAuth: []
      parameters:
        - name: category
          in: query
          schema: { type: string }
      responses:
        '200':
          description: A list of prompts.
    post:
      summary: Add a new prompt to the library
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                title: { type: string }
                category: { type: string }
                promptText: { type: string }
      responses:
        '201':
          description: Prompt created successfully.

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

-----

### **5. API Integration: Backend to Amazon Bedrock**

The core AI integration happens within a Lambda function orchestrated by Step Functions.

1.  **Authentication:** The Lambda function's IAM execution role will have `bedrock:InvokeModel` permissions for the specific model ARN (e.g., `anthropic.claude-3-sonnet-20240229-v1:0`).
2.  **Request Payload:** The Lambda will construct a payload for the Bedrock API.
      * **Prompt Engineering:** The user's `rawContent` will be wrapped in a carefully engineered prompt template.
    <!-- end list -->
    ```json
    // Example request payload sent to Bedrock
    {
      "anthropic_version": "bedrock-2023-05-31",
      "max_tokens": 4096,
      "messages": [
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": "You are an expert software architect. Your task is to convert the following raw notes into formal EARS (Easy Approach to Requirements Syntax) specifications. Group them by API, Security, Monitoring, etc. The output must be valid Markdown. \n\nNOTES:\n${userInput.rawContent}"
            }
          ]
        }
      ]
    }
    ```
3.  **Response Handling:** The Lambda will parse the JSON response from Bedrock, extract the generated text from `response.content[0].text`, and perform any necessary final formatting or validation before saving it to S3.
4.  **Error Handling:** If the Bedrock API call fails, the Step Functions state machine will catch the error, log it, update the document status in DynamoDB to 'FAILED', and notify the user.

-----

### **6. Agile Project Breakdown**

#### **Epic 1: Core User & Document Management MVP**

*Description: Establish the foundational capabilities for users to register, log in, and generate their first document.*

  * **Feature 1.1: User Authentication**

      * **Task 1.1.1:** Configure and deploy an Amazon Cognito User Pool.
      * **Task 1.1.2:** Develop the frontend Login, Registration, and Forgot Password pages using AWS Amplify UI Kit.
      * **Task 1.1.3:** Implement JWT token handling on the frontend to authenticate API requests.
      * **Task 1.1.4:** Create the `Users` DynamoDB table to store user profile information.

  * **Feature 1.2: End-to-End Document Generation Workflow**

      * **Task 1.2.1:** Design and implement the AWS Step Functions state machine for the document generation flow.
      * **Task 1.2.2:** Develop the `POST /documents` Lambda function to trigger the Step Functions workflow.
      * **Task 1.2.3:** Develop the Lambda function for Bedrock API integration (prompt engineering, API call).
      * **Task 1.2.4:** Develop the Lambda function for saving the final output to S3 and updating DynamoDB.
      * **Task 1.2.5:** Develop the `GET /documents` and `GET /documents/{documentId}` APIs and corresponding Lambda functions.
      * **Task 1.2.6:** Build the frontend "Document Generation Form" and "Document View" pages.
      * **Task 1.2.7:** Configure Amazon SES for sending completion notifications.

#### **Epic 2: Prompt Engineering Library**

*Description: Build a collaborative library for developers to store, find, and use optimized prompts for AI coding assistants.*

  * **Feature 2.1: View and Search Prompts**

      * **Task 2.1.1:** Design and create the `Prompts` DynamoDB table.
      * **Task 2.1.2:** Develop the `GET /prompts` Lambda function with filtering capabilities.
      * **Task 2.1.3:** Build the frontend "Prompt Library Page" with search and filter UI.
      * **Task 2.1.4:** Populate the library with an initial set of 20 high-quality prompts.

  * **Feature 2.2: Contribute to Prompt Library**

      * **Task 2.2.1:** Develop the `POST /prompts` API and Lambda function for creating new prompts.
      * **Task 2.2.2:** Build the frontend "Add New Prompt" form.
      * **Task 2.2.3:** Implement basic role-based access (e.g., all authenticated users can add prompts).

-----

### **7. Acceptance Criteria**

#### **For Feature 1.2: End-to-End Document Generation Workflow**

  * **Scenario 1: Successful EARS Document Generation**

      * **GIVEN** a Business Analyst is logged in
      * **WHEN** they navigate to the "Generate Document" page, enter "Payment API Specs" as the title, select "EARS Specification" as the type, provide valid requirement notes, and click "Generate"
      * **THEN** the system should create a new entry in the `Documents` table with status 'PENDING'
      * **AND** an email notification should be sent to the user upon completion
      * **AND** the final document status in the `Documents` table should be 'COMPLETED'
      * **AND** the generated Markdown file must be stored in the S3 bucket
      * **AND** the content of the file must be formatted using correct EARS syntax.

  * **Scenario 2: AI Service Fails**

      * **GIVEN** a user has submitted a document for generation
      * **WHEN** the backend fails to get a valid response from the Amazon Bedrock API after retries
      * **THEN** the document status in the `Documents` table should be updated to 'FAILED'
      * **AND** an email notification should be sent to the user informing them of the failure.