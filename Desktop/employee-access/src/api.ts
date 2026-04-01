const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
console.log('API base URL:', BASE_URL);
const API_KEY = import.meta.env.VITE_API_KEY ?? '';
const SUPPORT_WEBHOOK_URL =
  import.meta.env.VITE_DISCORD_HELP_WEBHOOK_URL ?? null;

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'X-API-Key': API_KEY,
  };
  return headers;
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

export interface HelpTicketPayload {
  requesterName: string;
  requesterEmail?: string;
  requesterEmployeeId?: string;
  issueType: string;
  location?: string;
  message: string;
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

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string,
  ) {
    super(message);
    this.name = 'ApiError';
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

export async function uploadImages(ownerId: string, files: Blob[]): Promise<{
  owner_id: string;
  owner_type: string;
  uploaded: string[];
}> {
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

export async function submitHelpTicket(payload: HelpTicketPayload): Promise<void> {
  const clean = (value: string | undefined): string => value?.trim() ?? '';
  const requesterName = clean(payload.requesterName);
  const requesterEmail = clean(payload.requesterEmail);
  const requesterEmployeeId = clean(payload.requesterEmployeeId);
  const location = clean(payload.location);
  const message = clean(payload.message);
  const issueType = clean(payload.issueType) || 'General';

  if (!requesterName) {
    throw new ApiError('Requester name is required', 400);
  }

  if (!message) {
    throw new ApiError('Support message is required', 400);
  }

  const lines: string[] = [
    '**SOFRS Support Ticket**',
    `**Name:** ${requesterName}`,
    `**Issue Type:** ${issueType}`,
    `**Message:** ${message}`,
  ];

  if (requesterEmployeeId) {
    lines.push(`**Employee ID:** ${requesterEmployeeId}`);
  }

  if (requesterEmail) {
    lines.push(`**Email:** ${requesterEmail}`);
  }

  if (location) {
    lines.push(`**Location:** ${location}`);
  }

  lines.push(`**Submitted:** ${new Date().toISOString()}`);

  const res = await fetch(SUPPORT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: lines.join('\n') }),
  });

  if (!res.ok) {
    let detail: string | undefined;
    try {
      detail = await res.text();
    } catch {
      detail = undefined;
    }

    throw new ApiError('Failed to submit support ticket', res.status, detail);
  }
}

export { ApiError };
