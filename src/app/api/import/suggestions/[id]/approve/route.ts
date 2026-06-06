import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

import { buildFinancialDocumentServices } from "@/lib/api/financial-documents";

import { prisma } from "@/lib/prisma";

import { FinancialDocumentSuggestionError } from "@/modules/financial-documents/application/services/financial-document-suggestion.service";



type RouteParams = { params: Promise<{ id: string }> };



export async function POST(request: Request, { params }: RouteParams) {

  const session = await auth();

  if (!session?.user?.id) {

    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  }



  const body = (await request.json().catch(() => ({}))) as {

    accountId?: string;

    acknowledgedLowConfidence?: boolean;

  };

  const { id } = await params;

  const { suggestion } = buildFinancialDocumentServices(prisma);



  try {

    const result = await suggestion.approve(session.user.id, id, {

      accountId: body.accountId,

      acknowledgedLowConfidence: body.acknowledgedLowConfidence === true,

    });

    return NextResponse.json(result);

  } catch (error) {

    if (error instanceof FinancialDocumentSuggestionError) {

      const status =

        error.code === "NOT_FOUND"

          ? 404

          : error.code === "LOW_CONFIDENCE_REVIEW_REQUIRED"

            ? 409

            : 400;

      return NextResponse.json({ error: error.message, code: error.code }, { status });

    }

    return NextResponse.json({ error: "Falha ao aprovar sugestão" }, { status: 500 });

  }

}

