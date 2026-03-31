type VerificationReasonCode =
    | "ok"
    | "unknown-person"
    | "low-similarity"
    | "no-face"
    | "multiple-faces"
    | "service-error";

export type EmployeeRecord = {
    id?: string;
    name?: string;
    department?: string;
    title?: string;
    ownerType?: string;
    [key: string]: unknown;
};

export type VerifyFaceRequest = {
    imageFile: Blob;
};

export type VerifyFaceResponse = {
    recognized: boolean;
    message: string;
    employee: EmployeeRecord | null;
    similarity: number;
    reasonCode: VerificationReasonCode;
};

const getVerifyEndpoint = (): string => {
    const endpoint = import.meta.env.VITE_API_BASE_URL + '/image/search';

    return endpoint;
};

// Send a Health Check to the API to verify it's reachable and responding correctly
export const checkApiHealth = async (): Promise<boolean> => {
    try {
        const response = await fetch(import.meta.env.VITE_API_BASE_URL + '/health', {
            method: 'GET',
            headers: {
                'X-API-Key': import.meta.env.VITE_API_KEY || '',
            },
        });

        if (!response.ok) {
            console.error(`API health check failed with status ${response.status}`);
            return false;
        } else {
            const data = await response.json();
            console.log('API health check response:', data);
            return data.status === 'healthy';
        }
    } catch (error) {
        console.error('API health check error:', error);
        return false;
    }
};

const toNumber = (value: unknown): number => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return 0;
    }

    return value;
};

const normalizePersonRecord = (
    value: unknown,
    ownerType?: string,
): EmployeeRecord | null => {
    if (!value || typeof value !== "object") {
        return null;
    }

    const source = value as Record<string, unknown>;

    return {
        ...source,
        id:
            typeof source.id === "string"
                ? source.id
                : typeof source._id === "string"
                    ? source._id
                    : undefined,
        name:
            typeof source.name === "string"
                ? source.name
                : typeof source.fullName === "string"
                    ? source.fullName
                    : undefined,
        ownerType,
    };
};

const toReasonCode = (value: unknown): VerificationReasonCode => {
    const allowed = new Set<VerificationReasonCode>([
        "ok",
        "unknown-person",
        "low-similarity",
        "no-face",
        "multiple-faces",
        "service-error",
    ]);

    if (
        typeof value === "string" &&
        allowed.has(value as VerificationReasonCode)
    ) {
        return value as VerificationReasonCode;
    }

    return "service-error";
};

const looksRecognizedMessage = (value: unknown): boolean => {
    return (
        typeof value === "string" &&
        value.trim().toLowerCase().startsWith("welcome back")
    );
};

const mapResponse = (payload: unknown): VerifyFaceResponse => {
    if (!payload || typeof payload !== "object") {
        return {
            recognized: false,
            message: "Verification service returned an invalid response.",
            employee: null,
            similarity: 0,
            reasonCode: "service-error",
        };
    }

    const source = payload as Record<string, unknown>;
    const matchedIdentity =
        source.matched_identity && typeof source.matched_identity === "object"
            ? source.matched_identity as Record<string, unknown>
            : null;
    const ownerType =
        matchedIdentity && typeof matchedIdentity.owner_type === "string"
            ? matchedIdentity.owner_type
            : source.employee
                ? "employee"
                : source.visitor
                    ? "visitor"
                    : undefined;
    const message =
        typeof source.message === "string"
            ? source.message
            : "Verification service returned an invalid response.";
    const employee = normalizePersonRecord(
        source.employee ?? source.visitor,
        ownerType,
    );
    const rawSimilarity = toNumber(source.similarity);
    const explicitRecognized = source.recognized;
    const inferredRecognized =
        employee !== null || looksRecognizedMessage(message);
    const recognized =
        typeof explicitRecognized === "boolean"
            ? explicitRecognized
            : inferredRecognized;
    const similarity =
        inferredRecognized && rawSimilarity >= 0 && rawSimilarity <= 0.5
            ? 1 - rawSimilarity
            : rawSimilarity;
    const reasonCode =
        typeof source.reasonCode === "string"
            ? toReasonCode(source.reasonCode)
            : recognized
                ? "ok"
                : "unknown-person";

    return {
        recognized,
        message:
            typeof source.message === "string"
                ? source.message
                : recognized
                    ? "Welcome back."
                    : "Face not recognized.",
        employee,
        similarity,
        reasonCode,
    };
};

export const verifyFace = async (
    file: File,
    databasePath = "temp_images",
    signal?: AbortSignal,
): Promise<VerifyFaceResponse> => {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("database_path", databasePath);

    console.log("Sending verification request to:", getVerifyEndpoint());

    const response = await fetch(getVerifyEndpoint(), {
        method: "POST",
        body: formData,
        signal,
        headers: {
            "X-API-Key": import.meta.env.VITE_API_KEY || "",
        },
    });

    if (!response.ok) {
        let errorDetail = "";

        try {
            const payload = (await response.json()) as { detail?: unknown };
            if (typeof payload.detail === "string" && payload.detail.trim().length > 0) {
                errorDetail = payload.detail.trim();
            }
        } catch {
            errorDetail = "";
        }

        throw new Error(
            errorDetail
                ? `Verification request failed with status ${response.status}: ${errorDetail}`
                : `Verification request failed with status ${response.status}.`,
        );
    }

    const payload = await response.json();
    return mapResponse(payload);
};
