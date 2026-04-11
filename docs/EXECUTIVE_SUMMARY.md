# SOFRS-EA Executive Summary

## System Intent

SOFRS-EA is a biometric access system with two client applications (Desktop kiosk and Mobile onboarding) connected to a shared backend service for identity enrollment and face-based recognition.

The platform supports:

1. Employee and visitor profile creation
2. Multi-pose enrollment image capture and upload
3. Face search against enrolled images
4. Verification-driven confirmation before returning a recognized identity

## Architecture in One View

1. Desktop app and Mobile app call backend API over HTTP with X-API-Key authentication.
2. Backend persists profile records to MongoDB.
3. Backend stores processed enrollment images in local image storage.
4. Backend performs facial search, analysis, and verification using DeepFace-based utilities.

## Operational Workflow Summary

## Enrollment

1. Frontend submits profile details.
2. Backend creates Employee or Visitor record and returns generated ID.
3. Frontend captures multiple face poses.
4. Frontend uploads pose images linked to the generated ID.

## Recognition

1. Frontend submits a newly captured face image.
2. Backend validates image and required face quality.
3. Backend searches nearest identity candidates.
4. Backend performs confirmation with pairwise verification against reference images.
5. Backend returns one of four outcomes:
      - no match
      - ambiguous match
      - candidate found but not confirmed
      - confirmed match

## Why This Design Matters

1. Multi-pose enrollment increases robustness across user head orientation.
2. Candidate search plus verification reduces false-positive risk versus single-pass matching.
3. Explicit response branches provide deterministic frontend behavior for UX and auditability.
4. Shared API contracts across desktop and mobile ensure consistent data handling.

## Security and Reliability Posture

1. Protected business routes require API key headers.
2. Image search applies temporary per-client blocking after repeated invalid submissions.
3. Backend uses centralized error wrapping and structured logging.
4. Startup health endpoint includes runtime warmup status for diagnostics.

## Main Technical Constraints

1. Matching performance depends on enrolled image quality and pose coverage.
2. Soft-attribute analysis may be withheld for low-confidence or side-profile faces.
3. Current desktop response mapper can infer recognition from message text when explicit flags are missing.

## Recommended Report Citation Map

Use this summary with detailed evidence from:

1. SYSTEM_OVERVIEW.md for architecture framing
2. BACKEND_REFERENCE.md for logic and schema details
3. FRONTEND_REFERENCE.md for client behavior and API integration
4. INTEGRATION_FLOWS.md for step-by-step sequence narratives and payload examples
5. REPORT_TRACEABILITY_MATRIX.md for claim-to-source mapping
