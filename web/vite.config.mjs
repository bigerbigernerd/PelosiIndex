import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {fileURLToPath} from 'node:url';
import {prepareDataRevision} from './scripts/data-revision.mjs';
const revision = prepareDataRevision(fileURLToPath(new URL('.', import.meta.url)));

export default defineConfig({
  define: {__PELOSI_DATA_REVISION__: JSON.stringify(revision)},
  build: { outDir: "dist", assetsInlineLimit: 0, chunkSizeWarningLimit: 300 },
  server: { headers: { "Cache-Control": "no-store" } },
  plugins: [react()],
});
