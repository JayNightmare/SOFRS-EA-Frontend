# SOFRS-EA Mobile App

This is the React Native (Expo) mobile frontend for the Smart Office Face Recognition System for Employee Access (SOFRS-EA).

## Prerequisites

- Node.js (v18+)
- npm or yarn
- Expo Go app on your physical device, or an iOS Simulator / Android Emulator

## Setup Instructions

1. **Install dependencies**
   Navigate to the mobile app directory and install the necessary packages.
   ```bash
   cd Mobile/employee-access
   npm install
   ```
   *(Note: If you encounter issues with `node_modules`, ensure you have the correct permissions and clear your npm cache if necessary).*

2. **Environment Configuration**
   Copy the example environment file and update it with your backend details.
   ```bash
   cp .env.example .env
   ```
   Update the `.env` file with your credentials:
   - `EXPO_PUBLIC_API_BASE_URL`: URL of the backend service (default: `http://localhost:8000`)
   - `EXPO_PUBLIC_API_KEY`: Your API Key for backend communication

3. **Start the Development Server**
   Start Expo's local server:
   ```bash
   npm start
   ```
   From the terminal interface, you can:
   - Press `a` to open in Android Emulator
   - Press `i` to open in iOS Simulator
   - Scan the QR code using the Expo Go application on your physical device

## Project Details

This app is built with Expo 54 and React Native 0.81. It utilizes Expo Router (v6) for stack-based navigation through a custom 6-screen onboarding flow (Welcome -> Identity Verification -> Face Setup -> Face Scan -> Setup Success -> Dashboard). It integrates `expo-camera` for capturing facial data, which can then be securely sent to the SOFRS-EA backend for processing.
