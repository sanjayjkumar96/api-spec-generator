import React, { useState } from 'react'
import { BookOpen, Copy, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string
  content: string
  jobType: 'EARS_SPEC' | 'USER_STORY' | 'INTEGRATION_PLAN'
  category: string
}

interface PromptTemplatesProps {
  selectedJobType: 'EARS_SPEC' | 'USER_STORY' | 'INTEGRATION_PLAN'
  onTemplateSelect: (content: string) => void
  className?: string
}

const templates: Template[] = [
  // EARS Specification Templates
  {
    id: 'ears-web-app',
    name: 'Web Application System',
    description: 'Template for web application requirements',
    category: 'Web Development',
    jobType: 'EARS_SPEC',
    content: `The system shall provide a web-based application that allows [USER_TYPE] to [PRIMARY_FUNCTION].

Functional Requirements:
- The system shall authenticate users using [AUTH_METHOD]
- The system shall allow users to [CORE_FUNCTIONALITY_1]
- The system shall provide [DATA_MANAGEMENT_FEATURES]
- The system shall generate [REPORTING_FEATURES]

Performance Requirements:
- The system shall respond to user requests within 2 seconds
- The system shall support up to [NUMBER] concurrent users
- The system shall maintain 99.9% availability

Security Requirements:
- The system shall encrypt all data in transit using TLS 1.3
- The system shall implement role-based access control
- The system shall log all user activities for audit purposes

Please replace the bracketed placeholders with your specific requirements.`
  },
  {
    id: 'ears-api-system',
    name: 'API System',
    description: 'Template for API-based system requirements',
    category: 'API Development',
    jobType: 'EARS_SPEC',
    content: `The system shall provide a RESTful API that enables [CLIENT_APPLICATIONS] to [PRIMARY_PURPOSE].

API Requirements:
- The system shall expose endpoints for [RESOURCE_MANAGEMENT]
- The system shall return responses in JSON format
- The system shall implement OpenAPI 3.0 specification
- The system shall provide versioning through URL path (e.g., /v1/, /v2/)

Authentication & Authorization:
- The system shall authenticate API clients using [JWT/OAuth2/API_KEY]
- The system shall authorize requests based on client permissions
- The system shall rate limit requests to prevent abuse

Data Requirements:
- The system shall validate all input data according to defined schemas
- The system shall sanitize input to prevent injection attacks
- The system shall maintain data consistency across operations

Error Handling:
- The system shall return appropriate HTTP status codes
- The system shall provide detailed error messages in responses
- The system shall log errors for monitoring and debugging`
  },
  {
    id: 'ears-mobile-app',
    name: 'Mobile Application',
    description: 'Template for mobile app requirements',
    category: 'Mobile Development',
    jobType: 'EARS_SPEC',
    content: `The system shall provide a mobile application for [iOS/Android/Cross-platform] that allows users to [PRIMARY_FUNCTION] on their mobile devices.

User Interface Requirements:
- The system shall provide an intuitive touch-based interface
- The system shall support both portrait and landscape orientations
- The system shall be responsive across different screen sizes
- The system shall follow [iOS Human Interface Guidelines/Material Design] principles

Offline Functionality:
- The system shall allow users to [OFFLINE_CAPABILITIES] when disconnected
- The system shall synchronize data when connectivity is restored
- The system shall cache frequently accessed data locally

Performance Requirements:
- The system shall launch within 3 seconds on average devices
- The system shall minimize battery consumption through efficient algorithms
- The system shall optimize network usage to reduce data costs

Integration Requirements:
- The system shall integrate with device capabilities: [camera, GPS, push notifications, etc.]
- The system shall connect to backend services via secure APIs
- The system shall support deep linking for navigation`
  },

  // User Story Templates
  {
    id: 'user-story-ecommerce',
    name: 'E-commerce Platform',
    description: 'User stories for online shopping platform',
    category: 'E-commerce',
    jobType: 'USER_STORY',
    content: `Epic: Online Shopping Experience

User Story 1: Product Discovery
As a customer, I want to search and filter products so that I can quickly find items I'm interested in purchasing.

Acceptance Criteria:
- Given I am on the homepage, when I enter a search term, then I should see relevant products
- Given I am viewing search results, when I apply filters (price, category, brand), then results should update accordingly
- Given I am browsing products, when I click on a product, then I should see detailed product information

User Story 2: Shopping Cart Management
As a customer, I want to add items to my cart and modify quantities so that I can purchase multiple items in one transaction.

Acceptance Criteria:
- Given I am viewing a product, when I click "Add to Cart", then the item should be added to my cart
- Given I have items in my cart, when I change quantities, then the total should update automatically
- Given I am in my cart, when I remove an item, then it should be removed from my cart and totals updated

User Story 3: Secure Checkout
As a customer, I want to complete my purchase securely so that I can receive my ordered items.

Acceptance Criteria:
- Given I have items in my cart, when I proceed to checkout, then I should be able to enter shipping information
- Given I am at checkout, when I enter payment information, then it should be processed securely
- Given my payment is successful, when the transaction completes, then I should receive an order confirmation`
  },
  {
    id: 'user-story-cms',
    name: 'Content Management System',
    description: 'User stories for content management platform',
    category: 'Content Management',
    jobType: 'USER_STORY',
    content: `Epic: Content Creation and Management

User Story 1: Content Creation
As a content creator, I want to create and edit articles with rich formatting so that I can publish engaging content for my audience.

Acceptance Criteria:
- Given I am logged in as a content creator, when I click "New Article", then I should see an editor interface
- Given I am in the editor, when I format text (bold, italic, headers), then the formatting should be applied
- Given I am creating content, when I insert images or media, then they should be embedded properly
- Given I finish editing, when I save as draft, then my work should be preserved

User Story 2: Content Publishing
As a content creator, I want to schedule and publish articles so that my content goes live at optimal times.

Acceptance Criteria:
- Given I have a completed article, when I click "Publish", then it should go live immediately
- Given I want to schedule content, when I set a future date/time, then it should publish automatically
- Given I publish an article, when it goes live, then it should be accessible to readers
- Given I need to make changes, when I edit published content, then updates should be reflected immediately

User Story 3: Content Analytics
As a content creator, I want to view analytics for my articles so that I can understand audience engagement.

Acceptance Criteria:
- Given I have published articles, when I view analytics, then I should see page views, time spent, and engagement metrics
- Given I want to compare performance, when I select date ranges, then metrics should update accordingly
- Given I want insights, when I view detailed analytics, then I should see traffic sources and user behavior`
  },

  // Integration Plan Templates
  {
    id: 'integration-payment',
    name: 'Payment Gateway Integration',
    description: 'Template for payment system integration',
    category: 'Payment Systems',
    jobType: 'INTEGRATION_PLAN',
    content: `Payment Gateway Integration Plan

Objective: Integrate [Stripe/PayPal/Square] payment processing into the existing application to handle secure payment transactions.

Technical Requirements:
- Programming Language: [Node.js/Python/Java/etc.]
- Framework: [Express/Django/Spring Boot/etc.]
- Database: [PostgreSQL/MySQL/MongoDB/etc.]
- Frontend: [React/Vue/Angular/etc.]

Integration Architecture:
1. Client-side payment form with secure token collection
2. Server-side payment processing with webhook handling
3. Database integration for transaction storage
4. Error handling and retry mechanisms

API Endpoints Required:
- POST /payments/create-intent - Initialize payment
- POST /payments/confirm - Confirm payment
- POST /webhooks/payment - Handle payment events
- GET /payments/:id - Retrieve payment status

Security Considerations:
- PCI DSS compliance requirements
- Secure token handling (never store card details)
- Webhook signature verification
- SSL/TLS encryption for all communications

Testing Strategy:
- Unit tests for payment processing logic
- Integration tests with sandbox environment
- End-to-end testing of payment flows
- Error scenario testing (declined cards, network issues)

Monitoring and Logging:
- Payment success/failure rates
- Transaction processing times
- Webhook delivery status
- Error alerting and notification`
  },
  {
    id: 'integration-auth',
    name: 'Authentication Service Integration',
    description: 'Template for authentication system integration',
    category: 'Authentication',
    jobType: 'INTEGRATION_PLAN',
    content: `Authentication Service Integration Plan

Objective: Integrate [Auth0/AWS Cognito/Firebase Auth] for user authentication and authorization in the application.

Current System Analysis:
- Existing user management: [Description]
- Current authentication method: [Session-based/Basic/None]
- Authorization requirements: [Roles, permissions, etc.]

Integration Approach:
1. Replace existing authentication with OAuth 2.0/OpenID Connect
2. Implement JWT token-based authentication
3. Add role-based access control (RBAC)
4. Migrate existing user data if needed

Technical Implementation:
Frontend Changes:
- Install authentication SDK/library
- Implement login/logout flows
- Add protected route components
- Handle token refresh automatically

Backend Changes:
- Add JWT middleware for route protection
- Implement user role validation
- Create user profile management endpoints
- Add authentication-required decorators/middleware

API Security:
- Validate JWT tokens on protected endpoints
- Implement proper CORS configuration
- Add rate limiting for authentication endpoints
- Secure password reset and email verification flows

Migration Strategy:
1. Set up authentication service in parallel
2. Create user migration scripts
3. Implement gradual rollout with feature flags
4. Provide fallback authentication during transition

Testing and Validation:
- Authentication flow testing
- Token expiration and refresh testing
- Role-based access testing
- Security penetration testing`
  },
  {
    id: 'integration-database',
    name: 'Database Integration',
    description: 'Template for database system integration',
    category: 'Database Systems',
    jobType: 'INTEGRATION_PLAN',
    content: `Database Integration Plan

Objective: Integrate [PostgreSQL/MySQL/MongoDB] database system with the existing application for improved data management and scalability.

Current State Analysis:
- Existing data storage: [File-based/SQLite/Other]
- Data volume: [Estimated records, growth rate]
- Performance requirements: [Queries per second, response time]
- Backup and recovery needs: [RTO, RPO requirements]

Database Design:
- Schema design and normalization
- Index strategy for query optimization
- Partitioning strategy for large tables
- Foreign key constraints and relationships

Integration Architecture:
1. Database server setup and configuration
2. Connection pooling implementation
3. ORM/Query builder integration
4. Migration and seeding scripts

Technical Implementation:
Data Access Layer:
- Install database drivers and ORM
- Create database connection configuration
- Implement repository pattern for data access
- Add query optimization and caching

Migration Strategy:
- Create database migration scripts
- Implement data transformation logic
- Plan for zero-downtime migration
- Create rollback procedures

Performance Optimization:
- Query optimization and indexing
- Connection pooling configuration
- Caching strategy implementation
- Database monitoring and alerting

Backup and Recovery:
- Automated backup scheduling
- Point-in-time recovery setup
- Disaster recovery procedures
- Regular backup testing

Security Measures:
- Database user permissions
- Encryption at rest and in transit
- SQL injection prevention
- Database audit logging`
  }
]

export const PromptTemplates: React.FC<PromptTemplatesProps> = ({
  selectedJobType,
  onTemplateSelect,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  const filteredTemplates = templates.filter(template => template.jobType === selectedJobType)
  const categories = ['All', ...new Set(filteredTemplates.map(t => t.category))]
  const displayTemplates = selectedCategory === 'All' 
    ? filteredTemplates 
    : filteredTemplates.filter(t => t.category === selectedCategory)

  const handleCopy = async (content: string, templateId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(templateId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Failed to copy template:', error)
    }
  }

  const handleUseTemplate = (content: string) => {
    onTemplateSelect(content)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
      >
        <BookOpen className="h-4 w-4" />
        <span>Use Template</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900 mb-2">Choose a Template</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {displayTemplates.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No templates available for this job type
              </div>
            ) : (
              <div className="p-2">
                {displayTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {template.name}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {template.description}
                        </p>
                        <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded mt-2">
                          {template.category}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded p-2 mb-3 max-h-32 overflow-y-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                        {template.content.substring(0, 200)}...
                      </pre>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleUseTemplate(template.content)}
                        className="flex-1 px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                      >
                        Use Template
                      </button>
                      <button
                        onClick={() => handleCopy(template.content, template.id)}
                        className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors flex items-center space-x-1"
                      >
                        {copiedId === template.id ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        <span>{copiedId === template.id ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}