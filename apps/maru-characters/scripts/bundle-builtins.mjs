// Stages built-in model + llama runtime into src-tauri/resources so that
// `tauri build` bakes them into the installer via tauri.conf.json resources.
// Run: pnpm bundle:builtins (inside apps/maru-characters)
// Sources: D:/models + winget llama.cpp install. Never commit the staged
// 2.4GB files, they are gitignored and copied locally at build time.
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appDir = join(here, "..");
const resModels = join(appDir, "src-tauri", "resources", "models");
const resBin = join(appDir, "src-tauri", "resources", "bin");

const MODEL_FILE = "mlabonne_Qwen3-4B-abliterated-Q4_K_M.gguf";
const MODEL_SRC = "D:/models/mlabonne_Qwen3-4B-abliterated-Q4_K_M.gguf";
const RUNTIME_SRC =
  "C:/Users/jmdem/AppData/Local/Microsoft/WinGet/Packages/ggml.llamacpp_Microsoft.Winget.Source_8wekyb3d8bbwe";

function gb(path) {
  return (statSync(path).size / 1024 ** 3).toFixed(2) + "GB";
}

mkdirSync(resModels, { recursive: true });
mkdirSync(resBin, { recursive: true });

if (!existsSync(MODEL_SRC)) {
  console.error(`Missing model source: ${MODEL_SRC}`);
  console.error("Re-download it with huggingface_hub first, then rerun.");
  process.exit(1);
}
const modelDst = join(resModels, MODEL_FILE);
if (existsSync(modelDst) && statSync(modelDst).size === statSync(MODEL_SRC).size) {
  console.log(`Model already staged (${gb(modelDst)}), skipping copy.`);
} else {
  console.log(`Copying model ${gb(MODEL_SRC)} ... (takes a bit on potato PC)`);
  copyFileSync(MODEL_SRC, modelDst);
  console.log(`Staged model: ${modelDst}`);
}

if (!existsSync(RUNTIME_SRC)) {
  console.error(`Missing llama runtime: ${RUNTIME_SRC}`);
  console.error("Install it with: winget install llama.cpp");
  process.exit(1);
}
let copied = 0;
for (const name of readdirSync(RUNTIME_SRC)) {
  if (!/\.(exe|dll)$/i.test(name)) continue;
  if (name.startsWith("llama-") && !name.startsWith("llama-server")) continue;
  if (name.startsWith("llama-bench") || name.startsWith("llama-cli") || name.startsWith("llama-quantize")) continue;
  const src = join(RUNTIME_SRC, name);
  if (!statSync(src).isFile()) continue;
  const dst = join(resBin, name);
  if (existsSync(dst) && statSync(dst).size === statSync(src).size) continue;
  copyFileSync(src, dst);
  copied++;
}
console.log(`Staged ${copied} new runtime files into ${resBin}`);
console.log("Done. Now run: pnpm tauri build");
