# Frontend Technical Reference

## Scope

This document describes implemented frontend behavior across:

1. Desktop kiosk application
2. Mobile onboarding application
3. API integration contracts with backend
4. Response handling and state flow

## Desktop Application

Location:

- Desktop/employee-access

## Architecture model

1. Electron main process initializes kiosk window and runtime services
2. Renderer uses view-based navigation with async screen transitions
3. Pages are composed from TypeScript modules and DOM components

Key files:

1. Desktop/employee-access/src/main.ts
2. Desktop/employee-access/src/renderer.ts
3. Desktop/employee-access/src/pages/kiosk

## Runtime behavior

1. Starts in kiosk mode with media permission handling
2. Performs backend health probe on launch
3. Hosts relay WebSocket server for camera fallback scenarios
4. Uses face detection quality checks before capture during registration/check-in

## Core desktop flows

### Kiosk registration flow

Implemented in:

- Desktop/employee-access/src/pages/kiosk/register.ts

Behavior:

1. Collect profile details for employee or visitor
2. Call create API endpoint to get owner ID
3. Guide user through five required poses
4. Validate face quality and stability before each capture
5. Upload captured images array to backend /image/upload

### Kiosk check-in flow

Implemented in:

- Desktop/employee-access/src/pages/kiosk/scan.ts
- Desktop/employee-access/src/services/verification.ts

Behavior:

1. Capture image from camera
2. Submit to /image/search
3. Normalize backend payload into local VerifyFaceResponse format
4. Render recognized or not-recognized states in UI
5. Use confidence and result metadata for confirmation actions

## Desktop API contract layer

Implemented in:

- Desktop/employee-access/src/api.ts

Common request model highlights:

1. EmployeeCreate and VisitorCreate:
      - fullName required
      - gender, DoB, email, Phone optional
2. Image upload:
      - owner_id + files[] multipart form data
3. Image search:
      - image multipart form data

## Recognition response normalization

Implemented in:

- Desktop/employee-access/src/services/verification.ts

Behavior:

1. Maps backend payload to local VerifyFaceResponse fields
2. Extracts owner object from employee or visitor branch
3. Derives recognized flag from explicit value or message prefix fallback
4. Handles similarity normalization logic for displayed value
5. Extracts best-match image data URL from known backend keys

## Mobile Application

Location:

- Mobile/employee-access

## Architecture model

1. Expo Router stack navigation with hidden headers
2. UserProvider context wraps app root
3. Context stores user data, face captures, and backend-created record ID

Key files:

1. Mobile/employee-access/app/\_layout.tsx
2. Mobile/employee-access/contexts/user-context.tsx
3. Mobile/employee-access/app/identity-verification.tsx
4. Mobile/employee-access/app/face-scan.tsx
5. Mobile/employee-access/lib/api.ts

## Core mobile flows

### Identity creation flow

Implemented in:

- Mobile/employee-access/app/identity-verification.tsx

Behavior:

1. User chooses role (employee or visitor)
2. User enters profile details
3. App validates date format as YYYY-MM-DD when provided
4. App calls createEmployee or createVisitor
5. App stores returned record ID in context
6. App routes to face setup and then face scan

### Face scan and upload flow

Implemented in:

- Mobile/employee-access/app/face-scan.tsx

Behavior:

1. Captures five pose images in sequence
2. Stores each capture in local screen state and context
3. Builds multipart upload file array
4. Calls uploadImages(recordId, files)
5. Supports retry on upload error
6. Supports simulated flow in no-camera/demo situations

## Mobile API contract layer

Implemented in:

- Mobile/employee-access/lib/api.ts

Contract parity with desktop for core operations:

1. createEmployee
2. createVisitor
3. searchImage
4. uploadImages

All requests include X-API-Key header from environment.

## Shared Frontend-Backend Contract Notes

1. Optional phone field uses key name Phone (capital P)
2. Date of birth is sent in DoB key, expected as date-compatible format
3. Recognition UI relies on response keys including message, employee or visitor, similarity, and image payload fields
4. For current desktop logic, backend message wording influences inferred recognition state when explicit recognized flag is absent

## User State Handling

Context shape from mobile:

1. userData
2. faceScanResult
3. recordId
4. reset helper for logout/session reset

Desktop uses local page state and callback-driven navigation rather than a global state container.

## Error Handling in Frontends

Desktop:

1. Uses ApiError mapping with status/detail extraction
2. Displays operational feedback for registration and scan paths

Mobile:

1. Uses ApiError for backend failures
2. Shows user-facing upload and submission errors
3. Provides retry actions for failed image uploads

## Report Traceability Notes

For report evidence, use these files as primary citations:

1. Desktop behavior: Desktop/employee-access/src/pages/kiosk/register.ts
2. Desktop recognition mapping: Desktop/employee-access/src/services/verification.ts
3. Mobile form and record creation: Mobile/employee-access/app/identity-verification.tsx
4. Mobile capture and upload: Mobile/employee-access/app/face-scan.tsx
5. API contracts: Desktop/employee-access/src/api.ts and Mobile/employee-access/lib/api.ts
