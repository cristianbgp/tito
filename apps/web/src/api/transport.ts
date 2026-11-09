import { getLocale } from "../i18n";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set("Accept-Language", getLocale());
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const message =
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : "Unable to complete this request.";
    throw new ApiError(message, response.status);
  }
  return body as T;
}
