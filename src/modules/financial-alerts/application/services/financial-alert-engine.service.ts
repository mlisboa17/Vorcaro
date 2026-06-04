import type { FinancialAlertType, PrismaClient } from "@prisma/client";
import { NotificationEventBridgeService } from "@/modules/notifications/application/services/notification-event-bridge.service";
import { FinancialAlertRulesEvaluator } from "../../domain/services/financial-alert-rules.evaluator";
import { FINANCIAL_ALERT_TYPES } from "../../domain/types/financial-alert";
import { PrismaFinancialAlertRepository } from "../../infrastructure/repositories/prisma-financial-alert.repository";

export type AlertEngineRunStats = {
  userId: string;
  created: number;
  updated: number;
  resolved: number;
  dismissedSkipped: number;
  processed: number;
  durationMs: number;
};

export type AlertEngineBatchStats = {
  usersProcessed: number;
  totalCreated: number;
  totalResolved: number;
  durationMs: number;
  perUser: AlertEngineRunStats[];
};

function logEngine(event: string, payload: Record<string, unknown>) {
  console.info(
    JSON.stringify({
      scope: "financial-alert-engine",
      event,
      at: new Date().toISOString(),
      ...payload,
    }),
  );
}

export class FinancialAlertEngineService {
  private readonly repo: PrismaFinancialAlertRepository;
  private readonly evaluator: FinancialAlertRulesEvaluator;
  private readonly notifications: NotificationEventBridgeService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new PrismaFinancialAlertRepository(prisma);
    this.evaluator = new FinancialAlertRulesEvaluator(prisma);
    this.notifications = new NotificationEventBridgeService(prisma);
  }

  async runForUser(userId: string, referenceDate = new Date()): Promise<AlertEngineRunStats> {
    const started = Date.now();
    let created = 0;
    let updated = 0;
    let resolved = 0;
    let dismissedSkipped = 0;

    const candidates = await this.evaluator.evaluate(userId, referenceDate);
    const activeFingerprints = new Set<string>();

    for (const c of candidates) {
      if (c.active) {
        activeFingerprints.add(c.fingerprint);
        const result = await this.repo.upsertOpen({
          userId,
          type: c.type,
          severity: c.severity,
          title: c.title,
          description: c.description,
          fingerprint: c.fingerprint,
          metadata: c.metadata,
          actionUrl: c.actionUrl,
        });
        if (result.created) {
          created += 1;
          await this.notifications.onFinancialAlertCreated({
            userId,
            alertType: c.type,
            severity: c.severity,
            title: c.title,
            description: c.description,
            fingerprint: c.fingerprint,
            actionUrl: c.actionUrl,
            metadata: c.metadata ?? null,
          }).catch(() => undefined);
        } else if (result.record.status === "DISMISSED") dismissedSkipped += 1;
        else if (result.record.status === "OPEN") updated += 1;
      } else {
        const didResolve = await this.repo.resolveByFingerprint(userId, c.fingerprint);
        if (didResolve) resolved += 1;
      }
    }

    const openRows = await this.repo.listOpenFingerprintsByTypes(
      userId,
      FINANCIAL_ALERT_TYPES as unknown as FinancialAlertType[],
    );

    for (const row of openRows) {
      if (!activeFingerprints.has(row.fingerprint)) {
        const didResolve = await this.repo.resolveByFingerprint(userId, row.fingerprint);
        if (didResolve) resolved += 1;
      }
    }

    const durationMs = Date.now() - started;
    const stats: AlertEngineRunStats = {
      userId,
      created,
      updated,
      resolved,
      dismissedSkipped,
      processed: candidates.length,
      durationMs,
    };

    logEngine("run_completed", {
      userId,
      alertasCriados: created,
      alertasAtualizados: updated,
      alertasResolvidos: resolved,
      alertasDescartadosIgnorados: dismissedSkipped,
      quantidadeProcessada: candidates.length,
      tempoExecucaoMs: durationMs,
    });

    return stats;
  }

  async runForAllUsers(): Promise<AlertEngineBatchStats> {
    const started = Date.now();
    const users = await this.prisma.user.findMany({ select: { id: true } });
    const perUser: AlertEngineRunStats[] = [];
    let totalCreated = 0;
    let totalResolved = 0;

    for (const { id } of users) {
      const stats = await this.runForUser(id);
      perUser.push(stats);
      totalCreated += stats.created;
      totalResolved += stats.resolved;
    }

    const batch: AlertEngineBatchStats = {
      usersProcessed: users.length,
      totalCreated,
      totalResolved,
      durationMs: Date.now() - started,
      perUser,
    };

    logEngine("batch_completed", {
      usuariosProcessados: batch.usersProcessed,
      alertasCriados: batch.totalCreated,
      alertasResolvidos: batch.totalResolved,
      tempoExecucaoMs: batch.durationMs,
    });

    return batch;
  }
}
