# SOFRS-EA - Frontend

This repo will be for the Smart Office Face Recognition System for Employee Access frontend system which will handle the facial tracking and detections.

## Table of Contents

- [SOFRS-EA - Frontend](#sofrs-ea---frontend)
     - [Table of Contents](#table-of-contents)
     - [Project Structure](#project-structure)
     - [Reference Documentation](#reference-documentation)
     - [Setup Node (AI Computer)](#setup-node-ai-computer)
     - [Team](#team)
          - [Team Lead](#team-lead)
          - [Backend Developer](#backend-developer)
          - [DevOps Engineer](#devops-engineer)
          - [Data Scientist](#data-scientist)
          - [Frontend Developer](#frontend-developer)

## Project Structure

<img width="3048" height="3880" alt="diagram" src="https://github.com/user-attachments/assets/24182b38-4678-49dc-a9c1-cd22f5ef0302" />

This repository contains the following main components:

- **`Desktop/employee-access/`**: The Electron and Vite-based desktop application for employee access management.
- **`Mobile/employee-access/`**: The React Native (Expo) mobile application providing the mobile frontend interface for onboarding, facial scanning, and employee badge generation.

## Reference Documentation

Report-ready technical references are available under [`docs/`](docs/):

- [`docs/EXECUTIVE_SUMMARY.md`](docs/EXECUTIVE_SUMMARY.md): High-level summary suitable for report introductions.
- [`docs/SYSTEM_OVERVIEW.md`](docs/SYSTEM_OVERVIEW.md): End-to-end architecture and responsibilities.
- [`docs/BACKEND_REFERENCE.md`](docs/BACKEND_REFERENCE.md): Backend logic, schemas, API contracts, and recognition pipeline.
- [`docs/FRONTEND_REFERENCE.md`](docs/FRONTEND_REFERENCE.md): Desktop and mobile frontend architecture and backend integration.
- [`docs/INTEGRATION_FLOWS.md`](docs/INTEGRATION_FLOWS.md): Sequence-style flows and payload examples for enrollment and recognition.
- [`docs/REPORT_TRACEABILITY_MATRIX.md`](docs/REPORT_TRACEABILITY_MATRIX.md): Claim-to-source mapping for report citations.
- [`docs/API_RESPONSE_SCHEMA_APPENDIX.md`](docs/API_RESPONSE_SCHEMA_APPENDIX.md): JSON schema appendix for major API responses.

## Setup Node (AI Computer)

Run `\. "$HOME/.nvm/nvm.sh"` to enable Node on the AI computers in Kingston University.

## Team

### Team Lead

This person is responsible for ensuring that the project stays on track and that the team is meeting its deadlines.

<div align=center>

| Jay | <img src="https://avatars.githubusercontent.com/u/34739807?v=4" width="100" height="100"> | [GitHub](https://github.com/JayNightmare) |
| --- | ----------------------------------------------------------------------------------------- | ----------------------------------------- |

</div>

### Backend Developer

This team will work on the facial recognition, relying on the Frontend team to provide the required detection (via a screenshot).

<div align=center>

| Connor | <img src="https://avatars.githubusercontent.com/u/90541152?v=4" width="100" height="100"> | [GitHub](https://github.com/cwalsh-developer) |
| ------ | ----------------------------------------------------------------------------------------- | --------------------------------------------- |

</div>

### DevOps Engineer

This person is responsible for the deployment and maintenance of the project.

<div align=center>

| Adem | <img src="https://avatars.githubusercontent.com/u/109536482?s=130&v=4" width="100" height="100"> | [GitHub](https://github.com/Adem-grp) |
| ---- | ------------------------------------------------------------------------------------------------ | ------------------------------------- |

</div>

### Data Scientist

This person is responsible for the data collection and analysis of the project.

<div align=center>

| Javier | <img src="https://avatars.githubusercontent.com/u/268915589?s=130&v=4" width="100" height="100"> | [GitHub](https://github.com/javier-clarke) |
| ------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------ |

</div>

### Frontend Developer

This team will work on the facial tracking, ensuring that the camera detects the users face (based on boundary box requirements) and returns back the correct schema.

<div align=center>

| Jay | <img src="https://avatars.githubusercontent.com/u/34739807?v=4" width="100" height="100"> | [GitHub](https://github.com/JayNightmare) |
| --- | ----------------------------------------------------------------------------------------- | ----------------------------------------- |

</div>
