/**
 * CallbackController
 * Handles asynchronous responses from external services like n8n.
 */

// Helper function to parse Indonesian number format
const parseIndonesianPrice = (priceValue) => {
  if (!priceValue) return 0;
  
  let numStr = String(priceValue).trim();
  
  // Remove Rp prefix and whitespace
  numStr = numStr.replace(/Rp/i, '').trim();
  
  // Handle Indonesian format: dots are thousands separators, comma is decimal
  if (numStr.includes(',')) {
    // Has decimal: remove thousand dots, replace decimal comma with dot
    numStr = numStr.replace(/\./g, '').replace(',', '.');
  } else {
    // No decimal: just remove thousand dots
    numStr = numStr.replace(/\./g, '');
  }
  
  return parseFloat(numStr) || 0;
};

export const priceFinderCallback = (req, res) => {
  console.log(
    "[Callback] Received request body:",
    JSON.stringify(req.body, null, 2),
  );

  const { draft_id, draftId, items, results } = req.body;
  const finalDraftId = draft_id || draftId;

  if (!finalDraftId) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing draftId or draft_id" });
  }

  // Determine the data source (support both 'items' and 'results' from n8n)
  let finalItems = items || results || [];

  // If data comes in n8n's [{json: {...}}] format, unwrap it
  if (Array.isArray(finalItems)) {
    finalItems = finalItems.map((item) => (item.json ? item.json : item));
  }

  // Map n8n field names to database schema and clean price data
  finalItems = finalItems.map((item) => {
    // Clean price using Indonesian format parser
    const rawPrice = item.matched_harga || item.price || "";
    const cleanPrice = parseIndonesianPrice(rawPrice);
    
    return {
      ...item,
      // Map matched fields from n8n to database columns with cleaned price
      price: cleanPrice,
      matched_harga: cleanPrice,  // Also keep for reference
      // Optional: map other matched fields if needed
      description: item.matched_deskripsi || item.description || "",
      type: item.matched_tipe || item.type || "",
      brand_merk: item.matched_merk || item.brand_merk || "",
    };
  });

  console.log(
    `[Callback] Emitting 'price_finder_done' for draft_${finalDraftId} with ${finalItems.length} items`,
  );
  console.log(
    "[Callback] Mapped items:",
    JSON.stringify(finalItems.slice(0, 2), null, 2),
  );

  // Get io instance from app
  const io = req.app.get("io");

  // Emit event to the specific room
  io.to(`draft_${finalDraftId}`).emit("price_finder_done", {
    success: true,
    items: finalItems,
  });

  res.json({
    status: "success",
    message: "Callback received and signal emitted",
    draftId: finalDraftId,
  });
};

/**
 * priceFinderErrorCallback
 * Handles error signals from n8n to notify the frontend.
 */
export const priceFinderErrorCallback = (req, res) => {
  console.log(
    "[Callback ERROR] Received error from n8n:",
    JSON.stringify(req.body, null, 2),
  );

  const { draft_id, draftId, message, error } = req.body;
  const finalDraftId = draft_id || draftId;
  const errorMessage = message || error || "An unknown error occurred in n8n";

  if (!finalDraftId) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing draftId or draft_id" });
  }

  console.log(
    `[Callback ERROR] Emitting 'price_finder_error' for draft_${finalDraftId}: ${errorMessage}`,
  );

  // Get io instance from app
  const io = req.app.get("io");

  // Emit error event to the specific room
  io.to(`draft_${finalDraftId}`).emit("price_finder_error", {
    success: false,
    message: errorMessage,
  });

  res.json({
    status: "success",
    message: "Error callback received and signal emitted",
    draftId: finalDraftId,
  });
};
