import express from "express";

// >>> IMPORT THE CONTROLLERS
import {
  LoginUser,
  LogoutUser,
  RegisterUser,
  DeleteUser,
} from "../controllers/AuthController.js";
import { refreshToken } from "../controllers/RefreshTokenController.js";
import {
  priceFinderCallback,
  priceFinderErrorCallback,
} from "../controllers/CallbackController.js";
import { VerifyToken } from "../middleware/VerifyToken.js";
import {
  getUsers,
  getUserById,
  updateUser,
} from "../controllers/UserController.js";
import {
  saveDraft,
  save_project,
  list_project,
  list_draft,
  getDraftItems,
  updateDraft,
  deleteDraft,
  getAllPriceWithQuery,
  UpdateProject,
  delete_project,
  cloneProject,
  box_list,
  saveBox,
  projectnya,
  buatPenawaran,
  delete_pricelist,
  update_pricelist,
  create_pricelist,
  create_box,
  update_box,
  delete_box,
  getAPIUsage,
  incrementAPIUsage,
  importPricelist,
  getAccessoriesTypes,
  getPricelistByAccessories,
  createAccessories,
  updateAccessories,
  deleteAccessories,
  searchPricelist,
} from "../controllers/SiswaController.js";
import { uploadFile } from "../controllers/UploadController.js";

// >>> DEFINE ROUTER FROM EXPRESS
const router = express.Router();

// ============================================================
// PUBLIC ROUTES — no authentication required
// ============================================================
router.get("/token", refreshToken);
router.post("/register", RegisterUser);
router.post("/login", LoginUser);
router.post("/auth/login", LoginUser);
router.delete("/logout", LogoutUser);

// n8n callback — protected by n8n's own mechanism, no JWT needed
router.post("/api/callback/price-finder", priceFinderCallback);
router.post("/api/callback/price-finder/error", priceFinderErrorCallback);
router.get("/api/test-n8n", (req, res) =>
  res.json({ message: "Backend is reachable!", timestamp: new Date() }),
);

// ============================================================
// PROTECTED ROUTES — VerifyToken required
// ============================================================

// --- Project Management ---
router.get("/projects", VerifyToken, list_project);
router.get("/projects/:id", VerifyToken, projectnya);
router.post("/projects", VerifyToken, save_project);
router.put("/projects/:id", VerifyToken, UpdateProject);
router.delete("/projects/:id", VerifyToken, delete_project);
router.post("/projects/:id/clone", VerifyToken, cloneProject);

// --- SLD Draft Management ---
router.get("/list-draft", VerifyToken, list_draft);
router.get("/list-draft/:id", VerifyToken, getDraftItems);
router.post("/save-sld", VerifyToken, saveDraft);
router.post("/update-sld", VerifyToken, updateDraft);
router.delete("/list-draft/:id", VerifyToken, deleteDraft);

// --- Invoice Management ---
router.post("/upload", VerifyToken, uploadFile);
router.get("/api-usage", VerifyToken, getAPIUsage);
router.post("/apiusage/:userId", VerifyToken, incrementAPIUsage);

// --- Pricelist & Box ---
router.get("/pricelist", VerifyToken, getAllPriceWithQuery);
router.get("/pricelist-search", VerifyToken, searchPricelist);
router.post("/pricelist", VerifyToken, create_pricelist);
router.put("/pricelist/:id", VerifyToken, update_pricelist);
router.delete("/pricelist/:id", VerifyToken, delete_pricelist);
router.get("/box-list", VerifyToken, box_list);
router.post("/box-list", VerifyToken, create_box);
router.put("/box-list/:id", VerifyToken, update_box);
router.delete("/box-list/:id", VerifyToken, delete_box);
router.post("/save-box", VerifyToken, saveBox);
router.post("/import-pricelist", VerifyToken, importPricelist);

// --- Accessories ---
router.get("/accessories-types", VerifyToken, getAccessoriesTypes);
router.post("/accessories-types", VerifyToken, createAccessories);
router.put("/accessories-types/:id", VerifyToken, updateAccessories);
router.delete("/accessories-types/:id", VerifyToken, deleteAccessories);
router.get(
  "/pricelist-by-accessories/:accessoriesType",
  VerifyToken,
  getPricelistByAccessories,
);

// --- Penawaran ---
router.get("/draft-penawaran/:id", VerifyToken, buatPenawaran);

// --- User Management ---
router.get("/users", VerifyToken, getUsers);
router.post("/users", VerifyToken, getUsers);
router.delete("/users/:id", VerifyToken, DeleteUser);
router.get("/users/:id", VerifyToken, getUserById);
router.post("/users/:id", VerifyToken, getUserById);
router.put("/users/:id", VerifyToken, updateUser);

export default router;
