import path from "path";
import fs from "fs";
import DB from "../config/Database.js";
import Users from "../models/UserModel.js";
import invoice from "../models/invoiceModel.js";
import transaction from "../models/transactionModel.js";

export const uploadFile = async (req, res) => {
  console.log("=== UPLOAD FILE REQUEST ===");
  console.log("Body:", req.body);
  console.log("Files:", req.files ? Object.keys(req.files) : "No files");

  let savePath = null;

  try {
    // 1. Validate Input & Data First (Fail Fast)
    if (!req.files || !req.files.file) {
      console.log("[❌] No file found in request");
      return res.status(400).json({ message: "No file uploaded" });
    }
    console.log(
      "[✅] File found:",
      req.files.file.name,
      `(${req.files.file.size} bytes)`,
    );

    const transactionsRaw = req.body.transactions;
    let transactions = [];
    try {
      transactions =
        typeof transactionsRaw === "string"
          ? JSON.parse(transactionsRaw)
          : transactionsRaw || [];
      console.log("[✅] Transactions parsed:", transactions.length, "items");
    } catch (e) {
      console.log("[❌] Failed to parse transactions:", e.message);
      return res
        .status(400)
        .json({
          message: "Invalid transactions data format",
          error: e.message,
        });
    }

    // 🔥 SECURITY FIX: Use req.userId from verified token, not body email
    const FindUser = await Users.findByPk(req.userId);

    if (!FindUser) {
      console.log("[❌] User not found for ID:", req.userId);
      return res.status(404).json({ message: "User not found" });
    }
    console.log(
      "[✅] User found from session:",
      FindUser.name,
      `(id: ${FindUser.id})`,
    );

    // 🔥 SECURITY FIX: MIME-type validation
    const allowedMimes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedMimes.includes(req.files.file.mimetype)) {
      console.log("[❌] Invalid MIME type:", req.files.file.mimetype);
      return res
        .status(422)
        .json({
          message: "Invalid file type. Only JPG, PNG, and PDF are allowed.",
        });
    }

    // 2. Prepare Directory
    const uploadDir = process.env.ATTENDANCE_UPLOAD_DIR;
    console.log("[📁] Upload directory:", uploadDir);

    if (!fs.existsSync(uploadDir)) {
      console.log("[📁] Directory not found, creating...");
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log("[✅] Directory created:", uploadDir);
    } else {
      console.log("[✅] Directory already exists:", uploadDir);
    }

    // Check directory access
    try {
      fs.accessSync(uploadDir, fs.constants.R_OK | fs.constants.W_OK);
      console.log("[✅] Directory is accessible (read & write)");
    } catch (err) {
      console.log("[❌] Directory is NOT accessible:", err.message);
      return res
        .status(500)
        .json({
          message: "Upload directory is not accessible",
          error: err.message,
        });
    }

    // 3. Prepare File Information
    const file = req.files.file;
    const ext = path.extname(file.name) || "";
    const safeName =
      (FindUser.name || "user")
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_-]/g, "") || "user";
    const timestamp = Date.now();
    const newFilename = `${safeName}_${timestamp}${ext}`;
    savePath = path.join(uploadDir, newFilename);
    console.log("[📄] New filename:", newFilename);
    console.log("[📄] Full save path:", savePath);

    // 4. Move File (callback style wrapped in Promise)
    console.log("[⏳] Attempting to move file...");
    try {
      await new Promise((resolve, reject) => {
        file.mv(savePath, (err) => {
          if (err) {
            console.log("[❌] Failed to move file:", err.message);
            reject(err);
          } else {
            console.log("[✅] File moved successfully to:", savePath);
            resolve();
          }
        });
      });
    } catch (err) {
      return res
        .status(500)
        .json({
          message: "Failed to save file to directory",
          error: err.message,
        });
    }

    // 5. Database Transaction (Atomic)
    console.log("[⏳] Starting database transaction...");
    let createInvoice;
    let transactionRows;

    try {
      await DB.transaction(async (t) => {
        createInvoice = await invoice.create(
          {
            id_user: FindUser.id,
            nama_invoice: newFilename,
            tanggal_upload: new Date(),
            total_harga: parseInt(req.body.grand_total, 10) || 0,
            status: "on_review",
          },
          { transaction: t },
        );
        console.log("[✅] Invoice created, id:", createInvoice.id);

        const parseDate = (str) => {
          if (!str) return null;
          const [d, m, y] = String(str).split("/");
          if (d && m && y)
            return new Date(
              parseInt(y, 10),
              parseInt(m, 10) - 1,
              parseInt(d, 10),
            );
          return new Date(str);
        };

        transactionRows = transactions.map((tr) => ({
          invoice_id: createInvoice.id,
          id_user: FindUser.id,
          tanggal: parseDate(tr.tanggal),
          merchant: tr.merchant || null,
          kategori: tr.kategori || null,
          jumlah: parseInt(tr.jumlah, 10) || 0,
        }));

        await transaction.bulkCreate(transactionRows, { transaction: t });
        console.log("[✅] Transactions saved:", transactionRows.length, "rows");
      });

      console.log("[✅] Database transaction committed successfully");

      // 6. Success Response
      return res.status(200).json({
        message: "File uploaded and data created successfully",
        filename: newFilename,
        originalName: file.name,
        path: savePath,
        invoice_id: createInvoice.id,
        transactions_saved: transactionRows.length,
      });
    } catch (dbError) {
      // 7. Rollback File if Database Fails
      console.log("[❌] Database transaction failed:", dbError.message);
      if (savePath && fs.existsSync(savePath)) {
        try {
          fs.unlinkSync(savePath);
          console.log(
            "[✅] File rolled back (deleted) after DB failure:",
            savePath,
          );
        } catch (unlinkErr) {
          console.log(
            "[❌] Failed to delete file during rollback:",
            unlinkErr.message,
          );
        }
      }
      throw dbError;
    }
  } catch (error) {
    console.log("[❌] Global error:", error.message);
    return res.status(500).json({
      message: "Process failed. No data was created.",
      error: error.message,
    });
  }
};
