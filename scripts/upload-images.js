/**
 * Upload product images to PocketBase
 * Run: node scripts/upload-images.js
 */

const PocketBase = require("pocketbase/cjs");
const fs = require("fs");
const path = require("path");

const PB_URL = "https://elo-kiosk-pb.fly.dev";
const ADMIN_EMAIL = "zivar68@gmail.com";
const ADMIN_PASSWORD = "Zivar12345";
const IMAGES_DIR = path.join(__dirname, "../assets/images");

async function uploadImages() {
  const pb = new PocketBase(PB_URL);

  // Authenticate as admin
  console.log("Authenticating...");
  await pb.collection("users").authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
  console.log("Authenticated!\n");

  // Get all products
  const products = await pb.collection("pb_products").getFullList();
  console.log(`Found ${products.length} products\n`);

  // Get available images
  const imageFiles = fs
    .readdirSync(IMAGES_DIR)
    .filter(
      (f) =>
        (f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".webp")) &&
        f !== "background.png" &&
        f !== "backgrund.png"
    );
  console.log(`Found ${imageFiles.length} image files\n`);

  let uploaded = 0;
  let skipped = 0;

  for (const product of products) {
    // Normalize product name for matching
    const normalized = product.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[åä]/g, "a")
      .replace(/ö/g, "o");

    // Extra aliases for tricky matches
    const aliases = {
      "red-bull": "redbull",
      "corny-big": "cornybigg",
      "arla-proteinpudding": "arla-pudding",
    };
    const aliased = aliases[normalized] || normalized;

    // Try to find matching image file
    const match = imageFiles.find((f) => {
      const fname = f
        .toLowerCase()
        .replace(/\.(png|jpg|webp)$/, "")
        .replace(/[åä]/g, "a")
        .replace(/ö/g, "o");
      return (
        fname === normalized ||
        fname === aliased ||
        normalized.includes(fname) ||
        fname.includes(normalized) ||
        aliased.includes(fname) ||
        fname.includes(aliased)
      );
    });

    if (match) {
      const filePath = path.join(IMAGES_DIR, match);
      const formData = new FormData();
      const fileBuffer = fs.readFileSync(filePath);
      const blob = new Blob([fileBuffer], { type: "image/png" });
      formData.append("image", blob, match);

      try {
        await pb.collection("pb_products").update(product.id, formData);
        console.log(`✅ ${product.name} → ${match}`);
        uploaded++;
      } catch (err) {
        console.log(
          `❌ ${product.name} — upload failed: ${err.message || err}`
        );
      }
    } else {
      console.log(`⚠️  No image found for: ${product.name} (${normalized})`);
      skipped++;
    }
  }

  console.log(`\nDone! Uploaded: ${uploaded}, Skipped: ${skipped}`);
}

uploadImages().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
