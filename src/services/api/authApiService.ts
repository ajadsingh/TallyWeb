const AUTH_SERVER_URL = import.meta.env.VITE_AUTH_SERVER_URL || '/api/auth';

interface ApiError {
  error?: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!response.ok) {
    const error = (data as ApiError)?.error || response.statusText || 'API request failed';
    throw new Error(error);
  }

  return data as T;
}

function normalizeFetchError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === 'Failed to fetch') {
      return new Error('Unable to connect to the auth server. Ensure the auth backend is running on http://localhost:4000 and then retry.');
    }
    return error;
  }
  return new Error('Unknown network error');
}

function buildHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function loginApi(email: string, password: string) {
  try {
    const response = await fetch(`${AUTH_SERVER_URL}/login`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ email, password }),
    });

    return handleResponse<{ user: any; token: string }>(response);
  } catch (error) {
    throw normalizeFetchError(error);
  }
}

export async function fetchCurrentUser(token: string) {
  try {
    const response = await fetch(`${AUTH_SERVER_URL}/me`, {
      method: 'GET',
      headers: buildHeaders(token),
    });

    return handleResponse<{ user: any }>(response);
  } catch (error) {
    throw normalizeFetchError(error);
  }
}

export async function fetchUsers(token: string) {
  const response = await fetch(`${AUTH_SERVER_URL}/users`, {
    method: 'GET',
    headers: buildHeaders(token),
  });

  return handleResponse<{ users: any[] }>(response);
}

export async function fetchRoles(token: string) {
  const response = await fetch(`${AUTH_SERVER_URL}/roles`, {
    method: 'GET',
    headers: buildHeaders(token),
  });

  return handleResponse<{ roles: any[] }>(response);
}

export async function fetchPermissions(token: string) {
  const response = await fetch(`${AUTH_SERVER_URL}/permissions`, {
    method: 'GET',
    headers: buildHeaders(token),
  });

  return handleResponse<{ permissions: any[] }>(response);
}

export async function fetchRolePermissions(token: string, roleId: number) {
  const response = await fetch(`${AUTH_SERVER_URL}/roles/${roleId}/permissions`, {
    method: 'GET',
    headers: buildHeaders(token),
  });

  return handleResponse<{ permissions: any[] }>(response);
}

export async function updateRolePermissions(token: string, roleId: number, permissionIds: number[]) {
  const response = await fetch(`${AUTH_SERVER_URL}/roles/${roleId}/permissions`, {
    method: 'PUT',
    headers: buildHeaders(token),
    body: JSON.stringify({ permissionIds }),
  });

  return handleResponse<{ success: boolean }>(response);
}

export async function createUserApi(token: string, name: string, email: string, password: string, roleId: number) {
  const response = await fetch(`${AUTH_SERVER_URL}/users`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify({ name, email, password, roleId }),
  });

  return handleResponse<{ user: any }>(response);
}
