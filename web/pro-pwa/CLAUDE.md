# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start development server:**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build
```

**Run linting:**
```bash
npm run lint
```

**Run development build:**
```bash
npm run build:dev
```

**Preview production build:**
```bash
npm run preview
```

**Type checking:**
```bash
npm run typecheck
```

**Run tests:**
```bash
npm test                    # Unit tests
npm run test:watch          # Unit tests in watch mode
npm run test:coverage       # Unit tests with coverage
npm run test:integration    # Integration tests
npm run test:e2e           # End-to-end tests with Playwright
npm run test:e2e:ui        # E2E tests with Playwright UI
```

## Architecture Overview

**Pro-Ofair App** is a professional services marketplace platform built as a React/TypeScript hybrid mobile app using Capacitor. It connects professionals with clients for service requests and lead management.

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: shadcn/ui components + Tailwind CSS
- **State**: React Query + React Context
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Mobile**: Capacitor for iOS/Android deployment
- **Navigation**: React Router with bottom navigation

### Core Domain Models
- **Professionals**: Service providers with profiles and ratings
- **Leads**: Job opportunities that professionals bid on  
- **Proposals**: Bids submitted by professionals for leads
- **Projects**: Accepted work with progress tracking
- **Notifications**: Real-time updates via Supabase subscriptions

### Component Architecture

**Layered structure:**
- `components/ui/` - shadcn/ui base components
- `components/[domain]/` - Feature-specific components (auth, leads, proposals, etc.)
- `pages/` - Route components
- `hooks/` - Custom React hooks for data fetching and state
- `services/` - API abstraction layer for Supabase
- `contexts/` - Global state management

**Key patterns:**
- Authentication via context with protected routes
- Custom hooks for data fetching (useLeads, useProposals, etc.)
- Service layer abstracts Supabase calls
- TypeScript interfaces in `types/` directory
- Mobile-first responsive design

### Supabase Backend

**Edge Functions** handle business logic:
- Lead management (`get-active-leads`, `submit-lead`)
- Proposal workflows (`submit-proposal`, `get-proposals`)
- Project tracking (`insert-project`, `update-project`)
- Payment processing (`update-payment`)
- Notification system (`get-notifications`)

**Database** uses RLS policies with real-time subscriptions for live updates.

### Development Notes

**File organization:**
- Use absolute imports with `@/` alias pointing to `src/`
- Follow existing naming conventions (kebab-case for files, PascalCase for components)
- Place new components in appropriate domain folders

**Styling:**
- Use Tailwind CSS with custom color variables (ofair-blue, ofair-turquoise)
- Follow shadcn/ui component patterns for consistency
- Mobile-first responsive design approach

**State management:**
- Use React Query for server state
- Context for global application state (auth, theme)
- Custom hooks for complex logic

**Type safety:**
- Define interfaces in `types/` directory
- Use Supabase generated types from `integrations/supabase/types.ts`
- Leverage TypeScript for form validation with React Hook Form + Zod

### Authentication & Data Flow

**Authentication pattern:**
- OTP-based login system with phone/email support
- Professional data stored in localStorage with context refresh mechanism
- Protected routes wrap authenticated pages using `ProtectedRoute` component
- Auth state managed via `AuthContext` with professional data caching

**Data fetching strategy:**
- Edge Functions handle all business logic and database operations
- React Query manages server state with automatic caching and refetching
- Custom hooks abstract data fetching logic (e.g., `useLeads`, `useProposals`)
- Real-time updates via Supabase subscriptions for notifications

**Key Edge Functions:**
- `get-active-leads` - Fetch available leads for professionals
- `submit-proposal` - Submit proposals with duplicate checking
- `get-notifications` - Real-time notification system
- `update-project` - Project status and progress tracking

### Mobile Development

**Capacitor configuration:**
- App ID: `com.ofair`
- Uses `capacitor.config.json` for mobile build settings  
- Mobile-first responsive design with bottom navigation
- Biometric authentication support via custom hooks

### Supabase Development

**Database migrations:**
```bash
supabase migration new <migration_name>   # Create new migration
supabase db push                          # Apply migrations to remote
supabase db pull                          # Pull schema changes
supabase db reset                         # Reset local database
```

**Edge Functions:**
```bash
supabase functions serve                  # Serve functions locally
supabase functions deploy <function_name> # Deploy specific function
supabase functions deploy --no-verify-jwt # Deploy with JWT verification disabled
```

**Key Edge Functions (40+ available):**
- Authentication: `send-otp`, `verify-otp`, `validate-token`
- Lead management: `get-active-leads`, `submit-lead`, `delete-lead`, `get-my-leads`
- Proposals: `submit-proposal`, `get-proposals`, `update-proposal-status`
- Projects: `insert-project`, `get-projects`, `update-project`, `update-work-completion`
- Payments: `update-payment`, `check-payment-exists`, `process-icount-payment`
- Media: `upload-image`, `upload-certificate`, `create-media-buckets`

### Testing Architecture

**Test organization:**
- `src/test/unit/` - Jest unit tests for components and utilities
- `src/test/integration/` - Integration tests for Edge Functions
- `src/test/e2e/` - Playwright end-to-end tests
- Coverage threshold: 50% for all metrics (branches, functions, lines, statements)

**Key test commands:**
- Use `npm run test:watch` for development
- Run `npm run test:coverage` before commits
- E2E tests run against `http://localhost:5173` by default