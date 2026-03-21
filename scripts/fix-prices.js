/**
 * Fix product prices — remove campaignPrice: 0 so normal price shows
 * Run: node scripts/fix-prices.js
 */
const PocketBase = require("pocketbase/cjs");

const pb = new PocketBase("https://elo-kiosk-pb.fly.dev");

async function fixPrices() {
  await pb.collection("users").authWithPassword("zivar68@gmail.com", "Zivar12345");
  console.log("Authenticated\n");

  const products = await pb.collection("pb_products").getFullList();

  let fixed = 0;
  for (const p of products) {
    // If campaignPrice is 0 (not null), clear it so normal price shows
    if (p.campaignPrice === 0) {
      await pb.collection("pb_products").update(p.id, { campaignPrice: null });
      console.log(`✅ ${p.name}: campaignPrice 0 → null (normal price: ${p.price} kr)`);
      fixed++;
    } else {
      console.log(`   ${p.name}: ${p.campaignPrice ?? p.price} kr (ok)`);
    }
  }

  console.log(`\nDone! Fixed ${fixed} products.`);
}

fixPrices().catch(console.error);
