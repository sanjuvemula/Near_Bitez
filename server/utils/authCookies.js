const AUTH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const isHttpsRequest = (req) => {
  const forwardedProto = String(req?.headers?.["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim()
    .toLowerCase();

  return (
    req?.secure ||
    forwardedProto === "https" ||
    process.env.NODE_ENV === "production"
  );
};

export const getAuthCookieOptions = (req) => {
  const https = isHttpsRequest(req);

  return {
    httpOnly: true,
    sameSite: https ? "none" : "lax",
    secure: https,
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  };
};

export const getClearAuthCookieOptions = (req) => ({
  ...getAuthCookieOptions(req),
  maxAge: 0,
});
