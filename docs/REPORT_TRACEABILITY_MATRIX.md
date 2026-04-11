# Report Traceability Matrix

This matrix maps report claims to implementation evidence in the repository.

## Core Claims

| Claim ID | Report Claim                                                                           | Primary Evidence                                              | Supporting Evidence                                        | Validation Method                                                     |
| -------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| C-01     | The backend exposes separate employee, visitor, and image route groups.                | Backend/SOFRS-EA-Backend/backend/main.py                      | Backend/SOFRS-EA-Backend/api_endpoints.md                  | Confirm route mounting and endpoint list parity.                      |
| C-02     | Protected routes require X-API-Key authentication.                                     | Backend/SOFRS-EA-Backend/backend/core/dependencies.py         | Backend/SOFRS-EA-Backend/backend/routers/Employee.py       | Verify APIRouter dependencies and auth failure status codes.          |
| C-03     | Employee and Visitor IDs are generated with distinct prefixes.                         | Backend/SOFRS-EA-Backend/backend/models/Employee.py           | Backend/SOFRS-EA-Backend/backend/models/Visitor.py         | Check generated ID prefix usage in model defaults.                    |
| C-04     | Enrollment supports multi-image upload linked to owner ID.                             | Backend/SOFRS-EA-Backend/backend/routers/Image.py             | Desktop/employee-access/src/pages/kiosk/register.ts        | Verify multipart fields owner_id + files[] and upload response shape. |
| C-05     | Uploaded images are preprocessed and stored with owner-prefixed filenames.             | Backend/SOFRS-EA-Backend/backend/db/Image_CRUD.py             | Backend/SOFRS-EA-Backend/backend/utils/image_processing.py | Trace upload_image -> prepare_image_bytes -> \_build_filename.        |
| C-06     | Recognition uses a multi-stage pipeline (preprocess, search, analyze, verify, decide). | Backend/SOFRS-EA-Backend/backend/routers/Image.py             | Backend/SOFRS-EA-Backend/backend/utils/identity/\*         | Follow search endpoint execution path end-to-end.                     |
| C-07     | Candidate search uses DeepFace with owner-grouping and ambiguity checks.               | Backend/SOFRS-EA-Backend/backend/utils/identity/searchId.py   | Backend/SOFRS-EA-Backend/backend/routers/Image.py          | Validate \_select_best_owner_match and ambiguous branch handling.     |
| C-08     | Verification uses pairwise embedding comparisons and minimum match counts.             | Backend/SOFRS-EA-Backend/backend/utils/identity/verifyId.py   | Backend/SOFRS-EA-Backend/backend/routers/Image.py          | Confirm match_count/min_matches_required decision logic.              |
| C-09     | Soft attributes are gated by face confidence and eye visibility checks.                | Backend/SOFRS-EA-Backend/backend/utils/identity/analysisId.py | docs/BACKEND_REFERENCE.md                                  | Validate \_is_soft_attribute_ready gating behavior.                   |
| C-10     | Image search returns multiple decision branches to frontend.                           | Backend/SOFRS-EA-Backend/backend/routers/Image.py             | docs/INTEGRATION_FLOWS.md                                  | Confirm no-match, ambiguous, unconfirmed, confirmed responses.        |
| C-11     | Desktop maps backend response to a normalized verification model.                      | Desktop/employee-access/src/services/verification.ts          | Desktop/employee-access/src/pages/kiosk/scan.ts            | Verify mapResponse and recognized inference behavior.                 |
| C-12     | Mobile onboarding persists record ID and uploads five-pose captures.                   | Mobile/employee-access/app/identity-verification.tsx          | Mobile/employee-access/app/face-scan.tsx                   | Confirm setRecordId and uploadImages flow.                            |
| C-13     | Mobile global state is context-based, not redux-based.                                 | Mobile/employee-access/contexts/user-context.tsx              | Mobile/employee-access/app/\_layout.tsx                    | Validate UserProvider composition and context fields.                 |
| C-14     | Backend includes health and warmup visibility for operations.                          | Backend/SOFRS-EA-Backend/backend/main.py                      | Backend/SOFRS-EA-Backend/backend/core/deepface_warmup.py   | Confirm /health payload includes deepface_warmup details.             |
| C-15     | Repeated invalid image-search requests trigger temporary blocking.                     | Backend/SOFRS-EA-Backend/backend/routers/Image.py             | docs/BACKEND_REFERENCE.md                                  | Verify failure window, limit, block duration, and 429 behavior.       |

## Schema Claims

| Claim ID | Report Claim                                                                      | Primary Evidence                                     | Validation Method                                      |
| -------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------ |
| S-01     | Employee API schema includes fullName, optional DoB/email/Phone/gender.           | Backend/SOFRS-EA-Backend/backend/schemas/Employee.py | Compare fields across EmployeeBase and EmployeeCreate. |
| S-02     | Visitor API schema mirrors employee profile shape minus employee_id.              | Backend/SOFRS-EA-Backend/backend/schemas/Visitor.py  | Compare VisitorBase fields with EmployeeBase overlap.  |
| S-03     | Persistence models use Beanie documents with Employees/Visitors collection names. | Backend/SOFRS-EA-Backend/backend/models/Employee.py  | Inspect Settings.name for collection mapping.          |

## Frontend Contract Claims

| Claim ID | Report Claim                                                                       | Primary Evidence                                     | Validation Method                                              |
| -------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| F-01     | Desktop and mobile share create/search/upload endpoint conventions.                | Desktop/employee-access/src/api.ts                   | Compare function names and endpoint paths in both API clients. |
| F-02     | Frontend sends phone as Phone (capital P), matching backend schemas.               | Desktop/employee-access/src/api.ts                   | Confirm key name in payload builders and schema fields.        |
| F-03     | Date of birth is transmitted as DoB with date-like string input in frontend forms. | Mobile/employee-access/app/identity-verification.tsx | Confirm YYYY-MM-DD validation and payload mapping.             |

## Usage Guidance

For academic report writing:

1. Use the claim IDs in your draft notes.
2. Cite at least one primary evidence file per claim.
3. Prefer adding a second supporting file for higher-stakes claims.
4. Revalidate claims after major code changes by rechecking the listed files.
