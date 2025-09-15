# Supabase Assets Inventory - Pro-Ofair App

## Overview

This document provides a comprehensive inventory of all Supabase assets used in the Pro-Ofair professional services marketplace platform, including database tables, functions, storage buckets, and other resources.

**Project Details:**
- **Project ID**: erlfsougrkzbgonumhoa
- **Project Name**: ofair's Project
- **Region**: eu-central-1
- **Status**: ACTIVE_HEALTHY
- **Database Version**: PostgreSQL 15.8.1.054

## Database Tables Inventory

### Core Business Tables

#### 1. **professionals** (96 kB)
**Purpose**: Store professional service provider profiles and metadata

**Key Fields:**
- `id` (UUID, Primary Key)
- `name` (text) - Professional's full name
- `profession` (text) - Professional category/type
- `phone_number` (text) - Contact phone number
- `user_id` (UUID, nullable) - Links to Supabase auth.users (null for OTP users)
- `is_verified` (boolean) - Professional verification status
- `status` (text) - Active/inactive status
- `languages` (array) - Supported languages
- `specialties` (array) - Professional specialties
- `rating` (numeric) - Average rating
- `review_count` (integer) - Number of reviews
- `working_hours` (text) - Available working hours
- `areas` (text) - Service areas

**Usage**: Central table for all professional service providers

#### 2. **leads** (104 kB)
**Purpose**: Store job leads/opportunities created by professionals

**Key Fields:**
- `id` (UUID, Primary Key)
- `professional_id` (UUID, Foreign Key → professionals.id)
- `title` (text) - Lead title
- `description` (text) - Detailed description
- `location` (text) - Work location
- `budget` (numeric) - Budget amount
- `status` (text) - Lead status (active, closed, etc.)
- `profession` (text) - Required profession
- `category` (text) - Service category
- `work_date` (date) - Scheduled work date
- `work_time` (text) - Preferred work time
- `image_urls` (array) - Associated images
- `share_percentage` (integer) - Revenue sharing percentage
- `client_name` (text) - Client information
- `client_phone` (text) - Client contact
- `client_address` (text) - Client address
- `latitude` (numeric) - Geographic coordinates
- `longitude` (numeric) - Geographic coordinates

**Usage**: Job opportunities that professionals create for other professionals to bid on

#### 3. **proposals** (96 kB)
**Purpose**: Store professional proposals/bids submitted for leads

**Key Fields:**
- `id` (UUID, Primary Key)
- `professional_id` (UUID, Foreign Key → professionals.id)
- `lead_id` (UUID, Foreign Key → leads.id)
- `price` (numeric) - Proposed price
- `description` (text) - Proposal details
- `status` (text) - Proposal status
- `estimated_completion` (text) - Estimated completion time
- `lower_price_willing` (boolean) - Willing to negotiate
- `lower_price_value` (numeric) - Minimum acceptable price
- `scheduled_date` (date) - Proposed work date
- `scheduled_time` (text) - Proposed work time
- `media_urls` (array) - Sample work images
- `final_amount` (numeric) - Final agreed amount

**Usage**: Bids submitted by professionals for available leads

#### 4. **quotes** (176 kB)
**Purpose**: Store quotes provided by professionals for client requests

**Key Fields:**
- `id` (UUID, Primary Key)
- `request_id` (UUID, Foreign Key → requests.id)
- `professional_id` (UUID, Foreign Key → professionals.id)
- `price` (text) - Quoted price
- `description` (text) - Quote description
- `status` (text) - Quote status
- `request_status` (text) - Associated request status
- `estimated_time` (text) - Estimated completion time
- `scheduled_date` (date) - Proposed work date
- `scheduled_time` (text) - Proposed work time
- `media_urls` (array) - Sample work images
- `final_amount` (numeric) - Final agreed amount

**Usage**: Quotes provided by professionals in response to client requests

#### 5. **requests** (96 kB)
**Purpose**: Store service requests submitted by clients

**Key Fields:**
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → user_profiles.id)
- `title` (text) - Request title
- `description` (text) - Request details
- `location` (text) - Service location
- `status` (text) - Request status
- `category` (text) - Service category
- `timing` (text) - Preferred timing
- `media_urls` (array) - Request images
- `latitude` (numeric) - Geographic coordinates
- `longitude` (numeric) - Geographic coordinates

**Usage**: Client service requests that professionals can quote on

#### 6. **notifications** (96 kB)
**Purpose**: Store real-time notifications for professionals

**Key Fields:**
- `id` (UUID, Primary Key)
- `professional_id` (UUID, Foreign Key → professionals.id)
- `title` (text) - Notification title
- `description` (text) - Notification content
- `type` (text) - Notification type
- `related_id` (UUID) - Related entity ID
- `related_type` (text) - Related entity type
- `is_read` (boolean) - Read status
- `client_details` (json) - Client information

**Usage**: Real-time notification system for professionals

### Authentication & User Management

#### 7. **auth_tokens** (80 kB)
**Purpose**: Store custom authentication tokens for OTP users

**Key Fields:**
- `id` (UUID, Primary Key)
- `professional_id` (UUID, Foreign Key → professionals.id)
- `token` (text) - Authentication token (plaintext - security concern)
- `expires_at` (timestamp) - Token expiration
- `is_active` (boolean) - Token active status
- `last_used_at` (timestamp) - Last usage timestamp

**Usage**: Custom authentication system for OTP-based users

#### 8. **user_profiles** (64 kB)
**Purpose**: Store client user profiles

**Key Fields:**
- `id` (UUID, Primary Key)
- `name` (text) - User full name
- `email` (text) - User email
- `phone` (text) - User phone
- `address` (text) - User address
- `profile_image` (text) - Profile image URL

**Usage**: Client profile information for service requests

### Payment & Financial

#### 9. **lead_payments** (80 kB)
**Purpose**: Store payment information for completed leads

**Key Fields:**
- `id` (UUID, Primary Key)
- `lead_id` (UUID, Foreign Key → leads.id)
- `professional_id` (UUID, Foreign Key → professionals.id)
- `amount` (numeric) - Payment amount
- `payment_method` (text) - Payment method
- `status` (text) - Payment status
- `commission_amount` (numeric) - OFAIR commission
- `net_amount` (numeric) - Net amount to professional

**Usage**: Track payments for completed lead work

#### 10. **quote_payments** (Not visible in size query)
**Purpose**: Store payment information for completed quotes

**Key Fields:**
- `id` (UUID, Primary Key)
- `quote_id` (UUID, Foreign Key → quotes.id)
- `professional_id` (UUID, Foreign Key → professionals.id)
- `amount` (numeric) - Payment amount
- `payment_method` (text) - Payment method
- `status` (text) - Payment status
- `commission_amount` (numeric) - OFAIR commission

**Usage**: Track payments for completed quote work

### Content & Marketing

#### 11. **articles** (104 kB)
**Purpose**: Store blog/article content

**Key Fields:**
- `id` (UUID, Primary Key)
- `title` (text) - Article title
- `content` (text) - Article content
- `author` (text) - Article author
- `category` (text) - Article category
- `featured_image` (text) - Featured image URL
- `status` (text) - Publication status

**Usage**: Content management for blog/articles

#### 12. **referrals** (104 kB)
**Purpose**: Store referral program data

**Key Fields:**
- `id` (UUID, Primary Key)
- `referrer_id` (UUID, Foreign Key → professionals.id)
- `referred_id` (UUID, Foreign Key → professionals.id)
- `status` (text) - Referral status
- `commission_amount` (numeric) - Referral commission
- `commission_paid` (boolean) - Commission payment status

**Usage**: Track referral program between professionals

### Administrative

#### 13. **admin_users** (Not visible in size query)
**Purpose**: Store admin user information

**Key Fields:**
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → auth.users.id)
- `is_super_admin` (boolean) - Super admin status
- `email` (text) - Admin email
- `name` (text) - Admin name

**Usage**: Administrative access control

#### 14. **internal_crm** (Not visible in size query)
**Purpose**: Store internal CRM user information

**Key Fields:**
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → auth.users.id)
- `email` (text) - Internal user email
- `name` (text) - Internal user name
- `is_super_admin` (boolean) - Super admin status

**Usage**: Internal staff management system

### Supabase System Tables

#### 15. **auth.users** (224 kB)
**Purpose**: Supabase authentication system users

**Usage**: OAuth-based user authentication (Google, Apple, etc.)

#### 16. **auth.audit_log_entries** (584 kB)
**Purpose**: Authentication audit logs

**Usage**: Audit trail for authentication events

#### 17. **auth.refresh_tokens** (176 kB)
**Purpose**: JWT refresh token management

**Usage**: Token refresh for authenticated sessions

#### 18. **auth.sessions** (112 kB)
**Purpose**: User session management

**Usage**: Active user session tracking

#### 19. **storage.objects** (488 kB)
**Purpose**: File storage metadata

**Usage**: Metadata for uploaded files and images

#### 20. **storage.buckets** (88 kB)
**Purpose**: Storage bucket configuration

**Usage**: Configuration for file storage buckets

## Database Functions Inventory

### Authentication Functions

#### 1. **get_current_professional_id_secure()**
**Purpose**: Securely retrieve current professional ID from auth context
**Usage**: Used by RLS policies to identify current professional

#### 2. **check_internal_email(email_param text)**
**Purpose**: Check if email belongs to internal CRM user
**Returns**: JSON object with user details if exists

#### 3. **add_internal_user_by_email(caller_email text, new_user_email text, user_name text, make_super_admin boolean)**
**Purpose**: Add new internal CRM user
**Returns**: JSON object with success status and user ID

### Administrative Functions

#### 4. **check_admin_status(user_id_param uuid)**
**Purpose**: Check if user has admin privileges
**Returns**: Boolean indicating admin status

#### 5. **check_is_super_admin(user_id_param uuid)**
**Purpose**: Check if user has super admin privileges
**Returns**: Boolean indicating super admin status

#### 6. **add_internal_user(user_email text, user_name text, make_super_admin boolean)**
**Purpose**: Add internal user with admin privileges
**Returns**: UUID of newly created internal user

### Utility Functions

#### 7. **calculate_distance_km(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric)**
**Purpose**: Calculate distance between two geographic coordinates
**Returns**: Distance in kilometers

#### 8. **check_price_and_share_percentage()**
**Purpose**: Trigger function to validate pricing and share percentage
**Returns**: Modified record with validated values

### Business Logic Functions

#### 9. **get_professionals_by_distance(lat numeric, lng numeric, radius_km numeric)**
**Purpose**: Find professionals within specified radius
**Returns**: List of professionals sorted by distance

#### 10. **calculate_commission(amount numeric, percentage numeric)**
**Purpose**: Calculate OFAIR commission for transactions
**Returns**: Commission amount

## Edge Functions Inventory

### Authentication Functions

#### 1. **send-otp**
**Purpose**: Send OTP codes via SMS for authentication
**Method**: POST
**Usage**: Initial authentication step for professionals

#### 2. **verify-otp**
**Purpose**: Verify OTP codes and create auth tokens
**Method**: POST
**Usage**: Complete authentication flow for professionals

#### 3. **validate-token**
**Purpose**: Validate authentication tokens
**Method**: POST
**Usage**: Token validation for authenticated requests

### Lead Management Functions

#### 4. **submit-lead**
**Purpose**: Create new job leads
**Method**: POST
**Usage**: Professionals submit new work opportunities

#### 5. **get-active-leads**
**Purpose**: Retrieve active job leads
**Method**: GET
**Usage**: Display available leads to professionals

#### 6. **get-my-leads**
**Purpose**: Retrieve leads created by current professional
**Method**: GET
**Usage**: Professional's own lead management

#### 7. **delete-lead**
**Purpose**: Delete existing leads
**Method**: DELETE
**Usage**: Remove leads that are no longer needed

#### 8. **get-lead-proposals**
**Purpose**: Retrieve proposals for specific lead
**Method**: GET
**Usage**: Lead owners view submitted proposals

#### 9. **update-lead-status**
**Purpose**: Update lead status (active, closed, etc.)
**Method**: PUT
**Usage**: Lead lifecycle management

### Proposal Management Functions

#### 10. **submit-proposal**
**Purpose**: Submit proposals for leads
**Method**: POST
**Usage**: Professionals bid on available leads

#### 11. **get-proposals**
**Purpose**: Retrieve professional's submitted proposals
**Method**: GET
**Usage**: Professional's proposal management

#### 12. **get-all-proposals**
**Purpose**: Retrieve all proposals with filtering
**Method**: GET
**Usage**: Administrative proposal overview

#### 13. **update-proposal-status**
**Purpose**: Update proposal status (pending, approved, rejected)
**Method**: PUT
**Usage**: Proposal lifecycle management

#### 14. **update-proposal-scheduling**
**Purpose**: Update proposal scheduling information
**Method**: PUT
**Usage**: Schedule accepted proposals

### Quote Management Functions

#### 15. **submit-quote**
**Purpose**: Submit quotes for client requests
**Method**: POST
**Usage**: Professionals respond to client requests

#### 16. **get-active-requests**
**Purpose**: Retrieve active client requests
**Method**: GET
**Usage**: Display available requests to professionals

#### 17. **submit-request**
**Purpose**: Submit new client requests
**Method**: POST
**Usage**: Clients request services from professionals

### Work Completion Functions

#### 18. **update-work-completion**
**Purpose**: Mark work as completed and process payments
**Method**: POST
**Usage**: Complete work flow with payment processing

#### 19. **update-payment**
**Purpose**: Update payment information
**Method**: PUT
**Usage**: Payment processing and tracking

#### 20. **check-payment-exists**
**Purpose**: Check if payment record exists
**Method**: GET
**Usage**: Payment validation

### Project Management Functions

#### 21. **insert-project**
**Purpose**: Create new project records
**Method**: POST
**Usage**: Project creation from accepted proposals

#### 22. **update-project**
**Purpose**: Update project information
**Method**: PUT
**Usage**: Project status and progress tracking

#### 23. **get-projects**
**Purpose**: Retrieve project information
**Method**: GET
**Usage**: Project management and tracking

### Notification Functions

#### 24. **get-notifications**
**Purpose**: Retrieve notifications for professionals
**Method**: GET
**Usage**: Real-time notification system

#### 25. **mark-notification-read**
**Purpose**: Mark notifications as read
**Method**: PUT
**Usage**: Notification state management

#### 26. **delete-notifications**
**Purpose**: Delete notification records
**Method**: DELETE
**Usage**: Notification cleanup

### File Management Functions

#### 27. **upload-image**
**Purpose**: Upload images to Supabase Storage
**Method**: POST
**Usage**: Image upload for leads, proposals, profiles

#### 28. **upload-certificate**
**Purpose**: Upload professional certificates
**Method**: POST
**Usage**: Professional verification documents

#### 29. **create-storage-bucket**
**Purpose**: Create new storage buckets
**Method**: POST
**Usage**: Storage bucket management

#### 30. **ensure-storage-bucket**
**Purpose**: Ensure storage bucket exists
**Method**: POST
**Usage**: Storage bucket validation

#### 31. **create-media-buckets**
**Purpose**: Create media storage buckets
**Method**: POST
**Usage**: Media storage setup

### Utility Functions

#### 32. **address-to-coords**
**Purpose**: Convert addresses to geographic coordinates
**Method**: POST
**Usage**: Location-based services

#### 33. **google-geocoding**
**Purpose**: Google Geocoding API integration
**Method**: POST
**Usage**: Address validation and coordinate conversion

#### 34. **get-professional-by-identifier**
**Purpose**: Retrieve professional by various identifiers
**Method**: GET
**Usage**: Professional lookup and validation

#### 35. **get-referrals**
**Purpose**: Retrieve referral information
**Method**: GET
**Usage**: Referral program management

### Administrative Functions

#### 36. **debug-lead-ownership**
**Purpose**: Debug lead ownership issues
**Method**: GET
**Usage**: Troubleshooting lead permissions

#### 37. **enable-realtime**
**Purpose**: Enable real-time subscriptions
**Method**: POST
**Usage**: Real-time feature configuration

#### 38. **create_quote_payments_table**
**Purpose**: Create quote payments table
**Method**: POST
**Usage**: Database schema management

### Reminder & Notification Functions

#### 39. **check-reminder-status**
**Purpose**: Check status of reminders
**Method**: GET
**Usage**: Reminder system management

#### 40. **check-work-completion-reminders**
**Purpose**: Check work completion reminders
**Method**: GET
**Usage**: Work completion tracking

### Testing Functions

#### 41. **test-019-api**
**Purpose**: Test API endpoint functionality
**Method**: GET
**Usage**: API testing and validation

#### 42. **test-envs**
**Purpose**: Test environment variables
**Method**: GET
**Usage**: Environment configuration testing

#### 43. **test-referral**
**Purpose**: Test referral system
**Method**: GET
**Usage**: Referral system testing

## Storage Buckets Inventory

### Media Storage Buckets

#### 1. **images**
**Purpose**: General image storage
**Usage**: Generic image uploads and storage

#### 2. **lead-images**
**Purpose**: Store images associated with leads
**Usage**: Lead-specific image attachments

#### 3. **professionals_images**
**Purpose**: Store professional profile images
**Usage**: Professional profile pictures and portfolio images

#### 4. **Professionals Images**
**Purpose**: Alternative professional image storage
**Usage**: Professional-related images (duplicate bucket)

#### 5. **request-media**
**Purpose**: Store media files for client requests
**Usage**: Client request attachments and images

#### 6. **requests-media**
**Purpose**: Alternative request media storage
**Usage**: Client request media (duplicate bucket)

#### 7. **Proposal Sample Images**
**Purpose**: Store sample work images for proposals
**Usage**: Professional portfolio samples in proposals

#### 8. **professional-certificates**
**Purpose**: Store professional certificates and credentials
**Usage**: Professional verification documents

### Document Storage Buckets

#### 9. **invoices**
**Purpose**: Store invoice documents
**Usage**: Financial document storage

#### 10. **profile.data**
**Purpose**: Store profile-related data files
**Usage**: Profile information and metadata

### Article & Content Buckets

#### 11. **Articles Images**
**Purpose**: Store images for blog articles
**Usage**: Article content and featured images

#### 12. **Public Images**
**Purpose**: Store public-facing images
**Usage**: Public content and marketing images

## Security Features

### Row Level Security (RLS) Policies

#### Professional Data Protection
- All tables have RLS policies ensuring professionals can only access their own data
- Dual authentication support (Supabase Auth + Custom OTP)
- Token-based access control for OTP users

#### Admin Access Control
- Separate admin user system with super admin privileges
- Role-based access control for administrative functions
- Audit logging for administrative actions

#### Data Access Patterns
- Geographic-based access for location-sensitive data
- Time-based access for scheduled work and appointments
- Status-based access for workflow management

### Authentication Security

#### Token Management
- Custom JWT-like tokens with expiration
- Token rotation and invalidation
- Session management across devices

#### Security Concerns
- **Critical**: Tokens stored in plaintext (requires hashing)
- **High**: No rate limiting on OTP endpoints
- **Medium**: Limited brute force protection

## Performance Considerations

### Database Performance

#### Large Tables (by size)
1. **auth.audit_log_entries** (584 kB) - Audit logs
2. **storage.objects** (488 kB) - File metadata
3. **auth.users** (224 kB) - User accounts
4. **quotes** (176 kB) - Quote submissions
5. **auth.refresh_tokens** (176 kB) - Token management

#### Optimization Opportunities
- Add composite indexes for common query patterns
- Implement connection pooling
- Optimize complex RLS policies
- Add caching layers for frequently accessed data

### Function Performance

#### Cold Start Considerations
- Edge Functions may experience cold start latency
- Consider function warming strategies
- Optimize function initialization code

#### Resource Usage
- Monitor function memory consumption
- Implement proper error handling
- Add timeout management

## Backup & Recovery

### Current Backup Strategy
- **Automated Backups**: Supabase provides automated daily backups
- **Point-in-Time Recovery**: Available through Supabase dashboard
- **Data Replication**: Built-in replication for high availability

### Backup Coverage
- **Database**: All tables and data automatically backed up
- **Storage**: File storage included in backup strategy
- **Functions**: Edge Function code versioned through Git

### Recovery Testing
- **Recommendation**: Implement regular backup restoration testing
- **Documentation**: Create detailed recovery procedures
- **Monitoring**: Add backup success/failure monitoring

## Monitoring & Observability

### Current Monitoring
- **Basic Metrics**: Supabase provides basic performance metrics
- **Error Tracking**: Edge Function error logging
- **Real-time Monitoring**: Limited real-time monitoring capabilities

### Recommended Monitoring
- **Database Performance**: Query performance monitoring
- **Function Metrics**: Execution time and error rate tracking
- **Storage Usage**: File storage consumption monitoring
- **Security Events**: Authentication and authorization tracking

## Cost Analysis

### Resource Consumption
- **Database**: Moderate usage with 23 tables
- **Functions**: 43 Edge Functions with varying usage patterns
- **Storage**: 12 storage buckets with image and document storage
- **Bandwidth**: API calls and file transfers

### Optimization Opportunities
- **Database**: Optimize expensive queries and RLS policies
- **Functions**: Reduce cold start times and optimize memory usage
- **Storage**: Implement image optimization and compression
- **Caching**: Add application-level caching to reduce database load

## Compliance & Security

### Data Protection
- **Encryption**: Data encrypted at rest and in transit
- **Access Control**: Comprehensive RLS policies
- **Audit Logging**: Authentication events tracked

### Compliance Gaps
- **GDPR**: Data retention and deletion policies needed
- **Privacy**: Enhanced user consent management required
- **Security**: Token hashing and rate limiting required

## Maintenance & Updates

### Regular Maintenance Tasks
- **Database**: Index maintenance and query optimization
- **Functions**: Code updates and security patches
- **Storage**: Cleanup of unused files and buckets
- **Monitoring**: Review and update monitoring alerts

### Update Strategy
- **Schema Changes**: Use Supabase migrations for database updates
- **Function Updates**: Deploy through Supabase CLI
- **Storage Updates**: Bucket configuration through dashboard
- **Security Updates**: Regular security audits and updates

## Summary

The Pro-Ofair Supabase infrastructure comprises:

- **23 Database Tables** covering authentication, business logic, and system functions
- **43 Edge Functions** handling API endpoints and business logic
- **12 Storage Buckets** for media and document storage
- **10+ Database Functions** for complex business logic
- **Comprehensive RLS Policies** for data security
- **Dual Authentication System** supporting OAuth and OTP

### Key Strengths
- Modern serverless architecture with auto-scaling
- Comprehensive security through RLS policies
- Flexible storage for media and documents
- Real-time capabilities for notifications
- Well-organized function structure

### Areas for Improvement
- **Security**: Hash authentication tokens and implement rate limiting
- **Performance**: Optimize database queries and RLS policies
- **Monitoring**: Add comprehensive monitoring and alerting
- **Compliance**: Implement GDPR compliance features
- **Documentation**: Enhance API documentation and developer guides

This inventory provides a foundation for ongoing maintenance, optimization, and scaling of the Pro-Ofair platform's backend infrastructure.

---

*Last Updated: July 17, 2025*  
*Next Review: August 17, 2025*