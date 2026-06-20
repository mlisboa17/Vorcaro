import "dotenv/config";
import { Worker } from "bullmq";
import { getRedisConnectionOptions, QUEUE_NAMES, type PredictiveAlertsJobData } from "@/lib/queue";
import { PredictiveAnomalyEngine } from "@/modules/inbox-intelligence/services/predictive-anomaly.engine";

export function createPredictiveAlertsWorker(): Worker<PredictiveAlertsJobData> {
  return new Worker<PredictiveAlertsJobData>(
    QUEUE_NAMES.PREDICTIVE_ALERTS,
    async (job) => {
      const { userId } = job.data;
      console.info(`[predictive-alerts] Iniciando análise para usuário: ${userId}`);
      
      const engine = new PredictiveAnomalyEngine();
      const result = await engine.analyze(userId);
      
      if (result) {
        console.info(`[predictive-alerts] Análise concluída: Anomalia=${result.anomaliaDetectada}, Severidade=${result.severidade}`);
      } else {
        console.info(`[predictive-alerts] Análise ignorada por falta de dados suficientes.`);
      }
    },
    {
      connection: getRedisConnectionOptions(),
      concurrency: 1, // Lote rodando um por vez para evitar gargalo de LLM rate limits
    }
  );
}
