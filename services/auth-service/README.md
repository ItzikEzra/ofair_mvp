# OFAIR Auth Service

Authentication and authorization service for the OFAIR platform, providing OTP-based authentication with support for Israeli phone numbers, WhatsApp, SMS, and email verification.

## Features

- **OTP Authentication**: Phone and email-based OTP verification
- **Multi-Channel Delivery**: WhatsApp (via GreenAPI), SMS (via Twilio), and Email
- **Hebrew/RTL Support**: Full Hebrew language support with RTL considerations
- **Israeli Phone Validation**: Comprehensive Israeli phone number format validation
- **JWT Token Management**: Secure token generation, refresh, and revocation
- **Rate Limiting**: Advanced rate limiting for OTP requests and verification
- **Redis Integration**: Fast caching and session management
- **Comprehensive Testing**: Unit tests with high coverage

## API Endpoints

### Authentication
- `POST /auth/send-otp` - Send OTP to phone or email
- `POST /auth/verify-otp` - Verify OTP and get authentication token
- `POST /auth/refresh` - Refresh access token
- `POST /auth/revoke` - Revoke authentication token(s)
- `GET /auth/me` - Get current user information
- `POST /auth/logout` - Logout and revoke current token

### Health & Monitoring
- `GET /` - Service information
- `GET /health` - Health check endpoint

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone the repository and navigate to auth service
cd services/auth-service

# Copy environment file and configure
cp .env.example .env
# Edit .env with your configuration

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f auth-service
```

### Local Development

```bash
# Install dependencies
pip install -r requirements-dev.txt

# Set environment variables
export DATABASE_URL="postgresql://user:pass@localhost/ofair_db"
export REDIS_URL="redis://localhost:6379/0"
export JWT_SECRET_KEY="your-secret-key"

# Run the service
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Configuration

Key environment variables:

```bash
# Core Configuration
ENVIRONMENT=development
DEBUG=true
DATABASE_URL=postgresql://user:pass@localhost/ofair_db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=your-super-secret-key

# Communication Services
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_FROM_NUMBER=+1234567890

GREENAPI_ID_INSTANCE=your_greenapi_instance
GREENAPI_API_TOKEN=your_greenapi_token

SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth.py -v

# Run specific test
pytest tests/test_auth.py::TestAuthAPIEndpoints::test_send_otp_success -v
```

## OTP Delivery Methods

### 1. WhatsApp (Primary - via GreenAPI)
- Best delivery rates in Israel
- Instant delivery
- Rich message formatting support

### 2. SMS (Secondary - via Twilio)
- Reliable fallback option
- International support
- High delivery rates

### 3. Email (Tertiary)
- HTML formatted messages
- RTL support for Hebrew content
- Reliable for business communications

## Rate Limiting

The service implements comprehensive rate limiting:

### OTP Sending Limits
- 1 OTP per minute per contact
- 5 OTPs per hour per contact  
- 10 OTPs per 24 hours per contact

### Verification Limits
- 5 verification attempts per minute per contact
- 20 verification attempts per hour per contact

### Global Limits
- 3 requests per minute per IP for OTP sending
- 10 requests per minute per IP for verification

## Israeli Phone Number Support

The service includes comprehensive validation for Israeli phone numbers:

**Supported Formats:**
- `0501234567` (local format)
- `+972501234567` (international format)
- `972501234567` (without + prefix)
- `050-123-4567` (with dashes)
- `050 123 4567` (with spaces)

**Supported Prefixes:**
- Mobile: 050, 052, 053, 054, 055, 057, 058
- Landline: 02, 03, 04, 08, 09, 072, 073, 074, 076, 077, 078

## Security Features

- **JWT Token Security**: Secure token generation with configurable expiration
- **Token Revocation**: Individual and bulk token revocation support
- **Rate Limiting**: Multiple layers of rate limiting protection
- **Input Validation**: Comprehensive input validation and sanitization
- **Error Handling**: Secure error responses without information leakage
- **CORS Protection**: Configurable CORS settings for production

## Monitoring & Logging

- **Health Checks**: Comprehensive health monitoring
- **Structured Logging**: JSON-formatted logs with Hebrew support
- **Error Tracking**: Detailed error logging and tracking
- **Performance Metrics**: Built-in performance monitoring

## Hebrew/RTL Support

- **UI Messages**: All API responses include Hebrew translations
- **Email Templates**: RTL-formatted HTML email templates
- **WhatsApp Messages**: Hebrew message templates
- **Phone Validation**: Israeli-specific phone number validation
- **Timezone Support**: Asia/Jerusalem timezone configuration

## Production Deployment

### Environment Setup
```bash
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=WARNING

# Use strong secrets in production
JWT_SECRET_KEY=your-production-secret-256-bit-key

# Configure secure CORS origins
CORS_ORIGINS=https://app.ofair.co.il,https://admin.ofair.co.il
```

### Docker Production Build
```bash
docker build --target prod -t ofair-auth-service:latest .
```

### Health Monitoring
The service provides health checks at `/health` endpoint:

```json
{
  "status": "healthy",
  "service": "auth-service", 
  "version": "1.0.0",
  "environment": "production",
  "dependencies": {
    "redis": "healthy"
  }
}
```

## API Examples

### Send OTP
```bash
curl -X POST "http://localhost:8000/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "contact": "+972501234567",
    "language": "he"
  }'
```

### Verify OTP
```bash
curl -X POST "http://localhost:8000/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{
    "contact": "+972501234567", 
    "otp": "123456"
  }'
```

### Use Token
```bash
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer your-jwt-token"
```

## Support

For issues and questions:
- Check the logs: `docker-compose logs auth-service`
- Run health check: `curl http://localhost:8000/health`
- Run tests: `pytest`

## License

Copyright (c) 2024 OFAIR Platform. All rights reserved.