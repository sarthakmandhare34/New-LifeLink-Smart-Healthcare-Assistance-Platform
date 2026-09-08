import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("local development server", () => {
  const wrapper = readFileSync(resolve(process.cwd(), "scripts/dev.mjs"), "utf8");

  it("spawns the development process with port configuration", () => {
    expect(wrapper).toContain("PORT = Number(process.env.PORT || 3000)");
    expect(wrapper).toContain("LifeLink dev server running at");
  });

  it("keeps the existing LifeLink server command intact", () => {
    expect(wrapper).toContain("cross-env NODE_ENV=development tsx watch backend/_core/index.ts");
  });
});
