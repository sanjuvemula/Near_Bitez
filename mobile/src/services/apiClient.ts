import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import { API_URL, REQUEST_TIMEOUT_MS } from "@/constants/config";
import { getToken } from "@/services/storage";

/**
 * Normalised error the whole app handles.
 *
 * Screens should never see a raw AxiosError — `message` here is always safe to
 * show a user, while `status` and `code` stay available for logic.
 */
export class ApiError extends Error {
  status: number;
  code?: string;
  isNetworkError: boolean;
  isAuthError: boolean;
  /**
   * True when trying the same request again could plausibly succeed: the
   * network dropped, the request timed out, the server is overloaded or was
   * briefly unavailable. A 400 or a 409 will never become a success, so
   * offering "try again" for those just wastes the user's time.
   */
  isRetryable: boolean;

  constructor(
    message: string,
    status = 0,
    options: { code?: string; isNetworkError?: boolean } = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = options.code;
    this.isNetworkError = options.isNetworkError ?? false;
    this.isAuthError = status === 401;
    this.isRetryable = this.isNetworkError || status === 429 || status >= 500;
  }
}

/**
 * Called when the server rejects our token, so AuthContext can drop the
 * session. Registered rather than imported to avoid a circular dependency
 * between the client and the auth layer.
 */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  onUnauthorized = handler;
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { Accept: "application/json" },
  // The web app relies on cookies; native has no cookie jar, so the bearer
  // token attached below is what actually authenticates these requests.
  withCredentials: false,
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getToken();
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  // Let axios set the multipart boundary itself for uploads.
  if (config.data instanceof FormData) {
    config.headers.delete("Content-Type");
  }

  return config;
});

/**
 * Turns any failure into one sentence a user can act on.
 *
 * 4xx bodies are written by our own controllers and are safe to show. 5xx
 * bodies are not — they can carry stack traces, Mongo driver text or connection
 * strings — so those are always replaced with generic wording.
 */
const friendlyMessage = (error: AxiosError<{ message?: string }>): string => {
  if (error.code === "ECONNABORTED") {
    return "That took too long. Check your connection and try again.";
  }

  if (!error.response) {
    return "Can't reach NearBitez. Check your internet connection.";
  }

  const status = error.response.status;
  const fromServer = error.response.data?.message;

  // Never surface a 5xx body. 503 is called out because it is the one the user
  // can usefully wait on rather than retry immediately.
  if (status === 503) {
    return "NearBitez is briefly unavailable. Please try again in a moment.";
  }
  if (status >= 500) {
    return "Something went wrong on our side. Please try again shortly.";
  }

  if (status === 401) return fromServer || "Please log in again.";
  if (status === 403) return fromServer || "You don't have access to this.";
  if (status === 404) return fromServer || "Not found.";
  // 409 means the action already happened — a double-tapped claim, an order
  // whose status moved on. Saying "failed" would be wrong.
  if (status === 409) return fromServer || "That's already been done.";
  if (status === 429) {
    return fromServer || "Too many attempts. Please wait a moment and try again.";
  }
  if (status === 400 || status === 422) {
    return fromServer || "Please check the details and try again.";
  }

  return fromServer || "Request failed. Please try again.";
};

/**
 * How long the cold-start retry is given.
 *
 * The production backend is hosted on a tier that suspends after inactivity;
 * a measured cold boot took 33 s, which the normal 20 s timeout can never
 * survive. Rather than making every request wait that long, the first attempt
 * keeps the short timeout and only the retry gets the long one.
 */
const COLD_START_TIMEOUT_MS = 60000;

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; code?: string }>) => {
    const status = error.response?.status ?? 0;
    const config = error.config as RetriableConfig | undefined;

    if (status === 401) {
      onUnauthorized?.();
    }

    /**
     * Retry once when the request never reached the server.
     *
     * Restricted to GET so a retry can never place a second order, submit a
     * second score or approve a payout twice — a timeout does not tell us
     * whether the server processed the first attempt.
     */
    const method = (config?.method ?? "get").toLowerCase();
    const neverReachedServer = !error.response;
    const shouldRetry =
      config && !config._retried && neverReachedServer && method === "get";

    if (shouldRetry) {
      config._retried = true;
      config.timeout = COLD_START_TIMEOUT_MS;
      return apiClient.request(config);
    }

    return Promise.reject(
      new ApiError(friendlyMessage(error), status, {
        code: error.response?.data?.code,
        isNetworkError: neverReachedServer,
      })
    );
  }
);

/** Unwraps the `{ success, data }` envelope the API returns. */
export const unwrap = <T>(payload: unknown): T => {
  const body = payload as { data?: T } | T;
  if (body && typeof body === "object" && "data" in (body as object)) {
    return (body as { data: T }).data;
  }
  return body as T;
};
