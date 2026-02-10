import "dotenv/config";
import express from "express";
import cors from "cors";
import { execSync } from "child_process";
import { unlinkSync, existsSync } from "fs";
import { join } from "path";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import groupRoutes from "./routes/groups";
import adminRoutes from "./routes/admin";
import { seed } from "./seed";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/admin", adminRoutes);

async function start() {
  // Fresh database on every start
  const dbPath = join(__dirname, "../prisma/dev.db");
  if (existsSync(dbPath)) {
    unlinkSync(dbPath);
  }
  execSync("npx prisma migrate deploy", {
    cwd: join(__dirname, ".."),
    stdio: "inherit",
  });

  await seed();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
