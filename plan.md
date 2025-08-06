Of course. Here is the comprehensive Technical Design Document for the **SpecGen AI** application, consolidating all discussed features into a unified development plan.

-----

### **Technical Design Document: SpecGen AI (v2.0)**

  * **Version:** 2.0
  * **Date:** July 28, 2025
  * **Author:** Gemini (Technical Architect)
  * **Status:** Final

### **1. Introduction & Vision**

#### **1.1. Document Purpose**

This document provides the complete technical blueprint for designing, developing, and deploying the SpecGen AI platform. It serves as the single source of truth for the engineering and product teams.

#### **1.2. Application Vision**

SpecGen AI is an intelligent design-acceleration platform for modern software teams. It automates the creation of critical development artifacts, from initial requirements to detailed integration plans. By leveraging generative AI, it empowers Product Owners, Business Analysts, and Developers to translate ideas into structured, actionable documents with unprecedented speed and consistency.

#### **1.3. Core Features**

1.  **EARS Specification Generation:** Converts raw notes into formal EARS requirements.
2.  **User Story Generation:** Transforms concepts into Agile user stories with acceptance criteria.
3.  **API Integration Plan Generation:** Produces a complete technical plan for integrating two systems from a set of EARS specifications.

-----

### **2. System Architecture & Design**

#### **2.1. High-Level Architecture**

The system is a **serverless, event-driven application** hosted on AWS. The architecture is designed for scalability, modularity, and cost-efficiency. A central **AWS Step Functions** workflow acts as a router, directing requests to different AI generation paths based on the user's desired document type. This ensures that simple tasks (like User Story generation) are handled efficiently, while complex tasks (like Integration Plan generation) are orchestrated through a robust, multi-step process.

#### **2.2. Technology Stack**

  * **Frontend:** React.js, AWS Amplify
  * **Authentication:** Amazon Cognito
  * **API Layer:** Amazon API Gateway
  * **Compute & Orchestration:** AWS Lambda (Python 3.11), AWS Step Functions
  * **AI Engine:** Amazon Bedrock (Anthropic Claude 3 Sonnet)
  * **Data Storage:** Amazon DynamoDB, Amazon S3
  * **CI/CD:** AWS CodePipeline

#### **2.3. Data Model (DynamoDB)**

A single, unified `Jobs` table will track all generation tasks.

  * **`Jobs` Table:**
      * `jobId` (Partition Key): String (UUID)
      * `userId` (Global Secondary Index): String (Cognito Sub)
      * `jobName`: String
      * `jobType`: String ('EARS\_SPEC', 'USER\_STORY', 'INTEGRATION\_PLAN')
      * `status`: String ('PENDING', 'COMPLETED', 'FAILED')
      * `s3OutputPath`: String (Path to the final output artifact in S3)
      * `createdAt`: Timestamp

-----

### **3. User Experience (UX) & User Flows**

#### **3.1. Wireframes (Textual Description)**

  * **Dashboard Screen:** The main landing page shows a list of recent jobs (regardless of type). A prominent "Create New Job" button is the primary call to action.

  * **Job Creation Screen:** This is a key screen with conditional logic.

    1.  **Dropdown Selector ("Job Type"):** The user first selects from "EARS Specification," "User Story," or "API Integration Plan."
    2.  **Input Area:** The UI dynamically changes the input prompt based on the selection.
          * For EARS/User Story: "Paste your raw project notes here..."
          * For Integration Plan: "Paste the EARS specifications for the integration here..."
    3.  A "Generate" button submits the form.

  * **Job Results Screen:** This page renders the output dynamically.

      * **For EARS/User Story:** A single-pane Markdown viewer.
      * **For Integration Plan:** A tabbed interface with sections for "Overview & Diagrams," "Code Snippets," and "Project Structure."

#### **3.2. User Flow: Creating an API Integration Plan**

1.  The user logs in and clicks "Create New Job."
2.  On the **Job Creation Screen**, they select "API Integration Plan" from the dropdown.
3.  The input box label updates accordingly. The user pastes in the required EARS specifications.
4.  They click "Generate." The system navigates them to the **Job Results Screen**, which shows a "PENDING" status.
5.  When the job is complete, the page auto-refreshes, and the tabbed interface is populated with the generated content.

-----

### **4. API Specification**

A unified API streamlines backend development and frontend integration.

#### **4.1. Endpoints**

  * `POST /jobs`

      * **Summary:** Creates and initiates a new generation job of any type.
      * **Request Body:**
        ```json
        {
          "jobName": "My First API Integration Plan",
          "jobType": "INTEGRATION_PLAN",
          "inputData": "<The EARS specs as a single string>"
        }
        ```
      * **Response (202 Accepted):**
        ```json
        {
          "jobId": "a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8"
        }
        ```

  * `GET /jobs`

      * **Summary:** Lists all jobs for the authenticated user.

  * `GET /jobs/{jobId}`

      * **Summary:** Retrieves the status and results of a specific job.
      * **Response (200 OK):**
        ```json
        {
          "jobId": "...",
          "jobName": "...",
          "status": "COMPLETED",
          "jobType": "INTEGRATION_PLAN",
          "output": { // The structured output from S3
            "diagrams": { "hld": "...", "lld": "..." },
            "codeSnippets": { "client": "...", "dto": "..." },
            "projectStructure": "..."
          }
        }
        ```

-----

### **5. API Integration (Internal Workflow)**

The core of the backend logic is a master **AWS Step Functions** state machine that routes jobs.

1.  **Start:** The `POST /jobs` Lambda triggers the state machine, passing the `jobId` and `jobType`.
2.  **Choice State (Route by Job Type):**
      * **If** `jobType` is 'EARS\_SPEC' or 'USER\_STORY' **-\>** Go to **Simple Generation State**.
      * **If** `jobType` is 'INTEGRATION\_PLAN' **-\>** Go to **Complex Generation Workflow**.
3.  **Simple Generation State:** A single Lambda task that calls Amazon Bedrock once, formats the Markdown, and saves it to S3.
4.  **Complex Generation Workflow:** The multi-step parallel workflow previously defined for generating diagrams, code, and project structure.
5.  **Final State (Success/Fail):** A final Lambda updates the job status in the DynamoDB `Jobs` table.

-----

### **6. Agile Project Breakdown**

#### **Epic 1: Foundational Platform & User Management**

  * **Feature 1.1: User Authentication:**
      * Task: Configure Amazon Cognito User Pool & Identity Pool.
      * Task: Build frontend login, registration, and session management UI using AWS Amplify.
      * Task: Set up the `Users` table in DynamoDB.
  * **Feature 1.2: Core Backend Setup:**
      * Task: Implement the API Gateway with JWT authorizers.
      * Task: Set up the master Step Functions state machine with the initial Choice state.
      * Task: Configure the `Jobs` DynamoDB table.
      * Task: Set up the initial CI/CD pipeline with AWS CodePipeline.

#### **Epic 2: Standard Document Generation**

  * **Feature 2.1: EARS & User Story Generation:**
      * Task: Implement the "Simple Generation State" Lambda function, including Bedrock prompt engineering for both EARS and User Stories.
      * Task: Build the basic Job Creation UI with the dropdown selector and a simple text input.
      * Task: Implement the `POST /jobs` endpoint to handle these two job types.
      * Task: Build the simple Markdown renderer for the Job Results page.

#### **Epic 3: Advanced Integration Plan Generation**

  * **Feature 3.1: Multi-Step AI Orchestration:**
      * Task: Implement the "Complex Generation Workflow" in Step Functions, including the parallel states and chained AI calls.
      * Task: Develop the Lambda function to consolidate the outputs from the parallel branches.
      * Task: Enhance the `POST /jobs` endpoint to route 'INTEGRATION\_PLAN' jobs correctly.
  * **Feature 3.2: Dynamic Output Rendering:**
      * Task: Build the tabbed UI component for the Job Results page.
      * Task: Add a syntax highlighting library (e.g., Prism.js) for the code snippets tab.
      * Task: Enhance the `GET /jobs/{jobId}` endpoint to return the structured JSON for integration plans.

-----

### **7. Acceptance Criteria**

Of course. Here are the detailed Acceptance Criteria (ACs) for all the features outlined in the technical design document, structured for clarity and testability.

---

### ### Feature 1.1: User Authentication

* **Scenario: Successful New User Registration**
    * **GIVEN** a prospective user is on the registration page
    * **WHEN** they enter a valid email and a compliant password and submit the form
    * **THEN** a new user account must be created in the Amazon Cognito User Pool
    * **AND** they must be automatically logged in and redirected to the application dashboard.

* **Scenario: Successful Existing User Login**
    * **GIVEN** an existing user is on the login page
    * **WHEN** they enter their correct email and password
    * **THEN** they must be successfully authenticated
    * **AND** they must be redirected to the application dashboard.

* **Scenario: Failed Login Attempt**
    * **GIVEN** a user is on the login page
    * **WHEN** they enter an incorrect password for a valid email address
    * **THEN** an error message "Invalid email or password" must be displayed
    * **AND** they must remain on the login page.

---

### ### Feature 2.1: EARS & User Story Generation

* **Scenario: Successful EARS Specification Job**
    * **GIVEN** a logged-in user is on the "Create New Job" page
    * **WHEN** they select "EARS Specification" as the job type, provide valid input notes, and submit the job
    * **THEN** a new job with type `EARS_SPEC` and status `PENDING` must be created in the `Jobs` table
    * **AND** upon completion, the job status must update to `COMPLETED`
    * **AND** the generated output in S3 must be a Markdown file containing valid EARS syntax.

* **Scenario: Successful User Story Job**
    * **GIVEN** a logged-in user is on the "Create New Job" page
    * **WHEN** they select "User Story" as the job type, provide valid input notes, and submit the job
    * **THEN** a new job with type `USER_STORY` and status `PENDING` must be created in the `Jobs` table
    * **AND** upon completion, the job status must update to `COMPLETED`
    * **AND** the generated output in S3 must be a Markdown file containing user stories in the `As a..., I want..., so that...` format with corresponding acceptance criteria.

---

### ### Feature 3.1: Multi-Step AI Orchestration

* **Scenario: Correct Workflow Routing**
    * **GIVEN** a new job is submitted via the `POST /jobs` endpoint
    * **WHEN** the `jobType` is `INTEGRATION_PLAN`
    * **THEN** the master Step Functions state machine must execute its "Complex Generation Workflow" path.

* **Scenario: Graceful Workflow Failure**
    * **GIVEN** the "Complex Generation Workflow" is executing for a job
    * **WHEN** an unrecoverable error occurs in one of the AI generation steps (e.g., Bedrock API failure)
    * **THEN** the Step Functions execution must terminate gracefully
    * **AND** the corresponding job's `status` in the `Jobs` table must be updated to `FAILED` with a relevant error note.

---

### ### Feature 3.2: Dynamic Output Rendering

* **Scenario: Viewing a Completed Integration Plan**
    * **GIVEN** a job with `jobType` `INTEGRATION_PLAN` has a status of `COMPLETED`
    * **WHEN** the user navigates to that job's results page
    * **THEN** the UI must display a tabbed interface containing the tabs: "Overview & Diagrams," "Code Snippets," and "Project Structure."

* **Scenario: Viewing Content within Tabs**
    * **GIVEN** the results for a completed Integration Plan are displayed
    * **WHEN** the user clicks the "Code Snippets" tab
    * **THEN** the content area must display the generated code with correct syntax highlighting and a "Copy" button for each snippet.

* **Scenario: Viewing a Pending Job**
    * **GIVEN** a job has a status of `PENDING`
    * **WHEN** the user navigates to that job's results page
    * **THEN** the UI must display a loading indicator and a status message (e.g., "Your plan is being generated...") instead of the tabbed results view.