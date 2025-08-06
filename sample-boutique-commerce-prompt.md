# Sample API Integration Prompt: Boutique Commerce Platform

## Overview
This document provides a sample prompt for generating an API integration plan for a small-scale boutique shop's online commerce platform.

---

## Sample Prompt for API Integration Plan

### EARS Specifications for Boutique Commerce Integration

**Business Context:**
Bella's Boutique is a small fashion retailer looking to integrate their existing inventory management system with a new e-commerce platform. They need to handle online orders, inventory synchronization, payment processing, and customer management across multiple channels.

**Current System:**
- Legacy inventory system (SQL Server database)
- Physical POS system (Square Terminal)
- Manual order processing via email/phone
- Excel-based customer tracking
- No current e-commerce presence

**Integration Requirements:**

#### 1. E-commerce Platform Integration
The system shall provide a RESTful API that enables the boutique's new Shopify store to synchronize with the existing inventory management system in real-time.

**Functional Requirements:**
- The system shall sync product information (SKU, price, description, availability) between inventory system and Shopify every 15 minutes
- The system shall update inventory levels when orders are placed through any channel (online, in-store, phone)
- The system shall handle product variants (size, color) with separate inventory tracking
- The system shall support bulk product import/export via CSV files
- The system shall maintain product images and descriptions in both systems

#### 2. Payment Processing Integration
The system shall integrate Stripe payment processing with the e-commerce platform to handle secure online transactions.

**Functional Requirements:**
- The system shall process credit card payments through Stripe API
- The system shall handle payment webhooks for order status updates
- The system shall support partial refunds and order cancellations
- The system shall calculate taxes based on customer shipping address
- The system shall apply discount codes and promotional pricing
- The system shall store transaction records for accounting purposes

#### 3. Order Management Workflow
The system shall provide a unified order management system that consolidates orders from all sales channels.

**Functional Requirements:**
- The system shall receive orders from Shopify and create corresponding records in the inventory system
- The system shall generate picking lists for warehouse staff
- The system shall update order status (pending, processing, shipped, delivered)
- The system shall send automated email notifications to customers for status changes
- The system shall integrate with shipping carriers (UPS, FedEx, USPS) for tracking
- The system shall handle returns and exchanges with inventory adjustments

#### 4. Customer Data Management
The system shall synchronize customer information across all platforms while maintaining data privacy compliance.

**Functional Requirements:**
- The system shall create unified customer profiles from multiple touchpoints
- The system shall track customer purchase history and preferences
- The system shall segment customers for targeted marketing campaigns
- The system shall manage customer loyalty points and rewards
- The system shall handle customer service inquiries and support tickets
- The system shall comply with GDPR and CCPA privacy requirements

#### 5. Inventory Management Integration
The system shall maintain accurate inventory levels across all sales channels to prevent overselling.

**Functional Requirements:**
- The system shall track inventory by location (warehouse, store floor, online)
- The system shall reserve inventory for pending orders
- The system shall generate low-stock alerts for reordering
- The system shall handle inventory transfers between locations
- The system shall support seasonal inventory planning and forecasting
- The system shall integrate with supplier systems for automated reordering

#### 6. Analytics and Reporting Integration
The system shall provide comprehensive business intelligence and reporting capabilities.

**Functional Requirements:**
- The system shall generate daily, weekly, and monthly sales reports
- The system shall track key performance indicators (conversion rate, average order value, customer lifetime value)
- The system shall provide inventory turnover and profitability analysis
- The system shall integrate with Google Analytics for e-commerce tracking
- The system shall export data to accounting software (QuickBooks)
- The system shall create automated executive dashboards

**Performance Requirements:**
- The system shall respond to API requests within 2 seconds under normal load
- The system shall support up to 50 concurrent users during peak hours
- The system shall maintain 99.5% uptime during business hours
- The system shall process up to 100 orders per hour during sales events
- The system shall handle inventory updates within 5 minutes of transaction completion

**Security Requirements:**
- The system shall encrypt all payment data using PCI DSS standards
- The system shall implement OAuth 2.0 for API authentication
- The system shall use HTTPS for all data transmission
- The system shall log all system access and changes for audit purposes
- The system shall implement role-based access control for staff members
- The system shall backup all data daily with 30-day retention

**Integration Constraints:**
- Budget limit of $15,000 for development and first-year operational costs
- Must integrate with existing Square POS system without replacing hardware
- Development timeline of 12 weeks from project start to go-live
- Must support mobile-responsive design for on-the-go management
- Requires minimal technical maintenance (small business owner managed)

**Technical Stack Preferences:**
- Cloud-hosted solution (AWS or similar)
- Node.js/TypeScript for API development
- React for admin dashboard
- PostgreSQL for transactional data
- Redis for caching and session management
- Automated deployment and monitoring

**Success Criteria:**
- Reduce manual order processing time by 80%
- Achieve inventory accuracy of 98% or higher
- Enable online sales launch within 3 months
- Support 200% business growth over next 2 years
- Reduce accounting reconciliation time by 60%

---

## Expected Integration Plan Output

When using this prompt, the system should generate:

1. **Executive Summary** - Business case and ROI analysis
2. **System Architecture** - High-level and detailed technical diagrams
3. **API Specifications** - Complete OpenAPI documentation with examples
4. **Security Implementation** - Authentication, authorization, and compliance measures
5. **Error Handling** - Resilience patterns and failure recovery procedures
6. **Testing Strategy** - Unit, integration, and user acceptance testing plans
7. **Deployment Guide** - Step-by-step deployment and configuration instructions
8. **Monitoring Setup** - Performance monitoring and alerting configuration
9. **Performance Optimization** - Scalability and caching strategies
10. **Risk Assessment** - Identified risks and mitigation strategies
11. **Implementation Timeline** - Detailed project plan with milestones
12. **Code Templates** - Production-ready code examples for all integrations
13. **Project Structure** - Complete application architecture and organization

---

## Usage Instructions

1. Copy the EARS specifications section above
2. Paste into the API Integration Plan job type in your application
3. Adjust business context, technical requirements, and constraints as needed
4. Generate the comprehensive integration plan
5. Use the output as a foundation for your boutique commerce development project

This sample demonstrates the level of detail and specificity needed to generate high-quality, actionable integration plans for real-world e-commerce scenarios.