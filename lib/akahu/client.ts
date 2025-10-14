const AKAHU_BASE_URL = "https://api.akahu.io/v1";

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
    "X-Akahu-User-Token": accessToken ?? "",
  };

  const response = await fetch(`${AKAHU_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Akahu request failed: ${response.status} ${errorBody}`);
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

  return response.json() as Promise<{ access_token: string; refresh_token: string }>;
}
