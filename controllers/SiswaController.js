import { Op } from "sequelize";
import Users from "../models/UserModel.js";
import sld_draft from "../models/DraftModel.js";
import ProjectModel from "../models/ProjectModel.js";
import sld_draft_name from "../models/sld_draft.js";
import Pricelist from "../models/Pricelist.js";
import BoxModel from "../models/BoxModel.js";
import selectedBox from "../models/selectedBox.js";
import invoice from "../models/invoiceModel.js";
import transaction from "../models/transactionModel.js";
import APIUsageGroup from "../models/api_ussage_group.js";
import APIUsageIndividual from "../models/api_ussage_individual.js";
import Accessories from "../models/accessories.js";
import DB from "../config/Database.js";
import * as XLSX from "xlsx";

// >>> IMPORT PRICELIST FROM EXCEL
export const importPricelist = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ msg: "No file uploaded" });
    }

    const file = req.files.file;
    const workbook = XLSX.read(file.data, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return res.status(400).json({ msg: "Excel file is empty" });
    }

    const products = data.map((row) => {
      const hargaRaw = row.Harga || row.Price || row.HARGA || row.PRICE || 0;
      const harga = parseInt(String(hargaRaw).replace(/[^0-9]/g, "")) || 0;

      return {
        deskripsi: row.Deskripsi || row.description || row.DESKRIPSI || null,
        tipe: row.Tipe || row.Type || row.TIPE || row.TYPE || null,
        merk: row.Merk || row.Brand || row.MERK || row.BRAND || null,
        qty: String(row.Qty || row.Quantity || row.QTY || row.QUANTITY || "1"),
        unit: row.Unit || row.Satuan || row.UNIT || row.SATUAN || "Pcs",
        harga: harga,
        additional_accessories:
          row.Accessories ||
          row.Accessory ||
          row.ACCESSORIES ||
          row.ACCESSORY ||
          row.additional_accessories ||
          null,
        created_by: req.alldata ? req.alldata.email : null,
      };
    });

    console.log(`[IMPORT] Attempting to import ${products.length} products`);
    await Pricelist.bulkCreate(products);

    res
      .status(200)
      .json({ msg: `Successfully imported ${products.length} products` });
  } catch (error) {
    console.error("Import error detail:", error);
    res
      .status(500)
      .json({ msg: "Failed to import pricelist: " + error.message });
  }
};

// >>> SAVE SLD DRAFT
export const saveDraft = async (req, res) => {
  console.log("=== SAVE DRAFT ===", req.body);
  const total_item = req.body.items.length;
  const documentTitle = req.body.documentTitle;

  try {
    // Check if draft with same name already exists
    const existingDraft = await sld_draft_name.findOne({
      where: {
        draft_name: documentTitle,
      },
    });

    if (existingDraft) {
      return res.status(400).json({
        message: `Draft with name "${documentTitle}" already exists. Please use a different name.`,
        error: "DUPLICATE_DRAFT_NAME",
      });
    }

    console.log("=== TOTAL ITEM ===", total_item);

    const newDraft = await sld_draft_name.create({
      project_id: req.body.projectId,
      project_name: req.body.projectName,
      draft_name: documentTitle,
    });

    for (let i = 0; i < total_item; i++) {
      const item = req.body.items[i];
      console.log(`=== ITEM ${i} ===`, item);

      const response = await sld_draft.create({
        qty: item.quantity,
        unit: item.unit,
        description: item.description,
        category: item.category || item.CATEGORY,
        type: item.type,
        brand_merk: item.brand_merk,
        project: req.body.projectName,
        draft_name: documentTitle,
      });

      console.log(`=== ITEM ${i} SAVED ===`, response); // add this to confirm saves
    }

    res.status(200).json({
      message: "Draft created successfully",
      draftId: newDraft.id,
      draftName: newDraft.draft_name,
    });
  } catch (error) {
    console.error("=== ERROR ===", error); // add this so you can see the real error
    res.status(500).json({ message: error.message, error });
  }
};

// >>> UPDATE SLD DRAFT
export const updateDraft = async (req, res) => {
  const { draftId, projectId, documentTitle, items } = req.body;
  const total_item = items.length;
  console.log("=== UPDATE DRAFT ===", { draftId, documentTitle, total_item });

  try {
    // 1. Find the master draft record
    let selectedDraftName;
    if (draftId) {
      selectedDraftName = await sld_draft_name.findByPk(draftId);
    } else {
      // Fallback: search by draft_name and project_id if draftId not provided
      const queryDraft = { draft_name: documentTitle };
      if (projectId && !isNaN(projectId)) {
        queryDraft.project_id = projectId;
      }
      selectedDraftName = await sld_draft_name.findOne({ where: queryDraft });
    }

    if (!selectedDraftName) {
      return res.status(404).json({ message: "Draft record not found" });
    }

    // 2. Delete ALL existing items for this draft name
    await sld_draft.destroy({
      where: {
        draft_name: selectedDraftName.draft_name,
      },
      force: true, // Permanent delete to avoid clutter if paranoid is on
    });

    // 3. Insert the new set of items
    for (let i = 0; i < total_item; i++) {
      const item = items[i];
      await sld_draft.create({
        qty: item.quantity || item.qty,
        unit: item.unit,
        description: item.description,
        category: item.category || item.CATEGORY,
        type: item.type,
        brand_merk: item.brand_merk,
        price: item.price,
        disc: item.disc,
        project: selectedDraftName.project_name,
        draft_name: selectedDraftName.draft_name,
      });
    }

    // 4. Update the master record state
    const anyPrice = items.some(
      (it) =>
        it.price && !isNaN(parseFloat(it.price)) && parseFloat(it.price) > 0,
    );
    await sld_draft_name.update(
      {
        is_priced: anyPrice ? "yes" : "no",
        // Update title if it changed (optional, but good for consistency)
        draft_name: documentTitle || selectedDraftName.draft_name,
      },
      {
        where: {
          id: selectedDraftName.id,
        },
      },
    );

    res.status(200).json({
      message: "Draft updated successfully",
      draftId: selectedDraftName.id,
    });
  } catch (error) {
    console.error("=== UPDATE ERROR ===", error);
    res.status(500).json({ message: error.message, error });
  }
};

// >>> GET ALL DRAFT NAME
export const list_draft = async (req, res) => {
  try {
    const { project_id } = req.query;
    const where = project_id ? { project_id } : {};

    const response = await sld_draft_name.findAll({
      where,
      include: [
        {
          model: ProjectModel,
          attributes: ["id", "project_name", "client", "status"],
        },
      ],
    });
    res.json(response);
  } catch (error) {
    res.status(500).json(error);
  }
};

// >>> GET ALL DRAFT ITEMS BY DRAFT NAME
export const getDraftItems = async (req, res) => {
  const the_id = req.params.id;
  console.log(`[getDraftItems] Fetching draft items for ID: ${the_id}`);
  
  try {
    const response = await sld_draft_name.findOne({
      where: {
        id: the_id,
      },
    });
    
    if (!response) {
      console.log(`[getDraftItems] Draft not found with ID: ${the_id}`);
      return res.status(404).json({ 
        error: "Draft not found",
        message: `No draft with ID: ${the_id}` 
      });
    }

    console.log("[getDraftItems] Found draft:", response.draft_name);
    
    // Query by draft_name (using draft_name as the link)
    const data = await sld_draft.findAll({
      where: {
        draft_name: response.draft_name,
      },
      attributes: [
        "id",
        "qty",
        "unit",
        "description",
        "category",
        "type",
        "brand_merk",
        "price",
        "disc",
        "jumlah",
        "notes",
      ],
    });

    console.log(`[getDraftItems] Found ${data.length} items`);

    res.json({ data });
  } catch (error) {
    console.error("[getDraftItems] ERROR:", error.message);
    console.error("[getDraftItems] Full error:", error);
    res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
};

// >>> GET ALL PROJECT
export const list_project = async (req, res) => {
  try {
    const response = await ProjectModel.findAll({
      // attributes: ['project'],
      // group: ['project']
    });
    res.json(response);
  } catch (error) {
    res.status(500).json(error);
  }
};

export const projectnya = async (req, res) => {
  try {
    const response = await ProjectModel.findOne({
      where: {
        id: req.params.id,
      },
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// >>> DELETE DRAFT
export const deleteDraft = async (req, res) => {
  const draftId = req.params.id;
  console.log(`[deleteDraft] Deleting draft ID: ${draftId}`);

  try {
    // Find the draft to get its name
    const draft = await sld_draft_name.findOne({
      where: {
        id: draftId,
      },
    });

    if (!draft) {
      return res.status(404).json({
        message: "Draft not found",
      });
    }

    // Delete all items associated with this draft
    const itemsDeleted = await sld_draft.destroy({
      where: {
        draft_name: draft.draft_name,
      },
      force: true, // Permanent delete
    });

    console.log(`[deleteDraft] Deleted ${itemsDeleted} items`);

    // Delete the draft master record
    await sld_draft_name.destroy({
      where: {
        id: draftId,
      },
      force: true, // Permanent delete
    });

    console.log(`[deleteDraft] Draft deleted successfully`);

    res.status(200).json({
      message: "Draft deleted successfully",
      draftId: draftId,
      itemsDeleted: itemsDeleted,
    });
  } catch (error) {
    console.error("[deleteDraft] ERROR:", error.message);
    res.status(500).json({
      message: "Failed to delete draft",
      error: error.message,
    });
  }
};

// >>> SAVE PROJECT
export const save_project = async (req, res) => {
  console.log("=== SAVE PROJECT ===", req.body);
  try {
    const response = await ProjectModel.create({
      project_name: req.body.name,
      client: req.body.client,
      start_date: req.body.start_date,
      budget: req.body.budget,
      status: req.body.status,
      biaya_delivery: req.body.biaya_delivery ?? null,
      biaya_skbdn: req.body.biaya_skbdn ?? null,
      komisi_extrenal: req.body.komisi_extrenal ?? null,
      biaya_lainnya: req.body.biaya_lainnya ?? null,
      margin: req.body.margin ?? null,
    });
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json(error);
  }
  // res.status(200).json("oke");
};

// >>> DELETE PROJECT
export const delete_project = async (req, res) => {
  try {
    const response = await ProjectModel.findOne({
      where: {
        id: req.params.id,
      },
    });
    if (!response) {
      return res.status(404).json({ msg: "Project not found" });
    }
    await ProjectModel.destroy({
      where: {
        id: req.params.id,
      },
    });
    res.status(200).json({ msg: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

// >>> CLONE PROJECT
export const cloneProject = async (req, res) => {
  try {
    const sourceProjectId = req.params.id;
    const { newProjectName } = req.body;

    // 1. Find the source project
    const sourceProject = await ProjectModel.findOne({
      where: {
        id: sourceProjectId,
      },
    });

    if (!sourceProject) {
      return res.status(404).json({ msg: "Source project not found" });
    }

    // 2. Create new project with cloned data
    const clonedProject = await ProjectModel.create({
      project_name: newProjectName || `${sourceProject.project_name} (Copy)`,
      client: sourceProject.client,
      start_date: sourceProject.start_date,
      budget: sourceProject.budget,
      status: sourceProject.status || "active",
      biaya_delivery: sourceProject.biaya_delivery,
      biaya_skbdn: sourceProject.biaya_skbdn,
      komisi_extrenal: sourceProject.komisi_extrenal,
      biaya_lainnya: sourceProject.biaya_lainnya,
      margin: sourceProject.margin,
    });

    console.log(`[cloneProject] Created new project: ${clonedProject.id}`);

    // 3. Get all drafts from source project
    const sourceDrafts = await sld_draft_name.findAll({
      where: {
        project_id: sourceProjectId,
      },
    });

    console.log(`[cloneProject] Found ${sourceDrafts.length} drafts to clone`);

    // 4. Clone each draft and its items
    let clonedDraftCount = 0;
    let clonedItemCount = 0;

    for (const sourceDraft of sourceDrafts) {
      // --- FIX: Generate a unique draft_name for the cloned draft ---
      // The original bug: using the same draft_name as the source caused
      // sld_draft items to be shared between source and clone (string-based link).
      // Solution: append the new project's ID as a suffix to guarantee uniqueness.
      const uniqueClonedDraftName = `${sourceDraft.draft_name} [P${clonedProject.id}]`;

      // Create cloned draft with the unique name
      const clonedDraft = await sld_draft_name.create({
        project_id: clonedProject.id,
        project_name: clonedProject.project_name,
        draft_name: uniqueClonedDraftName,
        is_priced: sourceDraft.is_priced,
      });

      clonedDraftCount++;

      // Get all items from SOURCE draft (using source's original name)
      const sourceItems = await sld_draft.findAll({
        where: {
          draft_name: sourceDraft.draft_name,
        },
      });

      console.log(`[cloneProject] Cloning ${sourceItems.length} items from draft "${sourceDraft.draft_name}" → "${uniqueClonedDraftName}"`);

      // Clone each item using the NEW unique draft name
      for (const sourceItem of sourceItems) {
        await sld_draft.create({
          qty: sourceItem.qty,
          unit: sourceItem.unit,
          description: sourceItem.description,
          type: sourceItem.type,
          category: sourceItem.category,
          brand_merk: sourceItem.brand_merk,
          project: clonedProject.project_name,
          draft_name: uniqueClonedDraftName,  // ← unique name, not sourceDraft.draft_name
          price: sourceItem.price,
          disc: sourceItem.disc,
          jumlah: sourceItem.jumlah,
          harga_rp: sourceItem.harga_rp,
          notes: sourceItem.notes,
        });

        clonedItemCount++;
      }
    }

    res.status(200).json({
      msg: "Project cloned successfully",
      newProjectId: clonedProject.id,
      newProjectName: clonedProject.project_name,
      clonedDrafts: clonedDraftCount,
      clonedItems: clonedItemCount,
    });
  } catch (error) {
    console.error("[cloneProject] ERROR:", error.message);
    res.status(500).json({ msg: error.message });
  }
};

// >>> GET ALL PRICE LIST
export const price_list = async (req, res) => {
  try {
    const response = await Pricelist.findAll({
      attributes: [
        "id",
        "qty",
        "unit",
        "deskripsi",
        "tipe",
        "merk",
        "harga_before_disc",
        "disc",
        "harga",
        "disc_",
        "created_by",
        "updated_by",
      ],
    });
    res.json(response);
  } catch (error) {
    res.status(500).json(error);
  }
};

// >>> GET ALL PRICE LIST WITH QUERY PARAMS (SEARCH, PAGINATION)
export const getAllPriceWithQuery = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || ""; // Capture search param
    const offset = (page - 1) * limit;
    // Define search condition using partial match (LIKE)
    const where = search
      ? {
          [Op.or]: [
            { deskripsi: { [Op.iLike]: `%${search}%` } }, // Note the 'i' in iLike
            { tipe: { [Op.iLike]: `%${search}%` } },
            { merk: { [Op.iLike]: `%${search}%` } },
            { additional_accessories: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};
    const result = await Pricelist.findAndCountAll({
      where, // Apply search filter
      limit,
      offset,
      attributes: [
        "id",
        "qty",
        "unit",
        "deskripsi",
        "tipe",
        "merk",
        "harga_before_disc",
        "disc",
        "harga",
        "disc_",
        "created_by",
        "updated_by",
        "additional_accessories",
      ],
    });
    res.json({
      currentPage: page,
      perPage: limit,
      totalItems: result.count,
      totalPages: Math.ceil(result.count / limit),
      products: result.rows,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const delete_pricelist = async (req, res) => {
  try {
    const product = await Pricelist.findOne({
      where: {
        id: req.params.id,
      },
    });
    if (!product) return res.status(404).json({ msg: "Product not found" });
    await Pricelist.destroy({
      where: {
        id: req.params.id,
      },
    });
    res.status(200).json({ msg: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

export const update_pricelist = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Pricelist.findByPk(id);

    if (!product) {
      return res.status(404).json({ msg: "Product not found" });
    }

    const { deskripsi, tipe, merk, harga, qty, unit, additional_accessories } =
      req.body;

    // Using instance update for better reliability
    await product.update({
      deskripsi: deskripsi !== undefined ? deskripsi : product.deskripsi,
      tipe: tipe !== undefined ? tipe : product.tipe,
      merk: merk !== undefined ? merk : product.merk,
      harga: harga !== undefined ? harga : product.harga,
      qty: qty !== undefined ? qty : product.qty,
      unit: unit !== undefined ? unit : product.unit,
      additional_accessories:
        additional_accessories !== undefined
          ? additional_accessories
          : product.additional_accessories,
    });

    res.status(200).json({ msg: "Product updated successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error: " + error.message });
  }
};

export const create_pricelist = async (req, res) => {
  try {
    const { deskripsi, tipe, merk, harga, qty, unit, additional_accessories } =
      req.body;

    const product = await Pricelist.create({
      deskripsi,
      tipe,
      merk,
      harga,
      qty,
      unit,
      additional_accessories: additional_accessories || null,
      created_by: req.user ? req.user.email : null,
    });

    res.status(201).json({ msg: "Product created successfully", product });
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error: " + error.message });
  }
};

export const UpdateProject = async (req, res) => {
  console.log("=== PROJECT ID ===", req.params.id);
  console.log("=== UPDATE PROJECT ===", req.body);
  // return res.status(200).json("oke");
  const projectId = req.params.id;
  // const { project_name, client, start_date, budget, status } = req.body;

  try {
    const project = await ProjectModel.findByPk(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const patch = {};
    if (req.body.name !== undefined) patch.project_name = req.body.name;
    if (req.body.client !== undefined) patch.client = req.body.client;
    if (req.body.start_date !== undefined) patch.start_date = req.body.start_date;
    if (req.body.budget !== undefined) patch.budget = req.body.budget;
    if (req.body.status !== undefined) patch.status = req.body.status;

    if (req.body.biaya_delivery !== undefined)
      patch.biaya_delivery = req.body.biaya_delivery;
    if (req.body.biaya_skbdn !== undefined) patch.biaya_skbdn = req.body.biaya_skbdn;
    if (req.body.komisi_extrenal !== undefined)
      patch.komisi_extrenal = req.body.komisi_extrenal;
    if (req.body.biaya_lainnya !== undefined)
      patch.biaya_lainnya = req.body.biaya_lainnya;
    if (req.body.margin !== undefined) patch.margin = req.body.margin;

    const response = await project.update(patch);
    res.status(200).json({ message: "Project updated successfully", project: response });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const box_list = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;

    const where = search
      ? {
          [Op.or]: [
            { nama_panel: { [Op.iLike]: `%${search}%` } },
            { ukuran_panel: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    const result = await BoxModel.findAndCountAll({
      where,
      limit,
      offset,
      attributes: [
        "id",
        "nama_panel",
        "ukuran_panel",
        "harga_panel",
        "harga_wiring",
      ],
    });

    res.json({
      currentPage: page,
      perPage: limit,
      totalItems: result.count,
      totalPages: Math.ceil(result.count / limit),
      boxes: result.rows,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const create_box = async (req, res) => {
  try {
    const { nama_panel, ukuran_panel, harga_panel, harga_wiring } = req.body;
    const box = await BoxModel.create({
      nama_panel,
      ukuran_panel,
      harga_panel,
      harga_wiring,
    });
    res.status(201).json({ msg: "Box created successfully", box });
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error: " + error.message });
  }
};

export const update_box = async (req, res) => {
  const { id } = req.params;
  try {
    const box = await BoxModel.findByPk(id);
    if (!box) {
      return res.status(404).json({ msg: "Box not found" });
    }
    const { nama_panel, ukuran_panel, harga_panel, harga_wiring } = req.body;
    await box.update({
      nama_panel: nama_panel !== undefined ? nama_panel : box.nama_panel,
      ukuran_panel:
        ukuran_panel !== undefined ? ukuran_panel : box.ukuran_panel,
      harga_panel: harga_panel !== undefined ? harga_panel : box.harga_panel,
      harga_wiring:
        harga_wiring !== undefined ? harga_wiring : box.harga_wiring,
    });
    res.status(200).json({ msg: "Box updated successfully" });
  } catch (error) {
    res.status(500).json({ msg: "Internal Server Error: " + error.message });
  }
};

export const delete_box = async (req, res) => {
  try {
    const box = await BoxModel.findOne({
      where: {
        id: req.params.id,
      },
    });
    if (!box) return res.status(404).json({ msg: "Box not found" });
    await BoxModel.destroy({
      where: {
        id: req.params.id,
      },
    });
    res.status(200).json({ msg: "Box deleted successfully" });
  } catch (error) {
    res.status(500).json({ msg: error.message });
  }
};

export const saveBox = async (req, res) => {
  console.log("=== SAVE BOX ===", req.body);
  const boxData = req.body.boxes[0];
  try {
    const existing = await selectedBox.findOne({
      where: { draft_id: req.body.draft_id },
    });

    let response2;
    if (existing) {
      response2 = await existing.update({
        nama_panel: boxData.nama_panel,
        ukuran_panel: boxData.ukuran_panel,
        harga_panel: boxData.harga_panel,
        harga_wiring: boxData.harga_wiring,
        total_harga: boxData.total_harga,
      });
    } else {
      response2 = await selectedBox.create({
        draft_id: req.body.draft_id,
        nama_panel: boxData.nama_panel,
        ukuran_panel: boxData.ukuran_panel,
        harga_panel: boxData.harga_panel,
        harga_wiring: boxData.harga_wiring,
        total_harga: boxData.total_harga,
      });
    }

    res
      .status(200)
      .json({ message: "Box recommendation updated successfully", response2 });
  } catch (error) {
    console.error("Error updating draft with box ID:", error);
    res
      .status(500)
      .json({ message: "Failed to update draft with box ID", error });
  }
};

export const buatPenawaran = async (req, res) => {
  try {
    const projectId = req.params.id;
    const project = await ProjectModel.findOne({
      where: { id: projectId },
    });
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const sldDrafts = await sld_draft_name.findAll({
      where: { project_id: project.id },
      order: [["id", "ASC"]],
    });

    const items = [];
    let no = 1;
    let totalHarga = 0;

    for (const sld of sldDrafts) {
      const draftLines = await sld_draft.findAll({
        where: { draft_name: sld.draft_name },
        order: [["id", "ASC"]],
      });

      for (const row of draftLines) {
        const qty = Math.max(0, parseInt(row.qty, 10) || 0);
        const hargaAwalRp =
          parseInt(String(row.price).replace(/\D/g, ""), 10) || 0;

        // Fix: Parse discount as percentage and calculate price after discount
        const discStr =
          row.disc != null ? String(row.disc).replace("%", "").trim() : "0";
        const discPercent = parseFloat(discStr) || 0;

        // If harga_rp (harga setelah diskon) is present and looks valid, use it.
        // Otherwise, calculate it from hargaAwalRp and discPercent.
        let hargaSetelahDiscRp =
          parseInt(String(row.harga_rp || row.jumlah).replace(/\D/g, ""), 10) ||
          0;

        if (hargaSetelahDiscRp === 0 || hargaSetelahDiscRp === hargaAwalRp) {
          if (discPercent > 0) {
            hargaSetelahDiscRp = Math.round(
              hargaAwalRp * (1 - discPercent / 100),
            );
          } else {
            hargaSetelahDiscRp = hargaAwalRp;
          }
        }

        const rowTotal = hargaSetelahDiscRp * qty;
        totalHarga += rowTotal;

        items.push({
          no: no++,
          // Source grouping (for BoQ UI divider)
          sld_id: sld.id,
          sld_name: sld.draft_name,
          category: row.category || null,
          qty,
          satuan: row.unit || "-",
          nama_panel: row.description || row.type || "-",
          tipe_ukuran: row.type || "-",
          harga_awal_rp: hargaAwalRp,
          disc: discStr, // Return numeric string for frontend display
          harga_setelah_disc_rp: hargaSetelahDiscRp,
          row_total: rowTotal,
        });
      }

      const box = await selectedBox.findOne({
        where: { draft_id: sld.id },
      });
      if (box) {
        const qty = 1;
        const hargaAwalRp =
          box.total_harga ?? (box.harga_panel || 0) + (box.harga_wiring || 0);
        const hargaSetelahDiscRp = box.total_harga ?? hargaAwalRp;
        const rowTotal = hargaSetelahDiscRp * qty;
        totalHarga += rowTotal;

        items.push({
          no: no++,
          // Source grouping (for BoQ UI divider)
          sld_id: sld.id,
          sld_name: sld.draft_name,
          category: null,
          qty,
          satuan: "Unit",
          nama_panel: box.nama_panel || "Panel",
          tipe_ukuran: box.ukuran_panel || "-",
          harga_awal_rp: hargaAwalRp,
          disc: "0",
          harga_setelah_disc_rp: hargaSetelahDiscRp,
          row_total: rowTotal,
        });
      }
    }
    const response = {
      project: {
        id: project.id,
        project_name: project.project_name,
        client: project.client,
      },
      items,
      total_harga: totalHarga,
    };
    console.log("buatPenawaran response:", response);
    res.status(200).json(response);
  } catch (error) {
    console.error("Error buatPenawaran:", error);
    res
      .status(500)
      .json({ message: "Failed to build penawaran", error: error.message });
  }
};

export const getAPIUsage = async (req, res) => {
  try {
    const userId = req.alldata.userId;
    // Find or create individual usage record
    let [individualUsage, created] = await APIUsageIndividual.findOrCreate({
      where: { id_user: userId },
      defaults: {
        id_user: userId,
        api_usage_SLD: 0,
        api_usage_Prices: 0,
        api_usage_Box: 0,
        id_api_group: null,
      },
      include: [{ model: APIUsageGroup }],
    });

    // If it was just created, we need to re-fetch to get the include correctly if needed
    if (created) {
      individualUsage = await APIUsageIndividual.findOne({
        where: { id_user: userId },
        include: [{ model: APIUsageGroup }],
      });
    }

    if (!individualUsage || !individualUsage.api_usage_group) {
      return res.status(200).json({
        hasGroup: false,
        message: "You don't belong to any group yet",
      });
    }

    const group = individualUsage.api_usage_group;
    res.status(200).json({
      hasGroup: true,
      groupName: group.group_name,
      usage: {
        SLD: group.api_usage_total_SLD,
        Prices: group.api_usage_total_Prices,
        Box: group.api_usage_total_Box,
      },
      limit: {
        SLD: group.api_limit_SLD,
        Prices: group.api_limit_Prices,
        Box: group.api_limit_Box,
      },
    });
  } catch (error) {
    console.error("Error getAPIUsage:", error);
    res
      .status(500)
      .json({ message: "Failed to get API usage", error: error.message });
  }
};

export const incrementAPIUsage = async (req, res) => {
  try {
    // Prefer userId from token (req.alldata.userId), fallback to params for compatibility
    const userId = (req.alldata && req.alldata.userId) || req.params.userId;
    const { type } = req.body; // type: 'SLD' | 'Prices' | 'Box'

    if (!userId) {
      return res.status(401).json({ message: "User ID not identified" });
    }

    if (!["SLD", "Prices", "Box"].includes(type)) {
      return res.status(400).json({ message: "Invalid usage type" });
    }

    console.log(`[API Usage] Incrementing ${type} for userId:`, userId);

    // 1. Find the individual usage record with its group
    const individualUsage = await APIUsageIndividual.findOne({
      where: { id_user: userId },
      include: [{ model: APIUsageGroup }],
    });

    if (!individualUsage) {
      return res
        .status(404)
        .json({ message: "API Usage record not found for this user" });
    }

    const group = individualUsage.api_usage_group;
    if (!group) {
      return res
        .status(403)
        .json({ message: "You don't belong to any API group yet" });
    }

    const usageField = `api_usage_total_${type}`;
    const limitField = `api_limit_${type}`;
    const individualField = `api_usage_${type}`;

    // 🔥 PRIORITIZED LIMIT CHECK
    if (group[usageField] >= group[limitField]) {
      console.warn(
        `[API Usage] ${type} Limit reached for group: ${group.group_name} (${group[usageField]}/${group[limitField]})`,
      );
      return res.status(403).json({
        message: `API ${type} usage limit reached for your group. Processing aborted.`,
        usage: group[usageField],
        limit: group[limitField],
      });
    }

    const groupId = group.id;

    // 2. Perform increments
    await DB.transaction(async (t) => {
      // Increment Individual
      await individualUsage.increment(individualField, {
        by: 1,
        transaction: t,
      });

      // Increment Group if exists
      if (groupId) {
        await APIUsageGroup.increment(usageField, {
          by: 1,
          where: { id: groupId },
          transaction: t,
        });
      }
    });

    return res.status(200).json({ message: "Usage incremented successfully" });
  } catch (error) {
    console.error("Error incrementing API usage:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// >>> GET ALL ACCESSORIES TYPES
export const getAccessoriesTypes = async (req, res) => {
  try {
    const accessories = await Accessories.findAll({
      attributes: ["id", "accessories_type", "accessories_name"],
      raw: true,
    });

    if (!accessories || accessories.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(accessories);
  } catch (error) {
    console.error("Error fetching accessories types:", error);
    res.status(500).json({
      message: "Failed to fetch accessories types",
      error: error.message,
    });
  }
};

// >>> GET PRICELIST ITEMS BY ACCESSORIES TYPE
export const getPricelistByAccessories = async (req, res) => {
  try {
    const { accessoriesType } = req.params;

    if (!accessoriesType) {
      return res.status(400).json({ message: "Accessories type is required" });
    }

    console.log(
      "[getPricelistByAccessories] Looking for accessories type:",
      accessoriesType,
    );

    const items = await Pricelist.findAll({
      where: {
        additional_accessories: {
          [Op.iLike]: `%${accessoriesType}%`, // Case-insensitive partial match
        },
      },
      attributes: [
        "id",
        "qty",
        "unit",
        "deskripsi",
        "tipe",
        "merk",
        "harga_before_disc",
        "disc",
        "harga",
        "disc_",
        "created_by",
        "updated_by",
      ],
      raw: true,
    });

    console.log("[getPricelistByAccessories] Found", items.length, "items");

    if (!items || items.length === 0) {
      console.warn(
        "[getPricelistByAccessories] No items found for:",
        accessoriesType,
      );
      return res.status(200).json([]);
    }

    res.status(200).json(items);
  } catch (error) {
    console.error("Error fetching pricelist by accessories:", error);
    res.status(500).json({
      message: "Failed to fetch pricelist items",
      error: error.message,
    });
  }
};

// >>> CREATE NEW ACCESSORIES TYPE
export const createAccessories = async (req, res) => {
  try {
    const { accessories_type, accessories_name } = req.body;

    if (!accessories_type) {
      return res.status(400).json({ message: "Accessories type is required" });
    }

    const accessory = await Accessories.create({
      accessories_type,
      accessories_name: accessories_name || null,
    });

    res.status(201).json({
      message: "Accessories type created successfully",
      data: accessory,
    });
  } catch (error) {
    console.error("Error creating accessories:", error);
    res.status(500).json({
      message: "Failed to create accessories type",
      error: error.message,
    });
  }
};

// >>> UPDATE ACCESSORIES TYPE
export const updateAccessories = async (req, res) => {
  try {
    const { id } = req.params;
    const { accessories_type, accessories_name } = req.body;

    const accessory = await Accessories.findByPk(id);
    if (!accessory) {
      return res.status(404).json({ message: "Accessories type not found" });
    }

    await accessory.update({
      accessories_type: accessories_type || accessory.accessories_type,
      accessories_name:
        accessories_name !== undefined
          ? accessories_name
          : accessory.accessories_name,
    });

    res.status(200).json({
      message: "Accessories type updated successfully",
      data: accessory,
    });
  } catch (error) {
    console.error("Error updating accessories:", error);
    res.status(500).json({
      message: "Failed to update accessories type",
      error: error.message,
    });
  }
};

// >>> DELETE ACCESSORIES TYPE
export const deleteAccessories = async (req, res) => {
  try {
    const { id } = req.params;

    const accessory = await Accessories.findByPk(id);
    if (!accessory) {
      return res.status(404).json({ message: "Accessories type not found" });
    }

    await accessory.destroy();

    res.status(200).json({ message: "Accessories type deleted successfully" });
  } catch (error) {
    console.error("Error deleting accessories:", error);
    res.status(500).json({
      message: "Failed to delete accessories type",
      error: error.message,
    });
  }
};

// >>> GET PRICELIST ITEMS BY SEARCH QUERY (Server-side with limit)
export const searchPricelist = async (req, res) => {
  try {
    const search = req.query.search || "";
    const limit = 10; // Maximum 10 items per request

    const where = search
      ? {
          [Op.or]: [
            { deskripsi: { [Op.iLike]: `%${search}%` } },
            { tipe: { [Op.iLike]: `%${search}%` } },
            { merk: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    console.log("[searchPricelist] Query:", search, "Limit:", limit);

    const items = await Pricelist.findAll({
      where,
      limit,
      attributes: [
        "id",
        "qty",
        "unit",
        "deskripsi",
        "tipe",
        "merk",
        "harga_before_disc",
        "disc",
        "harga",
        "disc_",
        "created_by",
        "updated_by",
      ],
      raw: true,
      order: [["deskripsi", "ASC"]], // Sort by description
    });

    console.log("[searchPricelist] Found", items.length, "items");

    res.status(200).json({
      count: items.length,
      limit: limit,
      items: items,
    });
  } catch (error) {
    console.error("Error searching pricelist:", error);
    res
      .status(500)
      .json({ message: "Failed to search pricelist", error: error.message });
  }
};
