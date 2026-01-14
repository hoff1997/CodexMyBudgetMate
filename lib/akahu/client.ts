const AKAHU_BASE_URL = "https://api.akahu.io/v1";

/**
 * Custom error class for Akahu API errors
 * Provides structured error information for better handling
 */
export class AkahuApiError extends Error {
  public readonly status: number;
  public readonly isTokenRevoked: boolean;
  public readonly isUnauthorized: boolean;
  public readonly requiresReauthorization: boolean;

  constructor(message: string, status: number, body?: string) {
    super(message);
    this.name = "AkahuApiError";
    this.status = status;

    // Determine error type based on status code
    this.isUnauthorized = status === 401;
    this.isTokenRevoked = status === 401 || status === 403;

    // Check if body contains token-related error messages
    const bodyLower = body?.toLowerCase() ?? "";
    const isTokenError =
      bodyLower.includes("token") &&
      (bodyLower.includes("revoked") ||
        bodyLower.includes("expired") ||
        bodyLower.includes("invalid"));

    this.requiresReauthorization =
      status === 401 || status === 403 || isTokenError;
  }
}

type AkahuRequestOptions = {
  endpoint: string;
  method?: string;
  accessToken?: string;
  body?: Record<string, unknown>;
};

export async function akahuRequest<T>({
  endpoint,
  method = "GET",
  accessToken,
  body,
}: AkahuRequestOptions): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-Akahu-App-Token": process.env.AKAHU_APP_TOKEN!,
  };

  if (accessToken) {
    headers["X-Akahu-User-Token"] = accessToken;
  }

  const response = await fetch(`${AKAHU_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new AkahuApiError(
      `Akahu request failed: ${response.status} ${errorBody}`,
      response.status,
      errorBody
    );
  }

  return response.json();
}

export async function exchangeAkahuCode(code: string) {
  const response = await fetch(`${AKAHU_BASE_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Akahu-App-Token": process.env.AKAHU_APP_TOKEN!,
    },
    body: JSON.stringify({
      id: process.env.AKAHU_CLIENT_ID,
      secret: process.env.AKAHU_CLIENT_SECRET,
      code,
      redirect_uri: process.env.AKAHU_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Akahu code exchange failed: ${response.status} ${error}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    refresh_expires_in?: number;
    refresh_token_expires_in?: number;
    scope?: string;
  }>;
}

export async function refreshAkahuToken(refreshToken: string) {
  const response = await fetch(`${AKAHU_BASE_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Akahu-App-Token": process.env.AKAHU_APP_TOKEN!,
    },
    body: JSON.stringify({
      id: process.env.AKAHU_CLIENT_ID,
      secret: process.env.AKAHU_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Akahu token refresh failed: ${response.status} ${error}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    refresh_expires_in?: number;
    refresh_token_expires_in?: number;
    scope?: string;
  }>;
}
