#!/usr/bin/env node

/**
 * Script para testar crons localmente antes de deploy
 * Valida que endpoints estão acessíveis e retornam respostas esperadas
 *
 * Uso: node scripts/test-crons-local.mjs
 */

import fetch from "node-fetch";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET || "test-secret";

const CRONS = [
  {
    name: "Due Invoice Alerts",
    path: "/api/cron/due-invoice-alerts",
    description: "Detecta faturas vencendo (próximos 3 dias)",
  },
  {
    name: "Scheduled Extracts",
    path: "/api/cron/scheduled-extracts",
    description: "Envia extratos agendados (semanal/mensal)",
  },
  {
    name: "Automated Reports",
    path: "/api/cron/automated-reports",
    description: "Relatórios automáticos",
  },
  {
    name: "Spending Anomalies",
    path: "/api/cron/spending-anomalies",
    description: "Detecta gastos anormais",
  },
  {
    name: "Weekly Summary",
    path: "/api/cron/weekly-summary",
    description: "Resumo semanal (Sprint 19)",
  },
];

async function testCron(cron) {
  try {
    console.log(`\n🔍 Testando: ${cron.name}`);
    console.log(`   📍 ${cron.path}`);
    console.log(`   📝 ${cron.description}`);

    const response = await fetch(`${BASE_URL}${cron.path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CRON_SECRET}`,
      },
    });

    const data = await response.json();

    if (response.status === 200 && data.ok) {
      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   💬 Mensagem: ${data.message}`);
      return { ok: true, cron: cron.name };
    } else if (response.status === 503) {
      console.log(`   ⚠️  Status: 503 (Dep. não configurada)`);
      console.log(`   💬 ${data.error}`);
      return { ok: false, cron: cron.name, reason: "Dependency" };
    } else {
      console.log(`   ❌ Status: ${response.status}`);
      console.log(`   💬 ${data.error || "Erro desconhecido"}`);
      return { ok: false, cron: cron.name, reason: "HTTP Error" };
    }
  } catch (error) {
    console.log(`   ❌ Erro: ${error.message}`);
    return {
      ok: false,
      cron: cron.name,
      reason: error.message,
    };
  }
}

async function main() {
  console.log("🚀 Testando Crons Locais");
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔐 CRON_SECRET: ${CRON_SECRET.substring(0, 5)}...`);
  console.log("=".repeat(60));

  const results = [];
  for (const cron of CRONS) {
    const result = await testCron(cron);
    results.push(result);
    // Pequeno delay entre requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("\n" + "=".repeat(60));
  console.log("\n📊 Resumo:");
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  console.log(`✅ Passou: ${passed}/${CRONS.length}`);
  console.log(`❌ Falhou: ${failed}/${CRONS.length}`);

  if (failed > 0) {
    console.log("\n⚠️  Falhas:");
    results
      .filter((r) => !r.ok)
      .forEach((r) => {
        console.log(`  • ${r.cron}: ${r.reason}`);
      });
    process.exit(1);
  } else {
    console.log("\n✨ Todos os crons testados com sucesso!");
    console.log("Pronto para deploy 🚀");
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("❌ Erro fatal:", error);
  process.exit(1);
});
