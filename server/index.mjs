import cookieParser from "cookie-parser";
import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cleanupExpiredSessions, initializeDatabase } from "./db.mjs";
import { config } from "./config.mjs";
import { requireAuth, sendError } from "./helpers.mjs";
import { authRouter } from "./routes/auth.mjs";
import { usersRouter } from "./routes/users.mjs";
import { ventasRouter } from "./routes/ventas.mjs";
import { permisosRouter } from "./routes/permisos.mjs";
import { cotizacionesDraftRouter, cotizacionesRouter } from "./routes/cotizaciones.mjs";
import { metasRouter } from "./routes/metas.mjs";
import { statusesRouter } from "./routes/statuses.mjs";
import { notificacionesRouter } from "./routes/notificaciones.mjs";
import { vehiculosRouter } from "./routes/vehiculos.mjs";
import { sseRouter } from "./routes/sse.mjs";
import { bitacoraRouter } from "./routes/bitacora.mjs";
import { productosRouter } from "./routes/productos.mjs";
import { companiasRouter } from "./routes/companias.mjs";
import { canalesRouter } from "./routes/canales.mjs";
import { ramosRouter } from "./routes/ramos.mjs";
import { ventasVidaRouter } from "./routes/ventas-vida.mjs";
import { ventasSaludRouter } from "./routes/ventas-salud.mjs";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, "../dist");

const applyCorsHeaders = (req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || config.corsAllowedOrigins.length === 0) {
    return next();
  }

  const allowAll = config.corsAllowedOrigins.includes("*");
  const isAllowed = allowAll || config.corsAllowedOrigins.includes(origin);

  if (!isAllowed) {
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    return next();
  }

  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.header(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] ??
      "Content-Type, Authorization",
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
};

app.disable("x-powered-by");
app.set("trust proxy", config.trustProxy);

app.use(applyCorsHeaders);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// Prevent IIS / browser from caching API responses
app.use("/api", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api", requireAuth);
app.use("/api/usuarios", usersRouter);
app.use("/api/ventas", ventasRouter);
app.use("/api/permisos", permisosRouter);
app.use("/api/cotizaciones", cotizacionesRouter);
app.use("/api/cotizaciones-borrador", cotizacionesDraftRouter);
app.use("/api/metas", metasRouter);
app.use("/api/statuses", statusesRouter);
app.use("/api/notificaciones", notificacionesRouter);
app.use("/api/vehiculos", vehiculosRouter);
app.use("/api/sse", sseRouter);
app.use("/api/ventas", bitacoraRouter);
app.use("/api/productos", productosRouter);
app.use("/api/companias", companiasRouter);
app.use("/api/canales", canalesRouter);
app.use("/api/ramos", ramosRouter);
app.use("/api/ventas-vida", ventasVidaRouter);
app.use("/api/ventas-salud", ventasSaludRouter);
app.use("/api", (_req, res) => {
  sendError(res, 404, "Ruta API no encontrada");
});

if (config.serveStaticFiles) {
  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    console.warn(
      `No se encontró la carpeta dist en ${distPath}. Ejecuta "npm run build" antes de levantar el servidor en IIS.`,
    );
  }
}

app.use((error, _req, res, _next) => {
  const message =
    error instanceof Error ? error.message : "Error interno del servidor";
  console.error(error);
  sendError(res, 500, message);
});

const start = async () => {
  await initializeDatabase();
  await cleanupExpiredSessions();
  setInterval(() => {
    cleanupExpiredSessions().catch((error) => console.error(error));
  }, 60 * 60 * 1000).unref();

  const localUrl = `http://localhost:${config.port}`;
  const publicUrl = config.publicAppUrl || config.publicIpUrl || localUrl;
  const publicApiUrl =
    config.publicApiUrl || `${publicUrl.replace(/\/$/, "")}/api`;

  app.listen(config.port, () => {
    console.log(`PortalIssa escuchando en ${publicUrl}`);
    console.log(`API disponible en ${publicApiUrl}`);
  });
};

start().catch((error) => {
  console.error("No se pudo iniciar la API PortalIssa", error);
  process.exitCode = 1;
});
