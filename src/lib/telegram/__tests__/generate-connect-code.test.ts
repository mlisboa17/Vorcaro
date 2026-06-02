import { describe, expect, it } from "vitest";
import { generateConnectCode } from "../generate-connect-code";

describe("generateConnectCode", () => {
  it("gera código de 6 caracteres alfanuméricos", () => {
    const code = generateConnectCode();
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
  });
});
