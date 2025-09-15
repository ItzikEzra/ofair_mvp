# User Flows Analysis

## Overview

This document provides a comprehensive analysis of all user flows in the Pro-Ofair application, including detailed step-by-step descriptions and Mermaid flowcharts for each main user journey.

## Core User Types

1. **Professionals**: Service providers who create leads and submit proposals
2. **Clients**: Service seekers who submit requests and accept quotes
3. **Administrators**: System managers who oversee the platform

## Authentication Flows

### 1. Professional OTP Registration Flow

```mermaid
flowchart TD
    A[Professional opens app] --> B[Click 'Register']
    B --> C[Enter phone number]
    C --> D[Submit registration form]
    D --> E[Backend validates phone]
    E --> F{Phone valid?}
    F -->|No| G[Show error message]
    F -->|Yes| H[Generate OTP]
    H --> I[Send SMS to phone]
    I --> J[Show OTP input screen]
    J --> K[User enters OTP]
    K --> L[Submit OTP]
    L --> M[Backend validates OTP]
    M --> N{OTP valid?}
    N -->|No| O[Show error, retry]
    N -->|Yes| P[Create professional record]
    P --> Q[Generate auth token]
    Q --> R[Store token in auth_tokens table]
    R --> S[Return token to client]
    S --> T[Store token in localStorage]
    T --> U[Redirect to profile setup]
    U --> V[Complete profile information]
    V --> W[Submit profile]
    W --> X[Mark as verified]
    X --> Y[Redirect to dashboard]
    
    G --> C
    O --> J
    
    style A fill:#e1f5fe
    style Y fill:#c8e6c9
    style G fill:#ffcdd2
    style O fill:#ffcdd2
```

**Step-by-Step Description:**
1. Professional opens the app and clicks "Register"
2. Enters phone number in registration form
3. System validates phone number format and uniqueness
4. If valid, generates 6-digit OTP code
5. Sends SMS with OTP to provided phone number
6. User enters OTP in verification screen
7. System validates OTP against stored value
8. If valid, creates professional record with user_id = null
9. Generates unique auth token and stores in auth_tokens table
10. Returns token to client for storage in localStorage
11. Redirects to profile setup screen
12. User completes profile information (name, profession, areas, etc.)
13. System marks professional as verified
14. Redirects to main dashboard

**Error Handling:**
- Invalid phone format: Shows validation error
- Phone already registered: Shows error message
- OTP expired: Allows resending OTP
- Invalid OTP: Shows error with retry option
- Network errors: Shows retry dialog

### 2. Professional Login Flow

```mermaid
flowchart TD
    A[Professional opens app] --> B[Click 'Login']
    B --> C[Enter phone number]
    C --> D[Submit login form]
    D --> E[Backend finds professional by phone]
    E --> F{Professional exists?}
    F -->|No| G[Show 'Register first' message]
    F -->|Yes| H[Generate OTP]
    H --> I[Send SMS to phone]
    I --> J[Show OTP input screen]
    J --> K[User enters OTP]
    K --> L[Submit OTP]
    L --> M[Backend validates OTP]
    M --> N{OTP valid?}
    N -->|No| O[Show error, retry]
    N -->|Yes| P[Find existing professional]
    P --> Q[Generate new auth token]
    Q --> R[Deactivate old tokens]
    R --> S[Store new token in auth_tokens]
    S --> T[Return token to client]
    T --> U[Store token in localStorage]
    U --> V[Load professional data]
    V --> W[Redirect to dashboard]
    
    G --> A
    O --> J
    
    style A fill:#e1f5fe
    style W fill:#c8e6c9
    style G fill:#ffcdd2
    style O fill:#ffcdd2
```

## Lead Management Flows

### 3. Lead Creation Flow

```mermaid
flowchart TD
    A[Professional in dashboard] --> B[Click 'Submit Lead']
    B --> C[Lead creation form]
    C --> D[Fill basic information]
    D --> E[Add location via Google Places]
    E --> F[Upload images/media]
    F --> G[Set pricing and commission]
    G --> H[Add work schedule]
    H --> I[Review lead details]
    I --> J[Submit lead]
    J --> K[Backend validation]
    K --> L{Valid data?}
    L -->|No| M[Show validation errors]
    L -->|Yes| N[Extract location coordinates]
    N --> O[Process media uploads]
    O --> P[Create lead record]
    P --> Q[Generate notifications]
    Q --> R[Notify relevant professionals]
    R --> S[Show success message]
    S --> T[Redirect to My Leads]
    T --> U[Lead appears in listings]
    
    M --> C
    
    style A fill:#e1f5fe
    style U fill:#c8e6c9
    style M fill:#ffcdd2
```

**Step-by-Step Description:**
1. Professional navigates to lead creation from dashboard
2. Fills out lead form with title, description, category
3. Selects location using Google Places autocomplete
4. Uploads relevant images or media files
5. Sets budget range and commission percentage
6. Specifies work schedule and timeline
7. Reviews all entered information
8. Submits lead for processing
9. Backend validates all fields and media
10. Extracts geographic coordinates from location
11. Processes and stores media in Supabase Storage
12. Creates lead record in database
13. Generates notifications for matching professionals
14. Returns success confirmation to user
15. Redirects to "My Leads" page where lead appears

### 4. Proposal Submission Flow

```mermaid
flowchart TD
    A[Professional views lead] --> B[Click 'Submit Proposal']
    B --> C[Proposal form modal]
    C --> D[Enter price/description]
    D --> E[Add estimated completion]
    E --> F[Upload sample work]
    F --> G[Set scheduling preferences]
    G --> H[Review proposal]
    H --> I[Submit proposal]
    I --> J[Backend validation]
    J --> K{Valid proposal?}
    K -->|No| L[Show validation errors]
    K -->|Yes| M[Check for duplicates]
    M --> N{Duplicate proposal?}
    N -->|Yes| O[Show duplicate error]
    N -->|No| P[Create proposal record]
    P --> Q[Notify lead owner]
    Q --> R[Update lead proposal count]
    R --> S[Show success message]
    S --> T[Close modal]
    T --> U[Update UI state]
    U --> V[Proposal appears in submissions]
    
    L --> C
    O --> C
    
    style A fill:#e1f5fe
    style V fill:#c8e6c9
    style L fill:#ffcdd2
    style O fill:#ffcdd2
```

## Request/Quote Management Flows

### 5. Client Request Submission Flow

```mermaid
flowchart TD
    A[Client opens app] --> B[Click 'Submit Request']
    B --> C[Request form]
    C --> D[Fill request details]
    D --> E[Select category/profession]
    E --> F[Add location]
    F --> G[Upload photos/media]
    G --> H[Set timing preferences]
    H --> I[Review request]
    I --> J[Submit request]
    J --> K[Backend validation]
    K --> L{Valid request?}
    L -->|No| M[Show validation errors]
    L -->|Yes| N[Create request record]
    N --> O[Process media uploads]
    O --> P[Extract location data]
    P --> Q[Find matching professionals]
    Q --> R[Send notifications]
    R --> S[Show success message]
    S --> T[Redirect to request status]
    T --> U[Wait for quotes]
    
    M --> C
    
    style A fill:#e1f5fe
    style U fill:#c8e6c9
    style M fill:#ffcdd2
```

### 6. Quote Submission Flow

```mermaid
flowchart TD
    A[Professional views request] --> B[Click 'Submit Quote']
    B --> C[Quote form modal]
    C --> D[Enter price/estimate]
    D --> E[Add description]
    E --> F[Set estimated time]
    F --> G[Upload sample work]
    G --> H[Set availability]
    H --> I[Review quote]
    I --> J[Submit quote]
    J --> K[Backend validation]
    K --> L{Valid quote?}
    L -->|No| M[Show validation errors]
    L -->|Yes| N[Create quote record]
    N --> O[Notify client]
    O --> P[Update request status]
    P --> Q[Show success message]
    Q --> R[Close modal]
    R --> S[Quote appears in submissions]
    
    M --> C
    
    style A fill:#e1f5fe
    style S fill:#c8e6c9
    style M fill:#ffcdd2
```

## Work Completion Flows

### 7. Work Completion Flow

```mermaid
flowchart TD
    A[Professional in dashboard] --> B[View accepted work]
    B --> C[Click 'Complete Work']
    C --> D[Work completion form]
    D --> E[Enter final amount]
    E --> F[Select payment method]
    F --> G[Add completion notes]
    G --> H[Review completion]
    H --> I[Submit completion]
    I --> J[Backend validation]
    J --> K{Valid completion?}
    K -->|No| L[Show validation errors]
    K -->|Yes| M[Verify professional ownership]
    M --> N{Authorized?}
    N -->|No| O[Show permission error]
    N -->|Yes| P[Calculate commissions]
    P --> Q[Create payment record]
    Q --> R[Update work status]
    R --> S[Notify relevant parties]
    S --> T[Show success message]
    T --> U[Update dashboard]
    U --> V[Work marked as completed]
    
    L --> D
    O --> D
    
    style A fill:#e1f5fe
    style V fill:#c8e6c9
    style L fill:#ffcdd2
    style O fill:#ffcdd2
```

**Step-by-Step Description:**
1. Professional views dashboard with accepted work items
2. Clicks "Complete Work" button on a work item
3. Opens work completion form modal
4. Enters final payment amount
5. Selects payment method (cash, credit, bank transfer, etc.)
6. Adds optional completion notes
7. Reviews all completion details
8. Submits work completion
9. Backend validates all required fields
10. Verifies professional owns the work item
11. Calculates OFAIR commission and any revenue sharing
12. Creates payment record in appropriate table
13. Updates work status to 'completed'
14. Sends notifications to relevant parties
15. Returns success confirmation
16. Updates dashboard UI to reflect completion

### 8. Client Details Access Flow

```mermaid
flowchart TD
    A[Professional views work item] --> B[Click 'Show Client Details']
    B --> C[Backend authorization check]
    C --> D{Authorized access?}
    D -->|No| E[Show permission error]
    D -->|Yes| F[Query client information]
    F --> G[Fetch from requests/user_profiles]
    G --> H[Format client data]
    H --> I[Return client details]
    I --> J[Display client dialog]
    J --> K[Show contact information]
    K --> L[Enable contact actions]
    L --> M[Click phone to call]
    M --> N[Click email to send]
    N --> O[Close dialog]
    
    E --> A
    
    style A fill:#e1f5fe
    style O fill:#c8e6c9
    style E fill:#ffcdd2
```

## Notification System Flows

### 9. Real-time Notification Flow

```mermaid
flowchart TD
    A[User action triggers event] --> B[Create notification record]
    B --> C[Insert into notifications table]
    C --> D[Supabase realtime triggers]
    D --> E[Push to subscribed clients]
    E --> F[Client receives notification]
    F --> G[Update notification count]
    G --> H[Show notification badge]
    H --> I[User clicks notification]
    I --> J[Navigate to relevant page]
    J --> K[Mark notification as read]
    K --> L[Update UI state]
    L --> M[Remove from unread count]
    
    style A fill:#e1f5fe
    style M fill:#c8e6c9
```

## Error Handling Patterns

### Common Error Scenarios

1. **Network Connectivity Issues**
   - Show retry dialog with exponential backoff
   - Cache requests for offline handling
   - Provide clear error messages

2. **Authentication Failures**
   - Redirect to login screen
   - Clear stored tokens
   - Show appropriate error messages

3. **Validation Errors**
   - Highlight invalid fields
   - Show specific error messages
   - Allow easy correction

4. **Permission Errors**
   - Show clear permission denied messages
   - Suggest appropriate actions
   - Log security events

## UX Consistency Analysis

### Navigation Patterns
- **Bottom Navigation**: Consistent across all main sections
- **Back Button**: Always available in sub-pages
- **Modal Dialogs**: Consistent styling and behavior
- **Loading States**: Skeleton screens for better UX

### Form Patterns
- **Consistent Validation**: Real-time validation feedback
- **Error States**: Clear error messaging
- **Success States**: Confirmation messages and redirects
- **Loading States**: Disabled buttons during submission

### Data Display Patterns
- **Card Layouts**: Consistent card designs
- **Empty States**: Helpful empty state messages
- **Pagination**: Consistent pagination controls
- **Filtering**: Similar filter interfaces

## Potential Friction Points

### High Friction Areas
1. **OTP Verification**: SMS delays can frustrate users
2. **Image Upload**: Large images may upload slowly
3. **Location Selection**: Google Places API can be slow
4. **Form Validation**: Complex forms with many required fields

### Medium Friction Areas
1. **Navigation Depth**: Some features require multiple clicks
2. **Data Loading**: Initial data loading can be slow
3. **Search Functionality**: Limited search capabilities
4. **Filter Options**: Complex filtering may confuse users

### Recommendations for Improvement
1. **Reduce OTP Dependency**: Consider alternative authentication methods
2. **Optimize Image Handling**: Implement client-side compression
3. **Improve Loading States**: Add skeleton screens and progress indicators
4. **Simplify Forms**: Break complex forms into steps
5. **Add Search**: Implement comprehensive search functionality
6. **Enhance Filters**: Simplify filter interfaces

## Mobile-Specific Considerations

### Touch Interactions
- **Button Sizing**: Appropriately sized for touch
- **Gesture Support**: Swipe gestures where appropriate
- **Haptic Feedback**: Provide tactile feedback

### Performance Considerations
- **Lazy Loading**: Implement for images and lists
- **Data Caching**: Cache frequently accessed data
- **Bundle Optimization**: Minimize JavaScript bundle size

### Platform Integration
- **Camera Access**: Seamless photo capture
- **Location Services**: Accurate location detection
- **Push Notifications**: Timely notification delivery

## Accessibility Considerations

### Visual Accessibility
- **Color Contrast**: Ensure sufficient contrast ratios
- **Font Sizes**: Support system font size preferences
- **Focus States**: Clear focus indicators

### Interactive Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Proper ARIA labels
- **Voice Control**: Support for voice commands

### Cognitive Accessibility
- **Clear Navigation**: Intuitive navigation patterns
- **Consistent Layouts**: Predictable interface patterns
- **Error Prevention**: Clear validation and error messages

This comprehensive user flow analysis provides a foundation for understanding user interactions and identifying opportunities for improvement in the Pro-Ofair application.