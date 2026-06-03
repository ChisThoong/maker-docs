import { MongoMemoryServer } from "mongodb-memory-server";
import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "..", ".mongo-data");
mkdirSync(dbPath, { recursive: true });

// Clear stale lock left behind by a crashed/killed previous instance
try {
  rmSync(join(dbPath, "mongod.lock"), { force: true });
} catch {}

const PORT = Number(process.env.MONGO_DEV_PORT || 27017);

const server = await MongoMemoryServer.create({
  instance: { port: PORT, dbPath, storageEngine: "wiredTiger" },
});

console.log(`\n  ✔ MongoDB (embedded) đang chạy tại ${server.getUri()}`);
console.log(`  ✔ Dữ liệu lưu tại ${dbPath}`);
console.log(`  ℹ Dữ liệu mẫu sẽ tự seed khi app gọi /api/docs lần đầu (nếu DB rỗng)\n`);

async function shutdown() {
  await server.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
