import { describe, expect, it } from "vitest";
import {
  isVorcaroAssistantCommand,
  isVorcaroFreeTextQuestion,
  parseVorcaroTelegramCommand,
  resolveVorcaroTelegramQuestion,
  shouldRouteToVorcaroChat,
  VORCARO_ASSISTANT_INTRO,
} from "@/lib/telegram/vorcaro-telegram-commands";

describe("vorcaro-telegram-commands", () => {
  it("mapeia /status para pergunta de saúde", () => {
    expect(parseVorcaroTelegramCommand("/status")).toContain("financeiramente");
  });

  it("detecta pergunta livre com prefixo Vorcaro", () => {
    expect(isVorcaroFreeTextQuestion("Vorcaro, onde estou desperdiçando dinheiro?")).toBe(true);
  });

  it("roteia comandos e perguntas livres", () => {
    expect(shouldRouteToVorcaroChat("/alertas")).toBe(true);
    expect(shouldRouteToVorcaroChat("Vorcaro, o que devo resolver hoje?")).toBe(true);
    expect(shouldRouteToVorcaroChat("comprovante uber 32,50")).toBe(false);
  });

  it("roteia confirmação/rejeição de ação (Sprint 13)", () => {
    expect(shouldRouteToVorcaroChat("sim")).toBe(true);
    expect(shouldRouteToVorcaroChat("não")).toBe(true);
    expect(shouldRouteToVorcaroChat("confirmar")).toBe(true);
    expect(resolveVorcaroTelegramQuestion("sim")).toBe("sim");
  });

  it("normaliza pergunta livre", () => {
    expect(resolveVorcaroTelegramQuestion("Vorcaro, estou bem?")).toBe("estou bem?");
  });

  it("/vorcaro é comando de assistente, não ALERTS (M-04)", () => {
    expect(isVorcaroAssistantCommand("/vorcaro")).toBe(true);
    expect(parseVorcaroTelegramCommand("/vorcaro")).toBeNull();
    expect(VORCARO_ASSISTANT_INTRO).toContain("Sou Vorcaro");
    expect(shouldRouteToVorcaroChat("/vorcaro")).toBe(false);
  });
});
