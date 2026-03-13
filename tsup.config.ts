import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    register: "src/register.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node18",
});
