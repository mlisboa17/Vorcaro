import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/webhooks/bank-integration/route';
import { prisma } from '@/lib/prisma';
import { ProcessBankWebhookUseCase } from '@/modules/transactions/use-cases/process-bank-webhook.use-case';

// 1. Mock seguro de NextResponse para evitar pendências no Node
vi.mock('next/server', () => {
  return {
    NextResponse: {
      json: (body: unknown, init?: ResponseInit) => {
        return {
          status: init?.status ?? 200,
          json: async () => body,
        };
      }
    }
  };
});

// 2. Mock do Cliente Prisma (Zero Any)
vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      financialAccount: {
        findUnique: vi.fn(),
      },
      webhookLog: {
        create: vi.fn(),
      },
    },
  };
});

// 3. Mock do Caso de Uso
vi.mock('@/modules/transactions/use-cases/process-bank-webhook.use-case', () => {
  return {
    ProcessBankWebhookUseCase: vi.fn().mockImplementation(() => ({
      execute: vi.fn(),
    })),
  };
});

// Utils tipadas de Request para evitar any
function createMockRequest(url: string, body: unknown, headersInit: Record<string, string>): Request {
  return {
    url,
    json: async () => body,
    headers: {
      entries: () => Object.entries(headersInit),
      get: (key: string) => {
        const found = Object.entries(headersInit).find(([k]) => k.toLowerCase() === key.toLowerCase());
        return found ? found[1] : null;
      }
    } as unknown as Headers
  } as unknown as Request;
}

type MockAccountResult = Awaited<ReturnType<typeof prisma.financialAccount.findUnique>>;

describe('Asaas Webhook Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validPayload = {
    event: 'PAYMENT_RECEIVED',
    payment: {
      id: 'pay_000123',
      value: 150.50,
      description: 'Test Payment'
    }
  };

  it('1. Sucesso (200): Token válido, assinatura validada e novo payload', async () => {
    // Preparar mocks
    const mockAccount: Partial<MockAccountResult> = {
      id: 'acc_xyz',
      userId: 'usr_xyz',
      webhookToken: 'segredo-secreto-123',
    };
    vi.mocked(prisma.financialAccount.findUnique).mockResolvedValue(mockAccount as MockAccountResult);

    const executeMock = vi.fn().mockResolvedValue({ success: true, transactionId: 'txn_123', ignored: false });
    vi.mocked(ProcessBankWebhookUseCase).mockImplementation(() => {
      return { execute: executeMock } as unknown as ProcessBankWebhookUseCase;
    });

    // Simular Request do Asaas
    const req = createMockRequest(
      'http://localhost/api/webhooks/bank-integration?token=segredo-secreto-123&provider=asaas',
      validPayload,
      { 'asaas-access-token': 'segredo-secreto-123' } // Assinatura válida
    );

    const res = await POST(req) as unknown as Response;
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ status: 'processed', transactionId: 'txn_123' });
    expect(executeMock).toHaveBeenCalledWith('usr_xyz', 'acc_xyz', 'asaas', validPayload);
  });

  it('2. Não Autorizado (401): Assinatura incorreta ou ausente no header', async () => {
    const mockAccount: Partial<MockAccountResult> = {
      id: 'acc_xyz',
      userId: 'usr_xyz',
      webhookToken: 'segredo-secreto-123',
    };
    vi.mocked(prisma.financialAccount.findUnique).mockResolvedValue(mockAccount as MockAccountResult);

    // Header errado
    const req = createMockRequest(
      'http://localhost/api/webhooks/bank-integration?token=segredo-secreto-123&provider=asaas',
      validPayload,
      { 'asaas-access-token': 'wrong-signature-xxx' }
    );

    const res = await POST(req) as unknown as Response;
    const json = await res.json();

    expect(res.status).toBe(401);
    expect((json as { error: string }).error).toMatch(/inválida/i);
  });

  it('3. Idempotência (200): Lançamento repetido e P2002', async () => {
    const mockAccount: Partial<MockAccountResult> = {
      id: 'acc_xyz',
      userId: 'usr_xyz',
      webhookToken: 'segredo-secreto-123',
    };
    vi.mocked(prisma.financialAccount.findUnique).mockResolvedValue(mockAccount as MockAccountResult);

    // O Use Case simula a captura da violação única do Prisma retornando ignored: true
    const executeMock = vi.fn().mockResolvedValue({ success: true, ignored: true });
    vi.mocked(ProcessBankWebhookUseCase).mockImplementation(() => {
      return { execute: executeMock } as unknown as ProcessBankWebhookUseCase;
    });

    const req = createMockRequest(
      'http://localhost/api/webhooks/bank-integration?token=segredo-secreto-123&provider=asaas',
      validPayload,
      { 'asaas-access-token': 'segredo-secreto-123' }
    );

    const res = await POST(req) as unknown as Response;
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ status: 'ignored', message: 'Evento duplicado já processado.' });
  });
});
