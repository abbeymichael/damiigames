import { defineConfig } from "vite";
import vinext from "vinext";

/**
 * DAMII build configuration — plain Node.js target.
 *
 * The project intentionally has NO Cloudflare Workers / D1 dependency: it is
 * built as a standard Node server bundle (`dist/server/index.js`) plus static
 * client assets (`dist/client`) so it can be hosted on any Node-capable host
 * (VPS, shared hosting with Node/Passenger, Docker, etc.) against MySQL.
 */
export default defineConfig({
  plugins: [
    {
      name: "fix-node-module-external",
      enforce: "pre",
      resolveId(id) {
        if (id === "node:module" || id === "module") {
          return { id: "node:module", external: true };
        }
      },
    },
    {
      name: "damii-rsc-node-compat",
      enforce: "pre",
      configResolved(config) {
        for (const [name, env] of Object.entries(config.environments || {})) {
          if (name === "rsc") {
            env.resolve = env.resolve || {};
            env.resolve.conditions = env.resolve.conditions || [];
            if (!env.resolve.conditions.includes("react-server")) {
              env.resolve.conditions.unshift("react-server");
            }
          }
          if (env.optimizeDeps) {
            env.optimizeDeps.exclude = [];
            const externals = [
              /^node:/,
              "node:module",
              "node:fs/promises",
              "node:readline/promises",
              "node:perf_hooks",
              "node:async_hooks",
              "node:tty",
            ];
            env.optimizeDeps.rolldownOptions = {
              ...(env.optimizeDeps.rolldownOptions || {}),
              external: externals,
            };
            env.optimizeDeps.esbuildOptions = {
              ...(env.optimizeDeps.esbuildOptions || {}),
              external: [
                "node:*",
                "node:module",
                "node:fs/promises",
                "node:readline/promises",
                "node:perf_hooks",
                "node:async_hooks",
                "node:tty",
              ],
            };
          }
          if (env.build?.rollupOptions?.input && typeof env.build.rollupOptions.input === "string") {
            env.build.rollupOptions.input = { index: env.build.rollupOptions.input };
          }
        }
        if (config.build?.rollupOptions?.input && typeof config.build.rollupOptions.input === "string") {
          config.build.rollupOptions.input = { index: config.build.rollupOptions.input };
        }
      },
      configureServer(server) {
        for (const [, env] of Object.entries(server.environments || {})) {
          if (!env.runner) {
            /* eslint-disable @typescript-eslint/no-explicit-any */
            let runner: any = null;
            env.runner = {
              import: async (id: string) => {
                if (!runner) {
                  try {
                    const { ESModulesEvaluator, ModuleRunner, createNodeImportMeta } = await import(
                      "vite/module-runner"
                    );
                    runner = new ModuleRunner(
                      {
                        transport: {
                          invoke: async (payload: any) => {
                            const { name: reqName, data: args } = payload.data;
                            if (reqName === "fetchModule") {
                              const [modId, importer, options] = args;
                              return { result: await env.fetchModule(modId, importer, options) };
                            }
                            if (reqName === "getBuiltins") return { result: [] };
                            return {
                              error: {
                                name: "Error",
                                message: `Unexpected ModuleRunner invoke: ${reqName}`,
                              },
                            };
                          },
                        },
                        createImportMeta: createNodeImportMeta,
                        sourcemapInterceptor: false,
                        hmr: false,
                      },
                      new ESModulesEvaluator(),
                    );
                  } catch {
                    runner = {
                      import: (modId: string) => server.ssrLoadModule(modId),
                    };
                  }
                }
                return runner.import(id);
              },
            };
            /* eslint-enable @typescript-eslint/no-explicit-any */
          }
        }
      },
    },
    vinext(),
  ],
  // mysql2 / drizzle are server-only; keep them out of the client graph.
  ssr: {
    external: ["mysql2", "mysql2/promise", "drizzle-orm"],
  },
});
