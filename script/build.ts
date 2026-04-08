import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, cp, mkdir } from "fs/promises";
import { execSync } from "child_process";
import path from "path";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("copying uploads directory for Vercel deployment...");
  try {
    // Copy from static-uploads (which has the actual avatar files)
    await mkdir("dist/uploads", { recursive: true });
    await cp("static-uploads", "dist/uploads", { recursive: true });
    console.log("✅ Uploads directory copied to dist/uploads");
  } catch (error) {
    console.log("⚠️  Uploads directory not found, skipping copy");
  }

  console.log("running database migrations...");
  try {
    // Always run migrations to keep production database in sync with schema
    // Set RUN_DB_PUSH=false to disable if needed
    const shouldRunDbPush =
      process.env.RUN_DB_PUSH !== "false" &&
      process.env.RUN_DB_PUSH !== "0";

    if (shouldRunDbPush) {
      console.log("Running database migrations...");
      execSync("npm run db:push", { stdio: "inherit" });
      console.log("✅ Database migrations completed");
    } else {
      console.log("Skipping db:push (RUN_DB_PUSH=false)");
    }
  } catch (error) {
    console.log("Migration skipped - DATABASE_URL not configured");
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
