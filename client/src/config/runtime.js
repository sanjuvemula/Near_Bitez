const DEFAULT_API_ORIGIN = "https://near-bitez.onrender.com";
const API_PATH = "/api/v1";

const trimTrailingSlash = (value) => (value ? value.replace(/\/+$/, "") : "");

const normalizeApiBaseUrl = (value) => {
  const trimmed = trimTrailingSlash(value);
  if (!trimmed) return "";
  return trimmed.endsWith(API_PATH) ? trimmed : `${trimmed}${API_PATH}`;
};

const getDefaultApiBaseUrl = () =>
  import.meta.env.PROD ? `${DEFAULT_API_ORIGIN}${API_PATH}` : API_PATH;

export const API_BASE_URL =
  normalizeApiBaseUrl(import.meta.env.VITE_API_URL) || getDefaultApiBaseUrl();

export const API_ORIGIN = API_BASE_URL.startsWith("http")
  ? new URL(API_BASE_URL).origin
  : import.meta.env.PROD
  ? DEFAULT_API_ORIGIN
  : "http://localhost:5000";

export const SOCKET_URL =
  trimTrailingSlash(import.meta.env.VITE_SOCKET_URL) || API_ORIGIN;

export const getApiUrl = (path = "") =>
  `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
