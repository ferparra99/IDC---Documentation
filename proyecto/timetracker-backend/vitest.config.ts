import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false, // se importa describe/it/expect explícitamente (más portable si algún día se migra a Jest)
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/interfaces/http/server.ts", // punto de entrada, no tiene lógica propia
        "src/infrastructure/db/migrate.ts",
        "src/infrastructure/db/seed.ts",
        "src/infrastructure/db/syncFestivos.ts",
      ],
    },
  },
});
