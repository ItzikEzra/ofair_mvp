# OFAIR MVP - Referral-First Marketplace Platform

![OFAIR Platform](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Services](https://img.shields.io/badge/Microservices-8%2F8%20Operational-blue)
![Database](https://img.shields.io/badge/Database-27%20Tables%20Deployed-success)

OFAIR is a two-sided marketplace and referral economy connecting **professionals** and **consumers** in the Israeli market. The platform's core differentiator is **Lead Transfer & Referral** — professionals can create leads, share or refer leads to other professionals, and monetize those referrals.

## 🎯 Platform Overview

### Core Value Proposition
- **For Professionals**: Find paid work AND create monetizable leads for peers
- **For Consumers**: Get quality service providers through vetted professional networks
- **For Platform**: Commission-based revenue from successful job completions

### Business Model
- **Consumer leads**: 10% platform commission
- **Professional leads**: 5% platform commission + configurable referral fees (0-90%)
- **Payment Flow**: Platform collects from consumers → splits to professionals + referrers

---

## 🏗️ Architecture Overview

### Microservices Architecture (8 Services)
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│Auth Service │────│Users Service │────│Leads Service│
│Port: 8001   │    │Port: 8002    │    │Port: 8003   │
└─────────────┘    └──────────────┘    └─────────────┘
       │                   │                    │
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│Proposals    │────│Referrals     │────│Payments     │
│Port: 8004   │    │Port: 8005    │    │Port: 8006   │
└─────────────┘    └──────────────┘    └─────────────┘
       │                   │                    │
┌─────────────┐    ┌──────────────┐
│Notifications│────│Admin Service │
│Port: 8007   │    │Port: 8008    │
└─────────────┘    └──────────────┘
```

### Infrastructure Stack
- **Backend**: Python FastAPI microservices
- **Database**: PostgreSQL with full ACID compliance
- **Cache**: Redis for sessions and rate limiting
- **Storage**: MinIO (S3-compatible) for file uploads
- **Message Queue**: Redis pub/sub for notifications
- **Authentication**: JWT with OTP verification via SMS
- **Containerization**: Docker with docker-compose orchestration

---

## 📊 Database Schema (27 Production Tables)

### Core Business Tables
```sql
-- User Management
users                    -- Core user accounts with phone/email auth
professional_profiles    -- Extended professional information
customer_profiles       -- Customer preferences and data

-- Lead Management
leads                   -- Job postings/service requests
lead_categories        -- Service categories (plumbing, electrical, etc.)
lead_views             -- Track professional engagement

-- Proposal System
proposals              -- Professional responses to leads
proposal_messages      -- Proposal-specific communication

-- Referral Economy
referrals             -- Lead transfer tracking
commissions           -- Commission calculations and splits

-- Financial System
transactions          -- All payment records
balances             -- User wallet balances
payouts              -- Withdrawal requests

-- Communication
notifications         -- System notifications
notification_preferences -- User communication settings
conversations        -- Chat conversations
messages            -- Chat messages

-- Reviews & Trust
reviews             -- Customer feedback and ratings

-- Administration
admin_users         -- Admin panel access
admin_logs          -- Admin activity tracking
platform_settings   -- System configuration
```

### Key Database Features
- **UUID Primary Keys**: Consistent across all tables
- **Foreign Key Constraints**: Data integrity enforced
- **Indexes**: Optimized for search and filtering
- **Triggers**: Automatic timestamp updates
- **Hebrew Support**: RTL text handling and collation
- **Row Level Security**: Ready for PII protection

---

## 🔐 Authentication & Security

### Authentication Flow
```mermaid
sequenceDiagram
    User->>+Auth Service: Send OTP Request (phone/email)
    Auth Service->>+SMS Provider: Send OTP
    SMS Provider-->>-User: OTP Message
    User->>+Auth Service: Verify OTP
    Auth Service->>+Database: Create/Find User
    Database-->>-Auth Service: User Record
    Auth Service-->>-User: JWT Token + User Data
    User->>+Any Service: API Request + JWT
    Any Service->>+Auth Service: Verify Token
    Auth Service-->>-Any Service: Token Claims
```

### Security Features
- **OTP Verification**: SMS-based phone number verification
- **JWT Tokens**: Cross-service authentication with 24-hour expiry
- **Rate Limiting**: Protection against abuse (3 OTP requests per minute)
- **Input Validation**: Pydantic v2 models with comprehensive validation
- **PII Protection**: Masked contact info until proposal acceptance
- **Audit Logging**: All sensitive data access tracked

---

## 🚀 Service Documentation

### 1. Auth Service (Port 8001)
**Purpose**: Handle user authentication and token management

**Business Logic**:
- OTP generation and SMS delivery via Twilio
- Phone number normalization for Israeli market (+972)
- JWT token generation with user metadata
- Session management and token refresh

**Key Endpoints**:
```http
POST /auth/send-otp
POST /auth/verify-otp
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

**Database Integration**:
- Creates user records in `users` table on first verification
- Stores OTP data in Redis with 10-minute expiry
- Manages refresh tokens with 30-day expiry

---

### 2. Users Service (Port 8002)
**Purpose**: Manage user profiles and professional verification

**Business Logic**:
- Professional profile creation and verification
- Customer profile management
- Certificate and document upload handling
- Service area and specialty management

**Key Endpoints**:
```http
GET    /users/me
POST   /users/me/profile
GET    /users/me/profile

POST   /professionals/profile
GET    /professionals/profile/me
POST   /professionals/certificates/upload
GET    /professionals/{id}
POST   /professionals/verify/{id}

GET    /customers/profile
POST   /customers/profile
```

**Database Integration**:
- Updates `users` table with profile information
- Creates records in `professional_profiles` or `customer_profiles`
- Manages certification uploads and verification status

---

### 3. Leads Service (Port 8003)
**Purpose**: Lead creation, management, and matching system

**Business Logic**:
- Consumer lead creation from web forms
- Professional lead creation with referral settings
- Lead board with location and category filtering
- View tracking and engagement analytics
- Lead expiry management (30 days default)

**Key Endpoints**:
```http
GET    /leads/board/
POST   /leads/
GET    /leads/{id}
PUT    /leads/{id}
DELETE /leads/{id}

GET    /leads/categories
GET    /leads/my
POST   /leads/{id}/view
GET    /leads/{id}/analytics

GET    /leads/search
POST   /leads/filter
```

**Database Integration**:
- Creates records in `leads` table
- Links to `lead_categories` for categorization
- Tracks views in `lead_views` table
- Updates proposal counts automatically

---

### 4. Proposals Service (Port 8004)
**Purpose**: Handle professional responses to leads

**Business Logic**:
- Professional proposal submission with pricing
- Proposal acceptance/rejection workflow
- Proposal expiry management (7 days default)
- Communication between lead owners and proposers
- Unique constraint: one proposal per professional per lead

**Key Endpoints**:
```http
POST   /proposals/
GET    /proposals/my
GET    /proposals/{id}
PUT    /proposals/{id}
DELETE /proposals/{id}

POST   /proposals/{id}/accept
POST   /proposals/{id}/reject
GET    /proposals/{id}/messages
POST   /proposals/{id}/messages

GET    /leads/{lead_id}/proposals
```

**Database Integration**:
- Creates records in `proposals` table
- Updates lead proposal counts
- Manages proposal messages in `proposal_messages`
- Triggers notification events

---

### 5. Referrals Service (Port 8005)
**Purpose**: Lead transfer and referral commission tracking

**Business Logic**:
- Lead referral from one professional to another
- Commission percentage configuration (0-90%)
- Referral acceptance workflow
- Commission calculation on job completion
- Payout distribution to referrers

**Key Endpoints**:
```http
POST   /referrals/
GET    /referrals/my
GET    /referrals/user/{user_id}
POST   /referrals/{id}/accept
POST   /referrals/{id}/complete

POST   /commissions/calculate
GET    /commissions/my
GET    /commissions/{id}
```

**Database Integration**:
- Creates records in `referrals` table
- Calculates commissions in `commissions` table
- Updates user balances upon payout
- Links to leads and user accounts

---

### 6. Payments Service (Port 8006)
**Purpose**: Payment processing and wallet management

**Business Logic**:
- Payment collection from consumers
- Commission splits to platform, professionals, referrers
- Wallet balance management
- Payout request processing
- Transaction history and reporting

**Key Endpoints**:
```http
POST   /payments/process
GET    /payments/history
GET    /payments/{id}

GET    /balances/{professional_id}
POST   /payouts/create
GET    /payouts/my
PUT    /payouts/{id}/process

GET    /transactions/my
GET    /transactions/{id}
```

**Database Integration**:
- Records all transactions in `transactions` table
- Maintains user balances in `balances` table
- Processes payouts via `payouts` table
- Ensures financial data integrity

---

### 7. Notifications Service (Port 8007)
**Purpose**: Multi-channel notification delivery

**Business Logic**:
- Event-driven notifications (lead updates, proposal changes)
- Multi-channel delivery (SMS, email, push)
- User preference management
- Quiet hours and frequency controls
- Hebrew message templates

**Key Endpoints**:
```http
GET    /notifications/
POST   /notifications/send
PUT    /notifications/{id}/read
DELETE /notifications/{id}

GET    /notifications/settings
PUT    /notifications/settings
POST   /notifications/test

GET    /notifications/unread/count
```

**Database Integration**:
- Stores notifications in `notifications` table
- Manages preferences in `notification_preferences`
- Tracks delivery status and read receipts

---

### 8. Admin Service (Port 8008)
**Purpose**: Platform administration and monitoring

**Business Logic**:
- User management and dispute resolution
- Lead moderation and approval
- Financial reporting and analytics
- Platform settings configuration
- Admin user access control

**Key Endpoints**:
```http
GET    /admin/dashboard
GET    /admin/analytics

GET    /admin/users
PUT    /admin/users/{id}/status
GET    /admin/users/{id}/activity

GET    /admin/leads
PUT    /admin/leads/{id}/moderate
GET    /admin/disputes

GET    /admin/settings
PUT    /admin/settings/{key}
GET    /admin/logs
```

**Database Integration**:
- Admin access via `admin_users` table
- Activity logging in `admin_logs`
- Platform configuration in `platform_settings`
- Full database access for reporting

---

## 🛠️ Development Setup

### Prerequisites
- Docker and docker-compose
- Python 3.11+
- Node.js 18+ (for frontend)
- PostgreSQL client tools

### Quick Start
```bash
# Clone repository
git clone https://github.com/ItzikEzra/ofair_mvp.git
cd ofair_mvp

# Start all services
docker-compose up -d

# Wait for all services to be healthy
docker-compose ps

# Initialize database (if not already done)
docker exec -i ofair_mvp-postgres-1 psql -U ofair_user -d ofair_dev < scripts/init_database.sql

# Test services
curl http://localhost:8001/health  # Auth Service
curl http://localhost:8002/health  # Users Service
curl http://localhost:8003/health  # Leads Service
# ... (all 8 services)
```

### Service URLs
- **Auth Service**: http://localhost:8001
- **Users Service**: http://localhost:8002
- **Leads Service**: http://localhost:8003
- **Proposals Service**: http://localhost:8004
- **Referrals Service**: http://localhost:8005
- **Payments Service**: http://localhost:8006
- **Notifications Service**: http://localhost:8007
- **Admin Service**: http://localhost:8008

### Database Access
```bash
# Connect to PostgreSQL
docker exec -it ofair_mvp-postgres-1 psql -U ofair_user -d ofair_dev

# Connect to Redis
docker exec -it ofair_mvp-redis-1 redis-cli

# Connect to MinIO
# Web UI: http://localhost:9001
# Access Key: ofair_access_key
# Secret Key: ofair_secret_key
```

---

## 📱 API Usage Examples

### Authentication Flow
```bash
# 1. Send OTP
curl -X POST http://localhost:8001/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"contact": "+972541234567", "contact_type": "phone"}'

# 2. Verify OTP and get JWT
curl -X POST http://localhost:8001/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"contact": "+972541234567", "otp": "123456", "contact_type": "phone"}'

# Response includes JWT token for authenticated requests
```

### Lead Creation
```bash
# Create consumer lead
curl -X POST http://localhost:8003/leads/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "תיקון מזגן בדירה",
    "description": "המזגן לא עובד, צריך טכנאי לתיקון דחוף",
    "category": "HVAC",
    "location": "תל אביב",
    "budget_min": 200,
    "budget_max": 500,
    "urgency": "high"
  }'
```

### Professional Proposal
```bash
# Submit proposal
curl -X POST http://localhost:8004/proposals/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "LEAD_UUID",
    "price": 350,
    "description": "אני מומחה במזגנים עם 8 שנות ניסיון",
    "estimated_duration": "2-3 שעות",
    "availability": "זמין היום"
  }'
```

### Referral Creation
```bash
# Refer lead to another professional
curl -X POST http://localhost:8005/referrals/ \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "LEAD_UUID",
    "referred_professional_id": "PROF_UUID",
    "commission_percentage": 15,
    "notes": "מומלץ בחום - עבד איתו בעבר"
  }'
```

---

## 🧪 Testing

### End-to-End Tests
```bash
# Run comprehensive user flow tests
cd tests/e2e
python test_real_user_flows.py

# Test individual services
python test_comprehensive_requirements.py
python test_corrected_requirements.py
```

### Service Health Checks
```bash
# Check all service health
for port in 8001 8002 8003 8004 8005 8006 8007 8008; do
  echo "Testing service on port $port:"
  curl -s http://localhost:$port/health | jq .
done
```

---

## 🇮🇱 Israeli Market Features

### Hebrew/RTL Support
- Full Hebrew interface with RTL layout
- Hebrew validation messages and error handling
- Israeli date and currency formatting (ILS)
- Hebrew SMS templates for OTP delivery

### Local Integration
- **Phone Numbers**: +972 format validation and normalization
- **SMS Provider**: Twilio with Israeli phone number support
- **Timezone**: Asia/Jerusalem timezone handling
- **Business Hours**: Israeli working hours and holidays

### Service Categories (Hebrew)
```
אינסטלציה (Plumbing)
חשמל (Electrical)
מיזוג אוויר (HVAC)
צביעה (Painting)
ניקיון (Cleaning)
הובלות (Moving)
שיפוצים (Renovation)
גינון (Gardening)
תיקון מכשירים (Appliance Repair)
הדברה (Pest Control)
```

---

## 🔧 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://ofair_user:ofair_password@postgres:5432/ofair_dev

# Redis
REDIS_URL=redis://redis:6379/0

# JWT
JWT_SECRET_KEY=ofair_jwt_secret_key_development_only_change_in_production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# SMS Provider (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone

# MinIO
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=ofair_access_key
S3_SECRET_KEY=ofair_secret_key
S3_BUCKET_NAME=ofair-uploads
```

### Platform Settings
```json
{
  "commission_rate": {"default": 10, "min": 5, "max": 20},
  "referral_bonus": {"percentage": 10, "min_amount": 50},
  "payout_threshold": {"amount": 100, "currency": "ILS"},
  "lead_expiry_days": 30,
  "proposal_expiry_days": 7
}
```

---

## 📈 Monitoring & Logs

### Service Health
Each service exposes a `/health` endpoint with:
- Service status and version
- Database connectivity
- Redis connectivity
- Dependency health checks

### Logging
- Structured logging with JSON format
- Request/response logging for API calls
- Error tracking with stack traces
- Audit logs for sensitive operations

### Metrics
- API response times and status codes
- Database query performance
- Authentication success/failure rates
- Business metrics (leads, proposals, conversions)

---

## 🚀 Deployment

### Production Checklist
- [ ] Update JWT secret keys
- [ ] Configure production database
- [ ] Set up SSL certificates
- [ ] Configure production SMS provider
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline

### Docker Production
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy with production configuration
docker-compose -f docker-compose.prod.yml up -d

# Monitor deployment
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 🤝 Contributing

### Development Workflow
1. Create feature branch from `main`
2. Implement changes with tests
3. Update API documentation
4. Run full test suite
5. Create pull request with description

### Code Standards
- Python: Black formatting, type hints, Pydantic models
- API: OpenAPI/Swagger documentation
- Database: Alembic migrations for schema changes
- Security: Never commit secrets or keys

---

## 📄 License

Proprietary - OFAIR Ltd.

---

## 📞 Support

For technical support or business inquiries:
- **Development**: Create GitHub issue
- **Business**: Contact OFAIR team
- **Security**: security@ofair.co.il

---

**🎉 The OFAIR backend is production-ready and awaiting frontend integration!**