/**
 * Migrate local MongoDB → MongoDB Atlas
 * Usage: node scripts/migrate-to-atlas.mjs <ATLAS_CONNECTION_STRING>
 * Example:
 *   node scripts/migrate-to-atlas.mjs "mongodb+srv://user:pass@cluster.mongodb.net/cawl?retryWrites=true&w=majority"
 */

import { MongoClient } from "mongodb";

const LOCAL_URI = "mongodb://localhost:27017/?directConnection=true";
const DB_NAME   = "cawl";

const atlasUri = process.argv[2];
if (!atlasUri) {
  console.error("Thiếu Atlas connection string!");
  console.error('Usage: node scripts/migrate-to-atlas.mjs "mongodb+srv://..."');
  process.exit(1);
}

const SKIP_COLLECTIONS = ["RefreshToken"]; // không cần migrate session tokens

async function migrate() {
  console.log("Kết nối local MongoDB...");
  const local = new MongoClient(LOCAL_URI);
  await local.connect();

  console.log("Kết nối MongoDB Atlas...");
  const atlas = new MongoClient(atlasUri);
  await atlas.connect();

  const localDb = local.db(DB_NAME);
  const atlasDb = atlas.db(DB_NAME);

  const collections = await localDb.listCollections().toArray();
  console.log(`\nTìm thấy ${collections.length} collections.\n`);

  for (const colInfo of collections) {
    const name = colInfo.name;

    if (SKIP_COLLECTIONS.includes(name)) {
      console.log(`  [SKIP] ${name}`);
      continue;
    }

    const docs = await localDb.collection(name).find({}).toArray();
    if (docs.length === 0) {
      console.log(`  [EMPTY] ${name}`);
      continue;
    }

    // Xóa collection cũ trên Atlas trước khi insert
    await atlasDb.collection(name).deleteMany({});

    const result = await atlasDb.collection(name).insertMany(docs, { ordered: false });
    console.log(`  [OK] ${name}: ${result.insertedCount}/${docs.length} docs`);
  }

  await local.close();
  await atlas.close();

  console.log("\nMigrate hoàn tất!");
}

migrate().catch((err) => {
  console.error("Lỗi:", err.message);
  process.exit(1);
});
