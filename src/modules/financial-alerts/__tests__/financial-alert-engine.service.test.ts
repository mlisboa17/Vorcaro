import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { FinancialAlertEngineService } from "../application/services/financial-alert-engine.service";
import type { AlertRuleCandidate } from "../domain/types/financial-alert";

const evaluateMock = vi.fn<() => Promise<AlertRuleCandidate[]>>();

vi.mock("../domain/services/financial-alert-rules.evaluator", () => ({
  FinancialAlertRulesEvaluator: class {
    evaluate = evaluateMock;
  },
}));

type Stored = {
  id: string;
  userId: string;
  fingerprint: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  metadata: unknown;
  actionUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
};

function makePrismaStore(): { prisma: PrismaClient; store: Map<string, Stored> } {
  const store = new Map<string, Stored>();
  let seq = 0;

  const prisma = {
    financialAlert: {
      findUnique: vi.fn(async ({ where }: { where: { userId_fingerprint: { userId: string; fingerprint: string } } }) => {
        const key = `${where.userId_fingerprint.userId}:${where.userId_fingerprint.fingerprint}`;
        return store.get(key) ?? null;
      }),
      findFirst: vi.fn(async ({ where }: { where: { id: string; userId: string } }) => {
        for (const row of store.values()) {
          if (row.id === where.id && row.userId === where.userId) return row;
        }
        return null;
      }),
      create: vi.fn(async ({ data }: { data: Omit<Stored, "id" | "createdAt" | "updatedAt" | "resolvedAt"> }) => {
        const id = `a${++seq}`;
        const row: Stored = {
          id,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          resolvedAt: null,
        };
        store.set(`${data.userId}:${data.fingerprint}`, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Stored> }) => {
        for (const [k, row] of store) {
          if (row.id === where.id) {
            const next = { ...row, ...data, updatedAt: new Date() };
            store.set(k, next);
            return next;
          }
        }
        throw new Error("not found");
      }),
      findMany: vi.fn(async ({ where }: { where: { userId: string; status?: string; type?: { in: string[] } } }) => {
        return [...store.values()].filter(
          (r) =>
            r.userId === where.userId &&
            (!where.status || r.status === where.status) &&
            (!where.type || where.type.in.includes(r.type)),
        );
      }),
      count: vi.fn(),
    },
    user: { findMany: vi.fn().mockResolvedValue([{ id: "u1" }]) },
  } as unknown as PrismaClient;

  return { prisma, store };
}

describe("FinancialAlertEngineService", () => {
  beforeEach(() => {
    evaluateMock.mockReset();
  });

  it("não cria alertas OPEN duplicados em execuções repetidas", async () => {
    evaluateMock.mockResolvedValue([
      {
        fingerprint: "CASHFLOW_WARNING:next-15d",
        type: "CASHFLOW_WARNING",
        severity: "CRITICAL",
        title: "Fluxo",
        description: "Negativo",
        active: true,
      },
    ]);

    const { prisma, store } = makePrismaStore();
    const engine = new FinancialAlertEngineService(prisma);

    await engine.runForUser("u1");
    await engine.runForUser("u1");
    await engine.runForUser("u1");

    const open = [...store.values()].filter((r) => r.status === "OPEN");
    expect(open).toHaveLength(1);
  });

  it("resolve automaticamente quando condição deixa de existir", async () => {
    evaluateMock
      .mockResolvedValueOnce([
        {
          fingerprint: "GOAL_AT_RISK:g1",
          type: "GOAL_AT_RISK",
          severity: "WARNING",
          title: "Meta",
          description: "Em risco",
          active: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          fingerprint: "GOAL_AT_RISK:g1",
          type: "GOAL_AT_RISK",
          severity: "WARNING",
          title: "Meta",
          description: "Ok",
          active: false,
        },
      ]);

    const { prisma, store } = makePrismaStore();
    const engine = new FinancialAlertEngineService(prisma);

    await engine.runForUser("u1");
    expect([...store.values()][0]?.status).toBe("OPEN");

    await engine.runForUser("u1");
    expect([...store.values()][0]?.status).toBe("RESOLVED");
  });

  it("reabre alerta RESOLVED quando condição volta", async () => {
    evaluateMock
      .mockResolvedValueOnce([
        {
          fingerprint: "UPCOMING_PAYMENT:p1",
          type: "UPCOMING_PAYMENT",
          severity: "WARNING",
          title: "Pagar",
          description: "7d",
          active: true,
        },
      ])
      .mockResolvedValueOnce([
        {
          fingerprint: "UPCOMING_PAYMENT:p1",
          type: "UPCOMING_PAYMENT",
          severity: "WARNING",
          title: "Pagar",
          description: "ok",
          active: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          fingerprint: "UPCOMING_PAYMENT:p1",
          type: "UPCOMING_PAYMENT",
          severity: "WARNING",
          title: "Pagar",
          description: "7d",
          active: true,
        },
      ]);

    const { prisma, store } = makePrismaStore();
    const engine = new FinancialAlertEngineService(prisma);

    await engine.runForUser("u1");
    await engine.runForUser("u1");
    expect([...store.values()][0]?.status).toBe("RESOLVED");

    await engine.runForUser("u1");
    expect([...store.values()][0]?.status).toBe("OPEN");
  });
});
