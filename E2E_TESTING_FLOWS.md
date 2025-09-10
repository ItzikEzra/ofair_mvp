# OFAIR MVP - End-to-End Testing Flows Documentation

## Overview
This document outlines all expected user flows and test scenarios for the OFAIR MVP platform. The comprehensive E2E test suite validates complete user journeys from registration to transaction completion across all microservices.

## Test Suite Architecture

### Services Under Test
- **Auth Service** (Port 8001): Authentication and authorization
- **Users Service** (Port 8002): User profile management
- **Leads Service** (Port 8003): Lead board and matching
- **Proposals Service** (Port 8004): Proposal management
- **Referrals Service** (Port 8005): Referral system and commissions
- **Payments Service** (Port 8006): B2B commission settlements
- **Notifications Service** (Port 8007): Multi-channel messaging
- **Admin Service** (Port 8008): Platform management

---

## 1. Customer User Flow (`test_customer_flow.py`)

### Test Scenarios
#### 1.1 Customer Registration & Authentication
- **Registration**: Hebrew name validation, Israeli phone format
- **Login**: JWT token generation and validation
- **Expected Results**: 
  - User ID created
  - Hebrew success message: "משתמש נרשם בהצלחה"
  - Bearer token issued

#### 1.2 Customer Profile Management
- **Profile Update**: Hebrew address, contact preferences
- **Location Services**: Israeli address validation (דיזנגוף 100, תל אביב-יפו)
- **Expected Results**:
  - Hebrew confirmation: "פרופיל עודכן בהצלחה"
  - Address properly stored in Hebrew

#### 1.3 Lead Creation & Management
- **Lead Creation**: Service request in Hebrew
- **Category Selection**: Professional categories (אלקטריקאי, שרברב, etc.)
- **Budget Range**: ILS currency with min/max validation
- **Location Matching**: GPS coordinates for Tel Aviv area
- **Expected Results**:
  - Lead ID generated
  - Hebrew confirmation: "ליד נוצר בהצלחה"
  - Professional matching initiated

#### 1.4 Proposal Viewing & Selection
- **Proposal Retrieval**: View professional responses
- **Professional Profiles**: Hebrew descriptions and qualifications
- **Acceptance Simulation**: Customer selects professional
- **Expected Results**:
  - Proposals listed with Hebrew content
  - Professional contact details revealed

#### 1.5 Payment Processing
- **Payment Initiation**: Credit card processing simulation
- **Amount Calculation**: Service fee + platform commission
- **Expected Results**:
  - Payment session URL generated
  - Transaction recorded in ILS

#### 1.6 Communication & Support
- **Notification Preferences**: SMS, WhatsApp, Email settings
- **Support Tickets**: Hebrew customer service requests
- **Expected Results**:
  - Preferences saved successfully
  - Support ticket created with Hebrew content

---

## 2. Professional User Flow (`test_professional_flow.py`)

### Test Scenarios
#### 2.1 Professional Registration & Verification
- **Registration**: Professional credentials and certifications
- **Document Upload**: License verification simulation
- **Profile Completion**: Skills, experience, service areas
- **Expected Results**:
  - Professional account created
  - Verification process initiated
  - Hebrew success messages

#### 2.2 Lead Board & Matching
- **Lead Board Access**: Available opportunities by location/category
- **Geographic Filtering**: Tel Aviv radius matching
- **Category Expertise**: Matching professional skills to lead requirements
- **Expected Results**:
  - Relevant leads displayed
  - Distance calculations accurate
  - Category filtering functional

#### 2.3 Proposal Submission
- **Proposal Creation**: Service description, pricing, timeline
- **Professional Branding**: Portfolio and credentials display
- **Availability Management**: Calendar integration
- **Expected Results**:
  - Proposal submitted successfully
  - Customer notification triggered
  - Professional dashboard updated

#### 2.4 Professional Lead Creation
- **Service Offering**: Professionals posting available services
- **Reverse Lead**: Customers can find pre-posted services
- **Expected Results**:
  - Service listing created
  - Searchable by customers
  - Professional branded correctly

#### 2.5 Referral Management
- **Referral Code Generation**: Professional referral programs
- **Network Building**: Multi-level referral tracking
- **Commission Tracking**: Referral earnings monitoring
- **Expected Results**:
  - Referral codes generated
  - Referral relationships tracked
  - Commission calculations accurate

#### 2.6 Earnings & Analytics
- **Revenue Tracking**: Transaction history and earnings
- **Performance Metrics**: Success rates, customer ratings
- **Payout Management**: Commission settlement requests
- **Expected Results**:
  - Accurate earnings calculations
  - Hebrew financial reports
  - Analytics dashboard functional

---

## 3. Referral System Flows (`test_referral_flows.py`)

### Test Scenarios
#### 3.1 Referral Network Creation
- **Multi-User Setup**: Referrer and referred user accounts
- **User Type Validation**: Professional and customer referrals
- **Expected Results**:
  - Test network established
  - User relationships mapped

#### 3.2 Referral Code Management
- **Code Generation**: Campaign-specific referral codes
- **Expiration Handling**: Time-limited campaigns
- **Usage Limits**: Maximum referral constraints
- **Expected Results**:
  - Unique codes generated
  - Hebrew campaign descriptions
  - Usage tracking initiated

#### 3.3 Registration with Referral
- **Code Validation**: Referral code verification during signup
- **Referrer Attribution**: Proper credit assignment
- **Expected Results**:
  - Referral relationship established
  - Referrer notified of successful signup

#### 3.4 Referral Tracking & Analytics
- **Network Visualization**: Referral tree structure
- **Performance Metrics**: Conversion rates, earnings
- **Leaderboard**: Top referrers ranking
- **Expected Results**:
  - Accurate tracking data
  - Real-time analytics
  - Hebrew leaderboard display

#### 3.5 Commission Calculation
- **Multi-Level Commissions**: Referrer and sub-referrer earnings
- **Transaction Attribution**: Commission source tracking
- **Payout Scheduling**: Automatic commission distribution
- **Expected Results**:
  - Accurate commission calculations
  - Proper attribution to referrers
  - ILS currency handling

#### 3.6 Fraud Prevention
- **Duplicate Detection**: Prevent multiple registrations
- **Self-Referral Blocking**: User cannot refer themselves
- **Pattern Analysis**: Suspicious activity identification
- **Expected Results**:
  - Fraudulent attempts blocked
  - System integrity maintained

---

## 4. Admin Management Workflows (`test_admin_workflows.py`)

### Test Scenarios
#### 4.1 Admin Authentication & Dashboard
- **Admin Registration**: Elevated privilege account creation
- **Dashboard Overview**: Platform-wide metrics and KPIs
- **Expected Results**:
  - Admin access granted
  - Hebrew dashboard interface
  - Real-time platform statistics

#### 4.2 User Management & Moderation
- **User Listing**: All platform users with filtering
- **User Details**: Comprehensive profile information
- **Moderation Actions**: Suspension, verification, communication
- **Expected Results**:
  - User data accessible
  - Moderation tools functional
  - Hebrew administrative interface

#### 4.3 Lead Management & Quality Control
- **Lead Overview**: All leads with status tracking
- **Quality Assessment**: Lead completeness and clarity scoring
- **Category Management**: Lead recategorization and flagging
- **Expected Results**:
  - Lead quality metrics available
  - Administrative controls functional
  - Hebrew content properly handled

#### 4.4 Financial Oversight & Monitoring
- **Revenue Tracking**: Platform fees and commission monitoring
- **Transaction Analysis**: Payment flow oversight
- **Payout Management**: Professional earnings distribution
- **Expected Results**:
  - Financial data accurate
  - ILS currency calculations correct
  - Administrative financial controls

#### 4.5 Referral System Administration
- **Referral Analytics**: System-wide referral performance
- **Fraud Detection**: Suspicious pattern identification
- **Commission Oversight**: Referral payout monitoring
- **Expected Results**:
  - Referral system transparency
  - Fraud detection operational
  - Administrative controls effective

#### 4.6 System Configuration & Content Management
- **Platform Settings**: Commission rates, limits, policies
- **Content Management**: Help articles, FAQs, legal documents
- **Notification Templates**: Hebrew message customization
- **Expected Results**:
  - System configuration functional
  - Hebrew content management
  - Template customization working

#### 4.7 Support & Analytics
- **Support Ticket Management**: Customer service workflow
- **Business Analytics**: Platform performance insights
- **Custom Reporting**: Data export and visualization
- **Expected Results**:
  - Support workflow operational
  - Analytics data available
  - Hebrew reporting functional

---

## Expected Test Results Summary

### Success Criteria
✅ **All Hebrew Text Processing**: Proper RTL support and validation  
✅ **Israeli Market Features**: Phone numbers, addresses, currency (ILS)  
✅ **Multi-Service Integration**: All 7 microservices communicating  
✅ **User Journey Completion**: End-to-end flow validation  
✅ **Security & Authentication**: JWT tokens and user permissions  
✅ **Business Logic**: Commission calculations and referral tracking  
✅ **Administrative Controls**: Platform management and oversight  

### Test Environment Considerations
⚠️ **Service Availability**: Some services may be mocked in test environment  
⚠️ **External Integrations**: Payment processors and SMS providers simulated  
⚠️ **Database State**: Tests may create test data that needs cleanup  
⚠️ **Network Dependencies**: Docker network connectivity required  

### Performance Expectations
- **Response Times**: < 2 seconds for API calls
- **Hebrew Rendering**: Proper RTL text display
- **Error Handling**: Graceful degradation with Hebrew error messages
- **Data Consistency**: Cross-service data synchronization

---

## Running the Test Suite

### Prerequisites
```bash
# Ensure all services are running
docker-compose up -d

# Install test dependencies
pip install aiohttp pytest asyncio
```

### Individual Flow Tests
```bash
# Customer flow
python tests/e2e/test_customer_flow.py

# Professional flow  
python tests/e2e/test_professional_flow.py

# Referral system
python tests/e2e/test_referral_flows.py

# Admin workflows
python tests/e2e/test_admin_workflows.py
```

### Complete Test Suite
```bash
# Run all E2E tests
python -m pytest tests/e2e/ -v --tb=short
```

---

## Test Data Generated

Each test suite generates comprehensive test data:
- **User Accounts**: Customers, professionals, and admins
- **Leads**: Service requests in various categories
- **Proposals**: Professional responses and pricing
- **Referral Networks**: Multi-level referral relationships
- **Transactions**: Payment and commission data
- **Administrative Records**: Platform management actions

All test data includes Hebrew content and follows Israeli market conventions for maximum realism and validation of localization features.

---

*Last Updated: December 2024*  
*OFAIR MVP - Complete Backend E2E Testing Documentation*