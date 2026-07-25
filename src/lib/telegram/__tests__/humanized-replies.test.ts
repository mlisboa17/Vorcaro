import { describe, expect, it } from "vitest";
import { pickHumanReply, type HumanReplyEvent } from "@/lib/telegram/humanized-replies";

const EVENTS: HumanReplyEvent[] = [
  "saved",
  "savedReview",
  "discarded",
  "valueEdited",
  "localEdited",
  "categoryEdited",
  "editCancelled",
  "notUnderstood",
];

describe("pickHumanReply (16.4)", () => {
  it("retorna uma string não-vazia para todos os eventos", () => {
    for (const event of EVENTS) {
      const reply = pickHumanReply(event);
      expect(typeof reply).toBe("string");
      expect(reply.length).toBeGreaterThan(0);
    }
  });

  it("varia as frases (não é sempre a mesma) ao longo de várias chamadas", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 40; i += 1) seen.add(pickHumanReply("saved"));
    // "saved" tem 4 variações — em 40 sorteios deve aparecer mais de uma.
    expect(seen.size).toBeGreaterThan(1);
  });

  it("sempre devolve uma variação pertencente ao evento", () => {
    const reply = pickHumanReply("discarded");
    expect(reply.length).toBeGreaterThan(3);
  });
});
