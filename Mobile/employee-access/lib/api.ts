const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? '';

function getHeaders(): Record<string, string> {
  return {
    'X-API-Key': API_KEY,
  };
}

export interface EmployeeRead {
  id: string;
  fullName: string;
  gender?: string;
  DoB?: string;
  email?: string;
  Phone?: string;
}

export interface VisitorRead {
  id: string;
  fullName: string;
  gender?: string;
  DoB?: string;
  email?: string;
  Phone?: string;
}

export interface EmployeeCreate {
  id: string;
  fullName: string;
  gender?: string;
  DoB?: string;
  email?: string;
  Phone?: string;
}

export interface VisitorCreate {
  fullName: string;
  gender?: string;
  DoB?: string;
  email?: string;
  Phone?: string;
}

export interface ImageSearchMatch {
  message: string;
  employee?: EmployeeRead;
  visitor?: VisitorRead;
  similarity?: string | number;
}

export interface ImageSearchNewVisitor {
  message: string;
}

export type ImageSearchResponse = ImageSearchMatch | ImageSearchNewVisitor;

export class ApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail: string | undefined;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      detail = await res.text();
    }
    throw new ApiError(
      res.status === 401 || res.status === 403
        ? 'Invalid API key or access denied'
        : res.status === 404
          ? 'Not found'
          : `Request failed (${res.status})`,
      res.status,
      detail,
    );
  }
  return res.json() as Promise<T>;
}

export async function createEmployee(data: EmployeeCreate): Promise<EmployeeRead> {
  const res = await fetch(`${BASE_URL}/employee/create`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<EmployeeRead>(res);
}

export async function createVisitor(data: VisitorCreate): Promise<VisitorRead> {
  const res = await fetch(`${BASE_URL}/visitor/create`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<VisitorRead>(res);
}

export async function searchImage(imageBlob: Blob): Promise<ImageSearchResponse> {
  const form = new FormData();
  form.append('image', imageBlob, 'face.jpg');
  const res = await fetch(`${BASE_URL}/image/search`, {
    method: 'POST',
    headers: getHeaders(),
    body: form,
  });
  return handleResponse<ImageSearchResponse>(res);
}

export async function uploadImages(
  ownerId: string,
  files: Blob[],
): Promise<{ owner_id: string; owner_type: string; uploaded: string[] }> {
  const form = new FormData();
  form.append('owner_id', ownerId);
  for (let i = 0; i < files.length; i++) {
    form.append('files', files[i], `face_${i}.jpg`);
  }
  const res = await fetch(`${BASE_URL}/image/upload`, {
    method: 'POST',
    headers: getHeaders(),
    body: form,
  });
  return handleResponse(res);
}
