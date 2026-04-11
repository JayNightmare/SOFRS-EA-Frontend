# Backend Technical Reference

## Scope

This document describes implemented backend behavior for:

1. API structure
2. Data schemas
3. Image upload and search logic
4. Facial detection, recognition, and verification
5. Response payloads consumed by frontend applications

Repository root for this component:

- Backend/SOFRS-EA-Backend

## Runtime Architecture

## Framework and startup model

1. FastAPI application with lifespan startup/shutdown management
2. MongoDB initialization during startup
3. Optional DeepFace warmup thread on startup when enabled by environment
4. CORS middleware for configured origins and localhost development

Primary entry point:

- Backend/SOFRS-EA-Backend/backend/main.py

## Route grouping

Mounted route groups:

1. /employee
2. /visitor
3. /image

Health endpoint:

1. GET /health
      - Returns backend health status and DeepFace warmup status object

## Authentication Model

Protected routers use the shared dependency in:

- Backend/SOFRS-EA-Backend/backend/core/dependencies.py

Behavior:

1. Header required: X-API-Key
2. Missing backend API key config returns HTTP 500
3. Invalid key returns HTTP 403

## Data Model and Schemas

## Employee

Persistence model:

- Backend/SOFRS-EA-Backend/backend/models/Employee.py

API schemas:

- Backend/SOFRS-EA-Backend/backend/schemas/Employee.py

| Field       | Type   | Required in Create | Notes                              |
| ----------- | ------ | ------------------ | ---------------------------------- |
| id          | string | generated          | Prefix EA + 6 alphanumeric         |
| fullName    | string | yes                | Primary person label               |
| employee_id | string | no                 | Optional extra employee identifier |
| gender      | string | no                 | Optional                           |
| DoB         | date   | no                 | ISO date in API payloads           |
| email       | string | no                 | Optional                           |
| Phone       | string | no                 | Optional; capital P naming         |

## Visitor

Persistence model:

- Backend/SOFRS-EA-Backend/backend/models/Visitor.py

API schemas:

- Backend/SOFRS-EA-Backend/backend/schemas/Visitor.py

| Field    | Type   | Required in Create | Notes                      |
| -------- | ------ | ------------------ | -------------------------- |
| id       | string | generated          | Prefix VA + 6 alphanumeric |
| fullName | string | yes                | Primary person label       |
| gender   | string | no                 | Optional                   |
| DoB      | date   | no                 | ISO date in API payloads   |
| email    | string | no                 | Optional                   |
| Phone    | string | no                 | Optional; capital P naming |

## CRUD Endpoint Contracts

Employee router:

- Backend/SOFRS-EA-Backend/backend/routers/Employee.py

Visitor router:

- Backend/SOFRS-EA-Backend/backend/routers/Visitor.py

Summary:

1. GET /employee/get/employees
2. GET /employee/get/employees/{id\_}
3. POST /employee/create
4. PATCH /employee/update/employees/{id\_}
5. DELETE /employee/delete/employees/{id\_}
6. GET /visitor/get/visitors
7. GET /visitor/get/visitors/{id\_}
8. POST /visitor/create
9. PATCH /visitor/update/visitors/{id\_}
10. DELETE /visitor/delete/visitors/{id\_}

ID validation rules:

1. Employee IDs must be EA-prefixed and valid format
2. Visitor IDs must be VA-prefixed and valid format

## Image Upload and Search Endpoints

Implementation:

- Backend/SOFRS-EA-Backend/backend/routers/Image.py

## POST /image/upload

Purpose:

1. Upload one or more enrollment images for an existing employee or visitor

Input:

1. Form field owner_id
2. Form field files[]

Validation and behavior:

1. Rejects unsupported MIME types
2. Verifies owner type from ID prefix and confirms record exists
3. Processes image before saving
4. Stores files with owner-prefixed timestamped names

Success response shape:

```json
{
	"owner_id": "EAABC123",
	"owner_type": "employee",
	"uploaded": [
		"temp_images/EAABC123_20260411_102030_123456_face_0.jpg",
		"temp_images/EAABC123_20260411_102031_111111_face_1.jpg"
	]
}
```

## POST /image/search

Purpose:

1. Identify returning person from uploaded face image
2. Produce match decision and optional profile data

Input:

1. Form field image
2. Optional form field database_path default temp_images

### Search response branches

No match branch:

```json
{
	"message": "Welcome new visitor!",
	"analysis": null,
	"analysis_error": null,
	"captured_image": {
		"filename": "face.jpg",
		"data_url": "data:image/jpeg;base64,..."
	},
	"best_match_image": null,
	"confirmation_required": false
}
```

Ambiguous match branch:

```json
{
	"message": "Face detected, but the match was too close to another enrolled person.",
	"employee": null,
	"visitor": null,
	"similarity": 0.78,
	"distance": 5.12,
	"analysis": {
		"age": 31,
		"gender": "Man",
		"emotion": "neutral",
		"race": "white",
		"gender_scores": {},
		"emotion_scores": {},
		"face_confidence": 0.98,
		"region": { "x": 10, "y": 20, "w": 140, "h": 140 }
	},
	"analysis_error": null,
	"captured_image": {
		"filename": "face.jpg",
		"data_url": "data:image/jpeg;base64,..."
	},
	"best_match_image": null,
	"matched_identity": null,
	"verification": {
		"verified": false,
		"distance": 5.12,
		"threshold": 23.278082,
		"match_count": 1,
		"match_ratio": 0.33,
		"pair_count": 3,
		"min_matches_required": 2,
		"detector_backend": "retinaface",
		"align": true,
		"reference_image_count": 3
	},
	"confirmation_required": false
}
```

Unconfirmed identity branch:

```json
{
	"message": "Face detected, but identity could not be confirmed.",
	"employee": null,
	"visitor": null,
	"similarity": 0.81,
	"distance": 4.9,
	"analysis": {},
	"analysis_error": null,
	"captured_image": {
		"filename": "face.jpg",
		"data_url": "data:image/jpeg;base64,..."
	},
	"best_match_image": null,
	"matched_identity": null,
	"verification": {
		"verified": false,
		"distance": 4.9,
		"threshold": 23.278082,
		"match_count": 1,
		"match_ratio": 0.2,
		"pair_count": 5,
		"min_matches_required": 2,
		"detector_backend": "retinaface",
		"align": true,
		"reference_image_count": 5
	},
	"confirmation_required": false
}
```

Confirmed identity branch:

```json
{
	"message": "Welcome back Jane Doe!",
	"employee": {
		"id": "EAABC123",
		"fullName": "Jane Doe",
		"gender": "female",
		"DoB": "1997-05-10",
		"email": "jane@example.com",
		"Phone": "+447000000000"
	},
	"visitor": null,
	"similarity": 0.92,
	"distance": 1.86,
	"analysis": {
		"age": 28,
		"gender": "Woman",
		"emotion": "happy",
		"race": "white",
		"gender_scores": {},
		"emotion_scores": {},
		"face_confidence": 0.99,
		"region": { "x": 10, "y": 20, "w": 140, "h": 140 }
	},
	"analysis_error": null,
	"captured_image": {
		"filename": "face.jpg",
		"data_url": "data:image/jpeg;base64,..."
	},
	"best_match_image": {
		"filename": "EAABC123_20260411_100000_000001_front.jpg",
		"data_url": "data:image/jpeg;base64,...",
		"source_path": "temp_images/EAABC123_20260411_100000_000001_front.jpg"
	},
	"matched_identity": {
		"owner_id": "EAABC123",
		"owner_type": "employee",
		"similarity": 0.92
	},
	"verification": {
		"verified": true,
		"distance": 1.86,
		"threshold": 23.278082,
		"match_count": 2,
		"match_ratio": 0.66,
		"pair_count": 3,
		"min_matches_required": 2,
		"detector_backend": "retinaface",
		"align": true,
		"reference_image_count": 3
	},
	"confirmation_required": true
}
```

## Facial Detection and Recognition Pipeline

Primary orchestration:

- Backend/SOFRS-EA-Backend/backend/routers/Image.py

Supporting modules:

- Backend/SOFRS-EA-Backend/backend/utils/image_processing.py
- Backend/SOFRS-EA-Backend/backend/utils/identity/searchId.py
- Backend/SOFRS-EA-Backend/backend/utils/identity/analysisId.py
- Backend/SOFRS-EA-Backend/backend/utils/identity/verifyId.py

### Stage 1: Input validation and preprocessing

1. Validate upload MIME type
2. Decode image and enforce required face presence
3. Generate two variants:
      - Search image bytes
      - Confirmation image bytes
4. Return HTTP 422 when face cannot be detected in uploaded image

Important limits and defaults:

1. Max upload size in storage layer: 10 MB
2. Required face confidence default: 0.90
3. Required face area ratio default: 0.08

### Stage 2: Identity search

1. Uses DeepFace.find against database path
2. Default model: Facenet512
3. Default distance metric: euclidean
4. Threshold from IDENTITY_MATCH_THRESHOLD env, fallback 23.278082
5. Groups match rows by owner ID prefix in image filename
6. Requires minimum supporting matches per owner before accepting best owner candidate
7. Computes ambiguity against runner-up owner using match count and distance-gap checks

### Stage 3: Soft attribute analysis

1. Uses DeepFace.extract_faces for readiness check
2. Runs DeepFace.analyze for age, gender, emotion, race only when face is reliable
3. Reliability gate requires:
      - face confidence >= 0.90
      - both eyes visible in detected facial area
4. For side-profile or low-confidence faces, returns region/confidence with warning and null soft attributes

### Stage 4: Verification

1. Loads owner-specific reference images
2. Runs pairwise embedding comparisons between query and references
3. Uses thresholded match counting instead of a single pair decision
4. Default minimum required matches is 2, clamped by available reference image count
5. Returns verification metadata used by router to set confirmation_required

### Stage 5: Decision and response assembly

1. If no best match found: return new visitor response
2. If ambiguous best owner: return non-confirmed response without owner object
3. If owner found but verification fails: return non-confirmed response without owner object
4. If owner found and verification passes: return owner object and confirmation_required true

## Error Handling and Logging

Shared helpers:

- Backend/SOFRS-EA-Backend/backend/core/error_handling.py

Behavior:

1. HTTPException is preserved
2. Unexpected exceptions are wrapped with contextual detail and raised as HTTPException

Logging configuration:

- Backend/SOFRS-EA-Backend/backend/core/logging_config.py

Behavior:

1. Console logging for default and access logs
2. Rotating file logs at logs/backend.log
3. Configurable level and rotation by environment variables

## Search Failure Throttling

Image search applies temporary per-client blocking for repeated invalid requests.

Defaults:

1. Failure limit: 3
2. Failure window: 10 seconds
3. Block duration: 15 seconds

When blocked, endpoint returns HTTP 429 with Retry-After header.

## Frontend-Visible Output Contract Notes

Fields used heavily by frontend layers:

1. message
2. employee or visitor object
3. similarity and distance
4. best_match_image.data_url for UI preview
5. confirmation_required
6. verification metadata for confidence context

Report warning:

Desktop verification service includes message-based fallback recognition logic. Therefore, consistent backend message wording should be treated as part of operational contract for current frontend behavior.
