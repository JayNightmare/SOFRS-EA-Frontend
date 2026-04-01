# SOFRS-EA Desktop App

> [!IMPORTANT]
> JUMP TO [TODO](#todo)

This is the Electron and Vite-based desktop application for the Smart Office Face Recognition System for Employee Access (SOFRS-EA).

## Prerequisites

- Node.js (v18+)
- npm or yarn

## Setup Instructions

1. **Install dependencies**
   Navigate to the desktop app directory and install the necessary packages.

   ```bash
   cd Desktop/employee-access
   npm install
   ```

2. **Environment Configuration**
   Copy the example environment file to configure your local settings.

   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with the following variables:
   - `YOLO_FACE_MODEL_PATH`: Set this to the absolute or relative path of the YOLO ONNX face model.
   - `VITE_API_BASE_URL`: The URL of your local or remote backend (default: `http://localhost:8000`)
   - `VITE_API_KEY`: Your authentication key for the backend API.

3. **Start the Development Server**
   Using Electron Forge to start the application in development mode:

   ```bash
   npm start
   ```

   This will spin up Vite's dev server and launch the native Electron window.

4. **Building for Production**
   To package the app for your local operating system (creates the executable without installers):

   ```bash
   npm run package
   ```

   To create distributable installers (.zip, .deb, .rpm, .squirrel):

   ```bash
   npm run make
   ```

## Project Details

The application is built using Electron Forge with the Vite plugin to provide a fast and reactive developer experience. It relies on `ultralytics` and `onnxruntime-node` for local, fast facial tracking and boundary detection, before interacting with the main SOFRS-EA Backend to perform deep verification or enrollment.

## TODO

- [ ] Add music to the app
- [ ] Fix Icons by adding a size parameter to the icon components
- [ ] Loading screens when app is starting, closing, or loading a new page/component to the page
- [ ] Add a settings page to configure the app
- [ ] Camera checker to see if camera meets minimum requirements
  - [ ] Add QR code with deeplink to app for easy setup/face detection
