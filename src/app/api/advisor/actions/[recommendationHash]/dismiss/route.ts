import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildAdvisorRecommendationMemoryService } from "@/lib/api/advisor-recommendation";
import {
  AdvisorRecommendationForbiddenError,
  AdvisorRecommendationInvalidHashError,
} from "@/modules/financial-consultant/application/services/advisor-recommendation-memory.service";
import { dismissRecommendationBodySchema } from "@/types/advisor-recommendation";

type RouteContext = { params: Promise<{ recommendationHash: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { recommendationHash } = await context.params;
  const hash = decodeURIComponent(recommendationHash).trim().toLowerCase();

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = dismissRecommendationBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const service = buildAdvisorRecommendationMemoryService();
  if (!service.isValidHash(hash)) {
    return NextResponse.json({ error: "Hash de recomendação inválido" }, { status: 400 });
  }

  try {
    await service.dismiss(
      session.user.id,
      hash,
      parsed.data.dismissReason,
      parsed.data.actionType ?? "UNKNOWN",
    );
    return NextResponse.json({ ok: true, recommendationHash: hash, status: "DISMISSED" });
  } catch (e) {
    if (e instanceof AdvisorRecommendationInvalidHashError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e instanceof AdvisorRecommendationForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    throw e;
  }
}
