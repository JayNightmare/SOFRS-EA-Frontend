type VerificationReasonCode =
    | 'ok'
    | 'unknown-person'
    | 'low-similarity'
    | 'no-face'
    | 'multiple-faces'
    | 'service-error';

export type EmployeeRecord = {
    id?: string;
    name?: string;
    department?: string;
    title?: string;
    [key: string]: unknown;
};

export type VerifyFaceRequest = {
    imageBase64: string;
    detector: {
        confidence: number;
        faceCount: number;
        boundingBox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
    };
    source: 'desktop';
};

export type VerifyFaceResponse = {
    recognized: boolean;
    message: string;
    employee: EmployeeRecord | null;
    similarity: number;
    reasonCode: VerificationReasonCode;
};

const getVerifyEndpoint = (): string => {
    const endpoint = import.meta.env.VITE_VERIFY_ENDPOINT;
    if (endpoint && endpoint.trim().length > 0) {
        return endpoint.trim();
    }

    return 'http://localhost:3000/api/verify-face';
};

const toNumber = (value: unknown): number => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 0;
    }

    return value;
};

const toReasonCode = (value: unknown): VerificationReasonCode => {
    const allowed = new Set<VerificationReasonCode>([
        'ok',
        'unknown-person',
        'low-similarity',
        'no-face',
        'multiple-faces',
        'service-error',
    ]);

    if (typeof value === 'string' && allowed.has(value as VerificationReasonCode)) {
        return value as VerificationReasonCode;
    }

    return 'service-error';
};

const mapResponse = (payload: unknown): VerifyFaceResponse => {
    if (!payload || typeof payload !== 'object') {
        return {
            recognized: false,
            message: 'Verification service returned an invalid response.',
            employee: null,
            similarity: 0,
            reasonCode: 'service-error',
        };
    }

    const source = payload as Record<string, unknown>;
    const employee = source.employee && typeof source.employee === 'object'
        ? source.employee as EmployeeRecord
        : null;
    const similarity = toNumber(source.similarity);
    const explicitRecognized = source.recognized;
    const recognized = typeof explicitRecognized === 'boolean'
        ? explicitRecognized
        : (employee !== null && similarity >= 0.6);

    return {
        recognized,
        message: typeof source.message === 'string'
            ? source.message
            : (recognized ? 'Welcome back.' : 'Face not recognized.'),
        employee,
        similarity,
        reasonCode: toReasonCode(source.reasonCode),
    };
};

export const verifyFace = async (request: VerifyFaceRequest, signal?: AbortSignal): Promise<VerifyFaceResponse> => {
    const response = await fetch(getVerifyEndpoint(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        signal,
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        throw new Error(`Verification request failed with status ${response.status}.`);
    }

    const payload = await response.json();
    return mapResponse(payload);
};
