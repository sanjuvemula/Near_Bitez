const DEFAULT_CLIENT_ORIGINS = [
  "https://near-bitez.vercel.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

const normalizeOrigin = (value) => {
  if (!value) return "";

  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed;
  }
};

const splitOrigins = (value) =>
  (value || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

export const getClientOrigins = () => {
  const configuredOrigins = [
    ...splitOrigins(process.env.CLIENT_URL),
    ...splitOrigins(process.env.CLIENT_URLS),
  ];

  return [...new Set([...configuredOrigins, ...DEFAULT_CLIENT_ORIGINS])];
};

export const getPrimaryClientUrl = () => {
  const publicClientUrl = normalizeOrigin(process.env.PUBLIC_CLIENT_URL);
  if (publicClientUrl) return publicClientUrl;

  const clientUrl = normalizeOrigin(process.env.CLIENT_URL);
  const production = process.env.NODE_ENV === "production";

  if (clientUrl && (!production || !LOCAL_ORIGIN_PATTERN.test(clientUrl))) {
    return clientUrl;
  }

  return production ? DEFAULT_CLIENT_ORIGINS[0] : clientUrl || DEFAULT_CLIENT_ORIGINS[1];
};

export const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const allowedOrigins = getClientOrigins();
    if (allowedOrigins.includes(normalizeOrigin(origin))) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};
