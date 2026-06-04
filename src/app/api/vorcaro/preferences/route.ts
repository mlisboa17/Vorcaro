import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { buildVorcaroMessaging } from "@/lib/api/vorcaro";
import { VORCARO_TONES } from "@/modules/vorcaro/domain/types/vorcaro-personality";
import { VORCARO_PERSONALITY_CONFIG } from "@/modules/vorcaro/domain/vorcaro-personality-config";
import { VORCARO_PROFILE } from "@/modules/vorcaro/domain/vorcaro-profile";

const patchSchema = z.object({
  vorcaroTone: z.enum(VORCARO_TONES),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vorcaro = buildVorcaroMessaging();
  const tone = await vorcaro.getUserTone(session.user.id);

  return NextResponse.json({
    vorcaroTone: tone,
    name: VORCARO_PROFILE.name,
    mission: VORCARO_PROFILE.mission,
    signature: VORCARO_PROFILE.signature,
    profiles: VORCARO_TONES.map((t) => ({
      tone: t,
      label: VORCARO_PERSONALITY_CONFIG[t].label,
      description: VORCARO_PERSONALITY_CONFIG[t].description,
    })),
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const vorcaro = buildVorcaroMessaging();
  const tone = await vorcaro.updateUserTone(session.user.id, parsed.data.vorcaroTone);

  return NextResponse.json({
    vorcaroTone: tone,
    label: vorcaro.getToneLabel(tone),
  });
}
