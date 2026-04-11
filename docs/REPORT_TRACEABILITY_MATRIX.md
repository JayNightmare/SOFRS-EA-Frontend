# Report Traceability Matrix

This matrix maps report claims to implementation evidence in the repository.

Note:

1. Evidence links use direct file+line anchors for report citation.
2. Revalidate line anchors after major refactors.

## Core Claims

| Claim ID | Report Claim                                                                           | Primary Evidence                                                                                       | Supporting Evidence                                                                                   | Validation Method                                                     |
| -------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| C-01     | The backend exposes separate employee, visitor, and image route groups.                | [main include_router image](../Backend/SOFRS-EA-Backend/backend/main.py#L208)                          | [main include_router employee](../Backend/SOFRS-EA-Backend/backend/main.py#L209)                      | Confirm route mounting and endpoint list parity.                      |
| C-02     | Protected routes require X-API-Key authentication.                                     | [get_api_key dependency](../Backend/SOFRS-EA-Backend/backend/core/dependencies.py#L17)                 | [employee router dependency wiring](../Backend/SOFRS-EA-Backend/backend/routers/Employee.py#L20)      | Verify APIRouter dependencies and auth failure status codes.          |
| C-03     | Employee and Visitor IDs are generated with distinct prefixes.                         | [employee id default factory](../Backend/SOFRS-EA-Backend/backend/models/Employee.py#L19)              | [visitor id default factory](../Backend/SOFRS-EA-Backend/backend/models/Visitor.py#L16)               | Check generated ID prefix usage in model defaults.                    |
| C-04     | Enrollment supports multi-image upload linked to owner ID.                             | [upload_multiple_images endpoint](../Backend/SOFRS-EA-Backend/backend/routers/Image.py#L470)           | [desktop register upload call](../Desktop/employee-access/src/pages/kiosk/register.ts#L718)           | Verify multipart fields owner_id + files[] and upload response shape. |
| C-05     | Uploaded images are preprocessed and stored with owner-prefixed filenames.             | [upload_image persistence path](../Backend/SOFRS-EA-Backend/backend/db/Image_CRUD.py#L101)             | [prepare_image_bytes processor](../Backend/SOFRS-EA-Backend/backend/utils/image_processing.py#L481)   | Trace upload_image -> prepare_image_bytes -> \_build_filename.        |
| C-06     | Recognition uses a multi-stage pipeline (preprocess, search, analyze, verify, decide). | [search_image orchestration](../Backend/SOFRS-EA-Backend/backend/routers/Image.py#L507)                | [search_identity stage function](../Backend/SOFRS-EA-Backend/backend/utils/identity/searchId.py#L154) | Follow search endpoint execution path end-to-end.                     |
| C-07     | Candidate search uses DeepFace with owner-grouping and ambiguity checks.               | [\_select_best_owner_match](../Backend/SOFRS-EA-Backend/backend/utils/identity/searchId.py#L103)       | [\_is_ambiguous_owner_match](../Backend/SOFRS-EA-Backend/backend/utils/identity/searchId.py#L134)     | Validate owner grouping and ambiguity branch handling.                |
| C-08     | Verification uses pairwise embedding comparisons and minimum match counts.             | [verify_identity function](../Backend/SOFRS-EA-Backend/backend/utils/identity/verifyId.py#L170)        | [match_count threshold decision](../Backend/SOFRS-EA-Backend/backend/utils/identity/verifyId.py#L251) | Confirm match_count/min_matches_required decision logic.              |
| C-09     | Soft attributes are gated by face confidence and eye visibility checks.                | [\_is_soft_attribute_ready gate](../Backend/SOFRS-EA-Backend/backend/utils/identity/analysisId.py#L91) | [analyze_identity uses gate](../Backend/SOFRS-EA-Backend/backend/utils/identity/analysisId.py#L158)   | Validate readiness-gate behavior before soft attribute analysis.      |
| C-10     | Image search returns multiple decision branches to frontend.                           | [no-match branch](../Backend/SOFRS-EA-Backend/backend/routers/Image.py#L539)                           | [ambiguous branch](../Backend/SOFRS-EA-Backend/backend/routers/Image.py#L620)                         | Confirm no-match, ambiguous, unconfirmed, confirmed responses.        |
| C-11     | Desktop maps backend response to a normalized verification model.                      | [mapResponse normalizer](../Desktop/employee-access/src/services/verification.ts#L172)                 | [message-based recognition fallback](../Desktop/employee-access/src/services/verification.ts#L156)    | Verify mapResponse and recognized inference behavior.                 |
| C-12     | Mobile onboarding persists record ID and uploads five-pose captures.                   | [setRecordId on create](../Mobile/employee-access/app/identity-verification.tsx#L88)                   | [mobile uploadImages call](../Mobile/employee-access/app/face-scan.tsx#L167)                          | Confirm setRecordId and uploadImages flow.                            |
| C-13     | Mobile global state is context-based, not redux-based.                                 | [UserProvider definition](../Mobile/employee-access/contexts/user-context.tsx#L23)                     | [UserProvider app wrapper](../Mobile/employee-access/app/_layout.tsx#L70)                             | Validate provider composition and context fields.                     |
| C-14     | Backend includes health and warmup visibility for operations.                          | [health_check endpoint](../Backend/SOFRS-EA-Backend/backend/main.py#L339)                              | [health payload includes deepface_warmup](../Backend/SOFRS-EA-Backend/backend/main.py#L343)           | Confirm /health payload includes deepface_warmup details.             |
| C-15     | Repeated invalid image-search requests trigger temporary blocking.                     | [\_record_search_failure](../Backend/SOFRS-EA-Backend/backend/routers/Image.py#L216)                   | [422 failure path triggers record](../Backend/SOFRS-EA-Backend/backend/routers/Image.py#L676)         | Verify failure window, limit, block duration, and 429 behavior.       |

## Schema Claims

| Claim ID | Report Claim                                                                      | Primary Evidence                                                                           | Validation Method                                                    |
| -------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| S-01     | Employee API schema includes fullName, optional DoB/email/Phone/gender.           | [EmployeeBase schema](../Backend/SOFRS-EA-Backend/backend/schemas/Employee.py#L8)          | Compare fields across EmployeeBase and EmployeeCreate.               |
| S-02     | Visitor API schema mirrors employee profile shape minus employee_id.              | [VisitorBase schema](../Backend/SOFRS-EA-Backend/backend/schemas/Visitor.py#L7)            | Compare VisitorBase fields with EmployeeBase overlap.                |
| S-03     | Persistence models use Beanie documents with Employees/Visitors collection names. | [Employees collection mapping](../Backend/SOFRS-EA-Backend/backend/models/Employee.py#L28) | Inspect collection mappings for both employee and visitor documents. |

## Frontend Contract Claims

| Claim ID | Report Claim                                                                       | Primary Evidence                                                                                                                                                                | Validation Method                                              |
| -------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| F-01     | Desktop and mobile share create/search/upload endpoint conventions.                | [Desktop API create/search/upload functions](../Desktop/employee-access/src/api.ts#L155), [Mobile API create/search/upload functions](../Mobile/employee-access/lib/api.ts#L97) | Compare function names and endpoint paths in both API clients. |
| F-02     | Frontend sends phone as Phone (capital P), matching backend schemas.               | [Desktop API Phone contract key](../Desktop/employee-access/src/api.ts#L20)                                                                                                     | Confirm key name in payload builders and schema fields.        |
| F-03     | Date of birth is transmitted as DoB with date-like string input in frontend forms. | [ISO date validation in mobile form](../Mobile/employee-access/app/identity-verification.tsx#L26)                                                                               | Confirm YYYY-MM-DD validation and payload mapping.             |

## Usage Guidance

For academic report writing:

1. Use the claim IDs in your draft notes.
2. Cite at least one primary evidence file per claim.
3. Prefer adding a second supporting file for higher-stakes claims.
4. Revalidate claims after major code changes by rechecking the listed files.

## How to Cite in Report

Use the following sentence template when referencing implementation evidence:

"Claim <CLAIM_ID> is supported by implementation in <PRIMARY_EVIDENCE_LINK> and corroborated by <SUPPORTING_EVIDENCE_LINK>. Validation was performed by <VALIDATION_METHOD>."

Example A (single-source citation):

"Claim C-02 is supported by implementation in [get_api_key dependency](../Backend/SOFRS-EA-Backend/backend/core/dependencies.py#L17). Validation was performed by checking auth dependency wiring and expected status-code behavior."

Example B (dual-source citation):

"Claim C-12 is supported by implementation in [setRecordId on create](../Mobile/employee-access/app/identity-verification.tsx#L88) and corroborated by [mobile uploadImages call](../Mobile/employee-access/app/face-scan.tsx#L167). Validation was performed by tracing record ID persistence and upload flow execution."

### Compact Citation Form

For short-form report footnotes, use:

1. `<CLAIM_ID>: <PRIMARY_EVIDENCE_LINK>; <SUPPORTING_EVIDENCE_LINK>`

Example:

1. `C-10: [no-match branch](../Backend/SOFRS-EA-Backend/backend/routers/Image.py#L539); [ambiguous branch](../Backend/SOFRS-EA-Backend/backend/routers/Image.py#L620)`
