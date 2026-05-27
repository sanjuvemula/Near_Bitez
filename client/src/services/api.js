import { getApiUrl } from "../config/runtime.js";

class ApiError extends Error {
  constructor(message, status, payload = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
    this.code = payload.code;
  }
}

const serializeBody = (body) => {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (body instanceof FormData) {
    return body;
  }

  return JSON.stringify(body);
};

const request = async (path, options = {}) => {
  const headers = new Headers(options.headers || {});
  const body = serializeBody(options.body);

  if (!(body instanceof FormData) && body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(getApiUrl(path), {
    credentials: "include",
    ...options,
    headers,
    body,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(
      payload?.message || "Request failed",
      response.status,
      payload || {}
    );
  }

  return payload;
};

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, {
      method: "POST",
      body,
    }),
  put: (path, body) =>
    request(path, {
      method: "PUT",
      body,
    }),
  patch: (path, body) =>
    request(path, {
      method: "PATCH",
      body,
    }),
  delete: (path) =>
    request(path, {
      method: "DELETE",
    }),
};

export { ApiError };






