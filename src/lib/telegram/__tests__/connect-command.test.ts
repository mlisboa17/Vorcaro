import { describe, expect, it } from "vitest";
import { isConnectCommand, parseConnectCommand } from "../connect-command";

describe("parseConnectCommand", () => {
  it("extrai código de 6 caracteres", () => {
    expect(parseConnectCommand("/connect ABC123")).toBe("ABC123");
    expect(parseConnectCommand("/connect abc123")).toBe("ABC123");
  });

  it("aceita sufixo do bot", () => {
    expect(parseConnectCommand("/connect@VorcaroBot XYZ789")).toBe("XYZ789");
  });

  it("rejeita formatos inválidos", () => {
    expect(parseConnectCommand("/connect")).toBeNull();
    expect(parseConnectCommand("/connect AB")).toBeNull();
    expect(parseConnectCommand("connect ABC123")).toBeNull();
  });
});

describe("isConnectCommand", () => {
  it("identifica comando connect", () => {
    expect(isConnectCommand("/connect ABC123")).toBe(true);
    expect(isConnectCommand("/start")).toBe(false);
  });
});
