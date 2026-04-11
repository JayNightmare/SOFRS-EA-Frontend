# API Response Schema Appendix

This appendix provides reference JSON schemas for key backend responses consumed by frontend applications.

## Notes

1. Schemas focus on practical response structures used by current clients.
2. Additional backend fields may exist and are not always constrained here.
3. These schemas are documentation artifacts, not generated OpenAPI schemas.

## EmployeeRead Response Schema

```json
{
	"$schema": "https://json-schema.org/draft/2020-12/schema",
	"title": "EmployeeRead",
	"type": "object",
	"required": ["id", "fullName"],
	"properties": {
		"id": { "type": "string", "pattern": "^EA[A-Za-z0-9]{6}$" },
		"fullName": { "type": "string", "minLength": 1 },
		"employee_id": { "type": ["string", "null"] },
		"gender": { "type": ["string", "null"] },
		"DoB": { "type": ["string", "null"], "format": "date" },
		"email": { "type": ["string", "null"], "format": "email" },
		"Phone": { "type": ["string", "null"] }
	},
	"additionalProperties": true
}
```

## VisitorRead Response Schema

```json
{
	"$schema": "https://json-schema.org/draft/2020-12/schema",
	"title": "VisitorRead",
	"type": "object",
	"required": ["id", "fullName"],
	"properties": {
		"id": { "type": "string", "pattern": "^VA[A-Za-z0-9]{6}$" },
		"fullName": { "type": "string", "minLength": 1 },
		"gender": { "type": ["string", "null"] },
		"DoB": { "type": ["string", "null"], "format": "date" },
		"email": { "type": ["string", "null"], "format": "email" },
		"Phone": { "type": ["string", "null"] }
	},
	"additionalProperties": true
}
```

## Image Upload Success Schema

```json
{
	"$schema": "https://json-schema.org/draft/2020-12/schema",
	"title": "ImageUploadResponse",
	"type": "object",
	"required": ["owner_id", "owner_type", "uploaded"],
	"properties": {
		"owner_id": { "type": "string", "minLength": 2 },
		"owner_type": {
			"type": "string",
			"enum": ["employee", "visitor"]
		},
		"uploaded": {
			"type": "array",
			"items": { "type": "string", "minLength": 1 }
		}
	},
	"additionalProperties": false
}
```

## Image Search Base Fields

```json
{
	"$schema": "https://json-schema.org/draft/2020-12/schema",
	"title": "ImageSearchBase",
	"type": "object",
	"required": ["message", "confirmation_required"],
	"properties": {
		"message": { "type": "string" },
		"confirmation_required": { "type": "boolean" },
		"similarity": { "type": ["number", "string", "null"] },
		"distance": { "type": ["number", "null"] },
		"employee": { "$ref": "#/$defs/EmployeeReadOrNull" },
		"visitor": { "$ref": "#/$defs/VisitorReadOrNull" },
		"analysis": {
			"type": ["object", "null"],
			"properties": {
				"age": { "type": ["number", "null"] },
				"gender": { "type": ["string", "null"] },
				"emotion": { "type": ["string", "null"] },
				"race": { "type": ["string", "null"] },
				"gender_scores": { "type": ["object", "null"] },
				"emotion_scores": {
					"type": ["object", "null"]
				},
				"face_confidence": {
					"type": ["number", "null"]
				},
				"region": {
					"type": ["object", "null"],
					"properties": {
						"x": {
							"type": [
								"number",
								"null"
							]
						},
						"y": {
							"type": [
								"number",
								"null"
							]
						},
						"w": {
							"type": [
								"number",
								"null"
							]
						},
						"h": {
							"type": [
								"number",
								"null"
							]
						}
					},
					"additionalProperties": true
				}
			},
			"additionalProperties": true
		},
		"analysis_error": { "type": ["string", "null"] },
		"captured_image": {
			"type": ["object", "null"],
			"properties": {
				"filename": { "type": ["string", "null"] },
				"data_url": { "type": ["string", "null"] }
			},
			"additionalProperties": true
		},
		"best_match_image": {
			"type": ["object", "null"],
			"properties": {
				"filename": { "type": ["string", "null"] },
				"data_url": { "type": ["string", "null"] },
				"source_path": { "type": ["string", "null"] }
			},
			"additionalProperties": true
		},
		"matched_identity": {
			"type": ["object", "null"],
			"properties": {
				"owner_id": { "type": "string" },
				"owner_type": {
					"type": "string",
					"enum": [
						"employee",
						"visitor",
						"unknown"
					]
				},
				"similarity": { "type": ["number", "null"] }
			},
			"additionalProperties": true
		},
		"verification": {
			"type": ["object", "null"],
			"properties": {
				"verified": { "type": ["boolean", "null"] },
				"distance": { "type": ["number", "null"] },
				"threshold": { "type": ["number", "null"] },
				"match_count": { "type": ["number", "null"] },
				"match_ratio": { "type": ["number", "null"] },
				"pair_count": { "type": ["number", "null"] },
				"min_matches_required": {
					"type": ["number", "null"]
				},
				"detector_backend": {
					"type": ["string", "null"]
				},
				"align": { "type": ["boolean", "null"] },
				"reference_image_count": {
					"type": ["number", "null"]
				}
			},
			"additionalProperties": true
		}
	},
	"$defs": {
		"EmployeeReadOrNull": {
			"type": ["object", "null"],
			"properties": {
				"id": { "type": ["string", "null"] },
				"fullName": { "type": ["string", "null"] },
				"employee_id": { "type": ["string", "null"] },
				"gender": { "type": ["string", "null"] },
				"DoB": { "type": ["string", "null"] },
				"email": { "type": ["string", "null"] },
				"Phone": { "type": ["string", "null"] }
			},
			"additionalProperties": true
		},
		"VisitorReadOrNull": {
			"type": ["object", "null"],
			"properties": {
				"id": { "type": ["string", "null"] },
				"fullName": { "type": ["string", "null"] },
				"gender": { "type": ["string", "null"] },
				"DoB": { "type": ["string", "null"] },
				"email": { "type": ["string", "null"] },
				"Phone": { "type": ["string", "null"] }
			},
			"additionalProperties": true
		}
	},
	"additionalProperties": true
}
```

## How to Use in Reports

1. Use these schemas as a formalized representation of observed payload contracts.
2. Pair schema references with runtime branch descriptions from INTEGRATION_FLOWS.md.
3. Revalidate if API fields change in backend routers or pydantic schemas.
