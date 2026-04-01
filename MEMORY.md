# MEMORY.md — SOFRS-EA Overall System

## Project Overview
- **System:** Smart Office Face Recognition System for Employee Access (SOFRS-EA)
- **Location:** `/Volumes/Personal-Projects/SOFRS-EA-Frontend/`
- **Components:** Contains multiple clients (Desktop, Mobile) and the Backend system.

## Folder Structure
- **Backend (`Backend/SOFRS-EA-Backend`)**: Python backend handling data and facial recognition using DeepFace.
- **Desktop (`Desktop/employee-access`)**: Electron and Vite application for employee access management on desktop.
- **Mobile (`Mobile/employee-access`)**: Expo/React Native application for the mobile frontend (onboarding, face setup, badge).

## Active Tasks
### Completed
- Wrote API endpoints documentation and updated backend README to include team structures and API references.
- Initial folder structure setup.
- Basic implementation of Mobile app (6 screens, context, camera scan).
- Fixed YOLO face detection: removed dual-decoder heuristic, raised area thresholds.
- Fixed backend verification: corrected verifyFace call, `.env` base URL, and health check.
- Enhanced desktop UI: face thumbnail on recognition, employee details card, similarity badge, animated card transitions.
- Mobile camera relay: WebSocket server in Electron for no-webcam fallback, mobile relay-capture screen.
- Vitest test infrastructure for Desktop app (10 passing tests).
- Backend error handling: security fix (API key leak), CRUD/router/utility error guards, input validation, global exception handler, 20 passing tests.
- Desktop UI Pivot: Implemented locked Kiosk idle & scanning screens, alongside a hidden 5-tap gesture-secured Admin Dashboard with CRUD interfaces for Employee and Visitor management matching design specifications.
- Kiosk UI Overhaul: Rebuilt all kiosk views from Figma mockups — overlapping button layout on idle, circular bio-frame camera viewport with animated scan-line, and full Approved/Denied feedback state screens with auto-return logic.

### Next Steps
- Continue development as outlined in sub-project documentation.
- Implement proper enrollment flow (desktop + mobile).
- Run `npm install` in Mobile app to restore `node_modules`.
- Wire up deep-link scheme (`sofrs://`) for relay-capture QR code on mobile.

## Architecture Decisions
- Monorepo-style structure containing the different clients and the backend.
- Face matching relies on the backend, while client apps capture and detect faces.
- YOLOv26s outputs [cx,cy,w,h] format — single-decoder conversion only (no dual-decoder guessing).
- Health check in Electron main process uses native `node:http` (not `import.meta.env`).
- WebSocket relay server in Electron main process for mobile camera fallback (local network only).
- Vitest with jsdom environment for renderer-side unit tests.
- Global exception handler in FastAPI catches all unhandled errors → JSON 500, never leaks stacktraces.
- RequestValidationError handler returns structured 422 with per-field errors.
- CRUD layer wraps all DB calls with try/except; DuplicateKeyError → 409, connectivity → 503.
- Image uploads validated: MIME type whitelist, 10 MB size limit, empty-file rejection.

