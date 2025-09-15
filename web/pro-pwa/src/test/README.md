# Testing Setup for Pro-Ofair App

This directory contains the comprehensive testing setup for the Pro-Ofair application, including unit tests, integration tests, and end-to-end tests.

## Test Structure

```
src/test/
├── unit/           # Unit tests for components and hooks
├── integration/    # Integration tests for Edge Functions
├── e2e/           # End-to-end tests with Playwright
├── mocks/         # Mock data and MSW handlers
└── setup.ts       # Jest test configuration
```

## Test Types

### Unit Tests
- **Location**: `src/test/unit/`
- **Framework**: Jest + React Testing Library
- **Purpose**: Test individual components and hooks in isolation
- **Run**: `npm run test`

### Integration Tests
- **Location**: `src/test/integration/`
- **Framework**: Jest with Supabase client
- **Purpose**: Test Edge Functions and database interactions
- **Run**: `npm run test:integration`

### End-to-End Tests
- **Location**: `src/test/e2e/`
- **Framework**: Playwright
- **Purpose**: Test complete user workflows
- **Run**: `npm run test:e2e`

## Running Tests

### Development
```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### CI/CD
Tests are automatically run in GitHub Actions on:
- Push to `main` or `develop` branches
- Pull requests to `main`

## Test Configuration

### Jest Configuration
- **Config**: `jest.config.js`
- **Setup**: `src/test/setup.ts`
- **Environment**: jsdom for React components
- **Coverage**: 70% threshold for all metrics

### Playwright Configuration
- **Config**: `playwright.config.ts`
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Base URL**: `http://localhost:5173` (development) or CI environment

## Mock Data

### MSW (Mock Service Worker)
- **Setup**: `src/test/mocks/server.ts`
- **Handlers**: `src/test/mocks/handlers.ts`
- **Data**: `src/test/mocks/mockData.ts`

Mocks all Supabase API calls including:
- Authentication
- Edge Functions
- Database queries
- File uploads

## Environment Variables

### CI Environment
Required secrets in GitHub Actions:
- `SUPABASE_ACCESS_TOKEN`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CODECOV_TOKEN` (optional)

### Local Testing
Create `.env.test` file:
```env
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Writing Tests

### Unit Test Example
```typescript
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from '@/components/MyComponent';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('MyComponent', () => {
  it('should render correctly', () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

### Integration Test Example
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Edge Function', () => {
  it('should process data correctly', async () => {
    const { data, error } = await supabase.functions.invoke('my-function', {
      body: { testData: 'value' }
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });
});
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test';

test('user can complete workflow', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText('Success')).toBeVisible();
});
```

## Best Practices

### Unit Tests
- Test component behavior, not implementation details
- Use semantic queries (`getByRole`, `getByLabelText`)
- Mock external dependencies
- Test error states and edge cases

### Integration Tests
- Test Edge Functions with real Supabase instance
- Verify data transformation and business logic
- Test error handling and validation

### E2E Tests
- Test critical user journeys
- Use data-testid attributes sparingly
- Focus on user-facing functionality
- Test responsive design with mobile devices

## Troubleshooting

### Common Issues

1. **Tests timeout**: Increase timeout in configuration
2. **MSW not working**: Ensure server is started in setup
3. **Supabase connection fails**: Check environment variables
4. **Playwright browser issues**: Run `npx playwright install`

### Debug Commands
```bash
# Debug Jest tests
npm run test -- --verbose

# Debug with coverage
npm run test:coverage -- --verbose

# Debug E2E tests
npm run test:e2e -- --debug

# Run specific test file
npm run test -- MyComponent.test.tsx
```

## Coverage Reports

Coverage reports are generated in the `coverage/` directory:
- `coverage/lcov-report/index.html` - HTML report
- `coverage/lcov.info` - LCOV format for CI tools

## Continuous Integration

The CI pipeline includes:
1. **Lint & TypeScript Check** - Code quality validation
2. **Unit Tests** - Component and hook testing
3. **Integration Tests** - Edge Function testing
4. **E2E Tests** - Full workflow testing
5. **Build Verification** - Production build testing
6. **Security Scan** - Vulnerability detection

All tests must pass before code can be merged to main branch.