export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const isJsonBody = (body: BodyInit | object | undefined): body is object =>
  !!body &&
  typeof body === "object" &&
  !(body instanceof FormData) &&
  !(body instanceof URLSearchParams) &&
  !(body instanceof Blob);

export const buildQueryString = (
  params: Record<string, string | number | boolean | null | undefined>,
) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

const resolveApiUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return apiBaseUrl ? `${apiBaseUrl}${path}` : path;
};

export const apiRequest = async <T>(
  path: string,
  init: Omit<RequestInit, "body"> & { body?: BodyInit | object } = {},
): Promise<T> => {
  const headers = new Headers(init.headers);
  let body: BodyInit | undefined;

  if (isJsonBody(init.body)) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.body);
  } else {
    body = init.body;
  }

  const response = await fetch(resolveApiUrl(path), {
    credentials: "include",
    ...init,
    headers,
    body,
  });

  if (!response.ok) {
    let message = "Error al procesar la solicitud";

    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) {
        message = payload.message;
      }
    } catch {
      // ignore JSON parsing errors
    }

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
};
