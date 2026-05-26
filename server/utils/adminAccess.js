const DEFAULT_ADMIN_EMAILS = ["krishtaliyan132@gmail.com"];

export const normalizeEmail = (email = "") => String(email).trim().toLowerCase();

export const getAdminEmails = () => {
  const configured = `${process.env.ADMIN_EMAILS || ""},${process.env.ADMIN_EMAIL || ""}`
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);

  return [...new Set([...DEFAULT_ADMIN_EMAILS, ...configured])];
};

export const isAdminEmail = (email = "") =>
  getAdminEmails().includes(normalizeEmail(email));

export const getEffectiveRole = (userOrEmail) => {
  const email =
    typeof userOrEmail === "string" ? userOrEmail : userOrEmail?.email || "";

  if (isAdminEmail(email)) {
    return "admin";
  }

  return typeof userOrEmail === "object" ? userOrEmail?.role : null;
};

export const ensureAdminRole = async (user) => {
  if (!user || !isAdminEmail(user.email) || user.role === "admin") {
    return user;
  }

  user.role = "admin";
  await user.save();
  return user;
};
