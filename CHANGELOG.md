# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Comprehensive backend API documentation mapping all `/employee`, `/visitor`, and `/image` endpoints (`Backend/SOFRS-EA-Backend/api_endpoints.md`).
- Restructured Backend `README.md` to match the frontend team style and link to the new API documentation.
- Built Kiosk mode for the Desktop app, locking the fullscreen UI and offering simple 3-button entry points alongside a live YOLOv26 AI-scanning overlay (`Desktop/employee-access/src/pages/kiosk`).
- Engineered a hidden Admin Hub accessible via a 5-tap secure PIN gesture.
- Constructed active vanilla DOM CRUD manager displays for Employee and Visitor records within the Admin Hub, communicating with the `/visitor/` and `/employee/` backend APIs.
- Overhauled Kiosk UI from Figma mockups: overlapping 3-panel idle button layout, circular bio-frame camera viewport with animated scan-line, and new Approved/Denied feedback state screens (`approved.ts`, `denied.ts`).
