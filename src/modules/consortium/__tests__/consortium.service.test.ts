import { describe, expect, it, vi } from "vitest";
import { ConsortiumError, ConsortiumService } from "../application/consortium.service";
import { computeSaldoRestante } from "@/lib/consortium/consortium-domain";

function buildPrismaMock() {
  const store = {
    consortium: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    patrimonyAsset: { findFirst: vi.fn() },
    lancamentoRecorrente: { findFirst: vi.fn() },
  };

  return store;
}

describe("ConsortiumService", () => {
  it("calcula saldo restante como crédito menos pago", () => {
    const saldo = computeSaldoRestante({
      valorCredito: { toNumber: () => 100_000 },
      valorPago: { toNumber: () => 35_000 },
    });
    expect(saldo).toBe(65_000);
  });

  it("registra pagamento de parcela incrementando parcelas e valor pago", async () => {
    const prisma = buildPrismaMock();
    const existing = {
      id: "c1",
      userId: "u1",
      nome: "Consórcio Auto",
      tipo: "VEHICLE",
      status: "NOT_CONTEMPLATED",
      valorCredito: { toNumber: () => 60_000 },
      valorLance: { toNumber: () => 0 },
      valorPago: { toNumber: () => 6_000 },
      valorTaxas: { toNumber: () => 6_000 },
      quantidadeParcelas: 60,
      parcelasPagas: 10,
      dataContratacao: new Date("2024-01-10T12:00:00.000Z"),
      dataContemplacao: null,
      dataQuitacao: null,
      assetId: null,
      lancamentoRecorrenteId: null,
      estaAtivo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      asset: null,
    };

    prisma.consortium.findFirst.mockResolvedValue(existing);
    prisma.consortium.update.mockImplementation(async ({ data }) => ({
      ...existing,
      parcelasPagas: data.parcelasPagas,
      valorPago: { toNumber: () => data.valorPago as number },
      status: data.status,
      asset: null,
    }));

    const service = new ConsortiumService(prisma as never);
    const updated = await service.registerParcelPayment("c1", "u1");

    expect(updated.parcelasPagas).toBe(11);
    expect(prisma.consortium.update).toHaveBeenCalled();
  });

  it("exige assetId ao mudar para ASSET_ACQUIRED", async () => {
    const prisma = buildPrismaMock();
    prisma.consortium.findFirst.mockResolvedValue({
      id: "c1",
      userId: "u1",
      status: "CONTEMPLATED",
      assetId: null,
      estaAtivo: true,
      asset: null,
    });

    const service = new ConsortiumService(prisma as never);

    await expect(
      service.update("c1", "u1", { status: "ASSET_ACQUIRED" }),
    ).rejects.toBeInstanceOf(ConsortiumError);
  });

  it("soft delete desativa e limpa assetId", async () => {
    const prisma = buildPrismaMock();
    prisma.consortium.findFirst.mockResolvedValue({
      id: "c1",
      userId: "u1",
      assetId: "asset-1",
      estaAtivo: true,
      asset: null,
    });
    prisma.consortium.update.mockResolvedValue({
      id: "c1",
      estaAtivo: false,
      assetId: null,
      asset: null,
    });

    const service = new ConsortiumService(prisma as never);
    const deleted = await service.softDelete("c1", "u1");

    expect(deleted.estaAtivo).toBe(false);
    expect(deleted.assetId).toBeNull();
    expect(prisma.consortium.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { estaAtivo: false, assetId: null },
      }),
    );
  });
});
