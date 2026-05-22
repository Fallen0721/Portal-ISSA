import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(serverDir, "..");

const envCandidates = [
  resolve(projectRoot, ".env"),
  resolve(serverDir, ".env"),
];

for (const envPath of envCandidates) {
  if (!existsSync(envPath)) {
    continue;
  }

  dotenv.config({ path: envPath, override: true, quiet: true });
  break;
}

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value, fallback) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const parseList = (value) =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const parseSameSite = (value, fallback) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "strict" || normalized === "lax" || normalized === "none") {
    return normalized;
  }

  return fallback;
};

const parseTrustProxy = (value, fallback) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["false", "no", "off", "0"].includes(normalized)) return false;
  if (["true", "yes", "on"].includes(normalized)) return 1;

  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 0) {
    return parsed;
  }

  return fallback;
};

const nodeEnv = process.env.NODE_ENV ?? "development";

export const config = {
  nodeEnv,
  mysqlHost: process.env.MYSQL_HOST ?? "127.0.0.1",
  mysqlPort: parseNumber(process.env.MYSQL_PORT, 3306),
  mysqlUser: process.env.MYSQL_USER ?? "root",
  mysqlPassword: process.env.MYSQL_PASSWORD ?? "",
  mysqlDatabase: process.env.MYSQL_DATABASE ?? "PortalIssa",
  dbBootstrapEnabled: parseBoolean(
    process.env.DB_BOOTSTRAP_ENABLED,
    nodeEnv !== "production",
  ),
  port: parseNumber(process.env.PORT, 3001),
  publicAppUrl: process.env.PUBLIC_APP_URL?.trim() ?? "",
  publicApiUrl: process.env.PUBLIC_API_URL?.trim() ?? "",
  publicIpUrl: process.env.PUBLIC_IP_URL?.trim() ?? "",
  serveStaticFiles: parseBoolean(
    process.env.SERVE_STATIC_FILES,
    nodeEnv === "production",
  ),
  trustProxy: parseTrustProxy(
    process.env.TRUST_PROXY,
    nodeEnv === "production" ? 1 : false,
  ),
  corsAllowedOrigins: parseList(process.env.CORS_ALLOWED_ORIGINS),
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? "portal_issa_sid",
  sessionTtlDias: parseNumber(process.env.SESSION_TTL_DIAS, 7),
  sessionCookieSecure: parseBoolean(process.env.SESSION_COOKIE_SECURE, false),
  sessionCookieSameSite: parseSameSite(
    process.env.SESSION_COOKIE_SAME_SITE,
    "lax",
  ),
  sessionCookieDomain: process.env.SESSION_COOKIE_DOMAIN?.trim() || undefined,
};
