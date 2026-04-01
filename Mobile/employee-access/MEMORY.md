# MEMORY.md — SOFRS Employee Access Frontend

## Project Overview

- **Stack:** Expo 54, React Native 0.81, TypeScript, expo-router v6
- **Location:** `/Volumes/Temp Drive/SOFRS-EA-Frontend/Mobile/employee-access/`
- **Architecture:** Stack-based navigation for onboarding flow → custom drawer dashboard

## Current State

- All 6 screens implemented: Welcome → Identity Verification → Face Setup → Face Scan → Setup Success → Dashboard (Overview + Badge)
- User context (`contexts/user-context.tsx`) manages user data + face scan results across screens
- Custom dark-navy theme (`constants/theme.ts`) matching design mockups
- Face scan uses `expo-camera` with simulated capture fallback for web
- Badge screen has SVG-based QR code placeholder (deterministic pattern from ID)
- ONNX anti-spoofing verification is stubbed — ready for integration with dev build

## Active Tasks

### Completed

- Full onboarding flow with animated fingerprint, identity forms, camera face scan
- Dashboard with sidebar, overview, badge (Apple Wallet-style card)

### Next Steps

- User must run `npm install` to restore `node_modules` (npm cache had permission issues)
- Wire up `react-native-qrcode-svg` for proper QR codes once deps are installed
- Integrate ONNX anti-spoofing model (requires `expo prebuild` for native build)
- Real face-pose detection for directional captures (ML model needed)

## Architecture Decisions

- **No tabs:** App uses stack navigation for linear onboarding, not tabs
- **Context over Redux:** Simple `UserProvider` context for state — no need for Redux in this scope
- **SVG icons:** Using `react-native-svg` Path/Circle instead of icon libraries for full design control
- **Simulated capture mode:** Web and camera-denied environments get a demo capture flow
- **Pluggable verifier:** Face verification is interface-based — stub now, ONNX later

## File Layout

```bash
app/
  _layout.tsx           # Root Stack navigator + UserProvider
  index.tsx             # Welcome Screen
  identity-verification.tsx  # Identity form with role toggle
  face-setup.tsx        # Face ID intro with feature cards
  face-scan.tsx         # Camera capture with oval guide
  setup-success.tsx     # Animated success screen
  (dashboard)/
    _layout.tsx         # Custom drawer sidebar
    index.tsx           # Overview screen
    badge.tsx           # Apple Wallet-style badge card
components/
  FingerprintAnimation.tsx   # SVG fingerprint with scan line animation
constants/
  theme.ts              # Dark navy design tokens
  types.ts              # UserRole, UserData, FaceScanResult types
contexts/
  user-context.tsx      # React Context for user/scan data
```
