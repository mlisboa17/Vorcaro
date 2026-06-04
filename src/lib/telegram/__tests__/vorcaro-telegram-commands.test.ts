import { describe, expect, it } from "vitest";
import {
  isVorcaroFreeTextQuestion,
  parseVorcaroTelegramCommand,
  resolveVorcaroTelegramQuestion,
  shouldRouteToVorcaroChat,
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

  it("normaliza pergunta livre", () => {
    expect(resolveVorcaroTelegramQuestion("Vorcaro, estou bem?")).toBe("estou bem?");
  });
});
