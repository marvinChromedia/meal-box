import type { ApiError } from '@mealbox/shared';

import { API_BASE_URL } from './config';
import { getAuthHeaders } from './auth';

/**
 * Every failure a hook can see — a real API error, a network failure, or a
 * response that wasn't the JSON shape we expected — normalizes to this one
 * class so consumers never have to branch on where the failure came from.
 */
export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number | null;

  constructor(message: string, code: string, status: number | null = null) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

function isApiErrorBody(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as { error?: unknown }).error === 'object' &&
    (value as { error: { message?: unknown } }).error !== null &&
    typeof (value as { error: { message?: unknown } }).error.message === 'string' &&
    typeof (value as { error: { code?: unknown } }).error.code === 'string'
  );
}

async function toApiClientError(response: Response): Promise<ApiClientError> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return new ApiClientError(
      `Request failed with status ${response.status}`,
      'NON_JSON_RESPONSE',
      response.status,
    );
  }

  if (isApiErrorBody(body)) {
    return new ApiClientError(body.error.message, body.error.code, response.status);
  }

  return new ApiClientError(`Request failed with status ${response.status}`, 'UNKNOWN_ERROR', response.status);
}

export type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

/**
 * The one place the frontend calls `fetch`. Feature `api.ts` files (recipes,
 * shopping-list, ...) build on this rather than calling `fetch` directly.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      // TEST-159's session transport is an httpOnly cookie, not a bearer
      // token — this sends and accepts it. getAuthHeaders() stays wired in
      // for anything that ever needs a header-based credential alongside it.
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    throw new ApiClientError(
      cause instanceof Error ? cause.message : 'Network request failed',
      'NETWORK_ERROR',
      null,
    );
  }

  if (!response.ok) {
    throw await toApiClientError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
