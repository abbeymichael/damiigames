import { defineConfig } from "vite";
import vinext from "vinext";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vinext()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  // The dev server should NOT attempt to transform or inline Node-native or CJS-only
  // packages into Vite's ESM evaluation/runtime. Those packages (database drivers,
  // native bindings, or other Node-only modules) often declare Node-specific globals
  // such as `module`, `exports`, or use native bindings that break when Vite inlines
  // them into an ESM AsyncFunction for SSR. Marking them as external for SSR and
  // excluding them from dependency optimization ensures they are required at runtime
  // from Node (server-side) instead of being bundled/evaluated by Vite.
  // Add additional packages here if Vite reports similar "Identifier 'module' has
  // already been declared" or other evaluation/runtime errors for server-only libs.
  ssr: {
    external: [
      "mysql2",
      "mysql2/promise",
      "mysql2/*",
      "drizzle-orm",
      "drizzle-orm/mysql2",
      "drizzle-orm/*",
      "drizzle-kit",
      // Common DB drivers and native modules to keep external
      "mysql",
      "pg",
      "pg-native",
      "better-sqlite3",
      "sqlite3",
      "oracledb",
      "mssql",
      // Native crypto/binding libs
      "bcrypt",
      "node-sass",
      "grpc",
      "grpc-js",
      // Others that are server-only or have native bindings
      "sharp",
      "scrypt",
    ],
  },
  optimizeDeps: {
    // Prevent Vite dependency pre-bundling for these server-only packages
    exclude: [
      "mysql2",
      "mysql2/promise",
      "mysql2/*",
      "drizzle-orm",
      "drizzle-orm/mysql2",
      "drizzle-orm/*",
      "drizzle-kit",
      "mysql",
      "pg",
      "pg-native",
      "better-sqlite3",
      "sqlite3",
      "oracledb",
      "mssql",
      "bcrypt",
      "node-sass",
      "grpc",
      "grpc-js",
      "sharp",
      "scrypt",
    ],
  },
});
