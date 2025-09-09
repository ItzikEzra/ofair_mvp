# OFAIR MVP - Referral-First Marketplace

OFAIR is a two-sided marketplace and referral economy connecting professionals and consumers, with Hebrew/RTL support for the Israeli market.

## Core Features
- **Lead Transfer & Referral**: Professionals create, share, and monetize leads
- **Commission-based Economy**: 5% platform fee on professional leads, 10% on consumer leads
- **Secure Payment Processing**: Platform-managed payments with referral payouts
- **Hebrew UI/UX**: RTL-optimized interface for Israeli market

## Architecture

### Services
- `auth-service` - OTP authentication and token management
- `users-service` - User profiles and professional verification
- `leads-service` - Lead creation, matching, and board management
- `proposals-service` - Proposal submission and acceptance
- `referrals-service` - Lead transfer and referral tracking
- `payments-service` - Payment processing and wallet management
- `notifications-service` - Multi-channel notifications
- `admin-service` - Admin dashboard and dispute resolution

### Web Applications
- `consumer-web` - Consumer request creation and proposal viewing
- `pro-pwa` - Professional mobile-first PWA with RTL Hebrew support

### Shared Libraries
- `python-shared` - Common models, utilities, and database connections
- `js-shared` - Frontend components and RTL utilities

## Development Setup

```bash
# Install dependencies
pip install poetry
poetry install

# Start development services
docker-compose up -d

# Run database migrations
poetry run alembic upgrade head

# Start frontend development
cd web/pro-pwa
npm run dev
```

## Database Schema
- PostgreSQL with Row Level Security (RLS)
- Alembic migrations for schema management
- Audit logging for PII access

## Security
- Row-level security for sensitive data
- PII masking until proposal acceptance
- Comprehensive audit trails
- TLS everywhere

## Localization
- Hebrew RTL support throughout
- Israeli payment methods integration
- Local SMS/WhatsApp providers
- Hebrew date/currency formatting

## License
Proprietary - OFAIR Ltd.