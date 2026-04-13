// --- IMPORTING EXTERNAL MODUlES
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import session from "express-session";
import fileUpload from "express-fileupload";
import { createServer } from "http";
import { Server } from "socket.io";
import rateLimit from "express-rate-limit";
import selectedBox from "./models/selectedBox.js";
dotenv.config();

// --- IMPORTING INTERNAL MODULES
import DB from "./config/Database.js";
import sld_draft from "./models/DraftModel.js";
import Users from "./models/UserModel.js";
import ProjectModel from "./models/ProjectModel.js";
import sld_draft_name from "./models/sld_draft.js";
import Pricelist from "./models/Pricelist.js";
import "./models/associations.js";
import BoxModel from "./models/BoxModel.js";
import invoice from "./models/invoiceModel.js";
import transaction from "./models/transactionModel.js";
import APIUsageGroup from "./models/api_ussage_group.js";
import APIUsageIndividual from "./models/api_ussage_individual.js";
import Accessories from "./models/accessories.js";
import router from "./routes/Routes.js";
import path from "path";
import fs from "fs";

// --- DEFINE APP FROM EXPRESS
const app = express();
const httpServer = createServer(app);

function getCorsOrigins() {
  const origins = [];

  // Backwards-compatible: comma-separated list in CORS_ORIGIN
  if (process.env.CORS_ORIGIN) {
    origins.push(
      ...process.env.CORS_ORIGIN.split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    );
  }

  // Easier to maintain in .env:
  // CORS_ORIGIN_1=http://...
  // CORS_ORIGIN_2=http://...
  // (dotenv can't have the same key repeated, so this pattern works well)
  const numbered = Object.keys(process.env)
    .filter((k) => /^CORS_ORIGIN_\d+$/.test(k))
    .sort((a, b) => {
      const na = parseInt(a.split("_").pop(), 10);
      const nb = parseInt(b.split("_").pop(), 10);
      return (isNaN(na) ? 0 : na) - (isNaN(nb) ? 0 : nb);
    })
    .map((k) => String(process.env[k] || "").trim())
    .filter(Boolean);

  origins.push(...numbered);

  // De-dupe
  return [...new Set(origins)];
}

const corsOrigins = getCorsOrigins();
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins.length > 0 ? corsOrigins : "*",
    methods: ["GET", "POST"],
  },
});

// Attach io to app for access in routes
app.set("io", io);

// Socket.io Connection Logic
io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("join_draft", (draftId) => {
    socket.join(`draft_${draftId}`);
    console.log(`Socket ${socket.id} joined room: draft_${draftId}`);
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// --- APP INTEGRATION
app.use(
  cors({
    credentials: true,
    origin: corsOrigins.length > 0 ? corsOrigins : true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(fileUpload());

// --- RATE LIMITING ---
// 1. General Rate Limiter: 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    message: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

// 2. Strict Login Limiter: 5 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Increased for testing
  message: {
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/login", loginLimiter);
app.use("/auth/login", loginLimiter);
app.use(express.static("public"));
app.use(
  "/invoice-detail-image",
  express.static(process.env.ATTENDANCE_UPLOAD_DIR),
);
app.use(router);

// --- DATABASE CONNECTION
try {
  await DB.authenticate();
  console.log("Database Connected !");
  await Users.sync();
  await ProjectModel.sync({alter: true});
  await sld_draft_name.sync();
  await sld_draft.sync();
  await BoxModel.sync();
  await Pricelist.sync();
  await selectedBox.sync();
  await invoice.sync();
  await transaction.sync();
  await APIUsageGroup.sync();
  await APIUsageIndividual.sync();
  await Accessories.sync();
} catch (error) {
  console.log(error);
}

const PHOTO_DIR = path.resolve(process.env.ATTENDANCE_UPLOAD_DIR);
console.log(`[DEBUG] Resolved PHOTO_DIR: ${PHOTO_DIR}`);

if (fs.existsSync(PHOTO_DIR)) {
  console.log(`[DEBUG] Directory exists. Contents:`);
  try {
    const files = fs.readdirSync(PHOTO_DIR);
    console.log(files.slice(0, 5)); // Show first 5 files
  } catch (err) {
    console.error(`[DEBUG] Error reading directory:`, err);
  }
} else {
  console.error(`[DEBUG] Directory DOES NOT exist!`);
}

app.use("/photos", express.static(PHOTO_DIR));

// --- START THE SERVER
httpServer.listen(16753, () => {
  console.log("Server Start on port 16753");
});
