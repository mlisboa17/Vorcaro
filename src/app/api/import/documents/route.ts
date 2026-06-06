import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

import { buildFinancialDocumentServices } from "@/lib/api/financial-documents";

import { prisma } from "@/lib/prisma";

import { enrichDocumentsHistory } from "@/modules/financial-documents/application/services/financial-document-suggestion-presenter.service";
import { FinancialDocumentUploadError } from "@/modules/financial-documents/application/services/financial-document-upload.service";



export async function GET(request: Request) {

  const session = await auth();

  if (!session?.user?.id) {

    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  }



  const url = new URL(request.url);

  const status = url.searchParams.get("status") ?? undefined;

  const enriched = url.searchParams.get("enriched") === "true";

  const { repo } = buildFinancialDocumentServices(prisma);

  const documents = await repo.listDocuments(

    session.user.id,

    status as never,

    100,

  );



  if (enriched) {

    const items = await enrichDocumentsHistory(prisma, session.user.id, documents);

    return NextResponse.json({ items });

  }



  return NextResponse.json({ items: documents });

}



export async function POST(request: Request) {

  const session = await auth();

  if (!session?.user?.id) {

    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  }



  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {

    return NextResponse.json({ error: "Envie multipart/form-data" }, { status: 400 });

  }



  const formData = await request.formData().catch(() => null);

  if (!formData) {

    return NextResponse.json({ error: "Falha ao ler upload" }, { status: 400 });

  }



  const file = formData.get("file");

  if (!(file instanceof File)) {

    return NextResponse.json({ error: "Campo file ausente" }, { status: 400 });

  }



  const buffer = Buffer.from(await file.arrayBuffer());

  const { upload, processing } = buildFinancialDocumentServices(prisma);



  try {

    const uploadResult = await upload.upload({

      userId: session.user.id,

      fileName: file.name,

      mimeType: file.type || "application/octet-stream",

      buffer,

      source: "WEB",

    });

    if (uploadResult.action === "existing_active") {

      return NextResponse.json(

        {

          document: uploadResult.document,

          action: uploadResult.action,

          message: uploadResult.message,

        },

        { status: 200 },

      );

    }

    const document = uploadResult.document;

    const result = await processing.process(session.user.id, document.id);

    const updated = await prisma.financialDocument.findUnique({ where: { id: document.id } });

    const responseBase = {

      document: updated,

      processing: result,

      action: uploadResult.action,

      ...(uploadResult.action === "recovered"

        ? { message: uploadResult.message, previousStatus: uploadResult.previousStatus }

        : {}),

    };



    if (result.status === "PASSWORD_REQUIRED") {

      return NextResponse.json(

        {

          ...responseBase,

          message: result.message,

        },

        { status: uploadResult.action === "recovered" ? 200 : 201 },

      );

    }



    if (result.status === "FAILED") {

      return NextResponse.json(

        {

          ...responseBase,

          error: result.reason,

          code: result.code,

        },

        { status: 422 },

      );

    }



    if (result.status === "DUPLICATE_SEMANTIC") {

      return NextResponse.json(

        {

          ...responseBase,

          error: "Documento duplicado detectado.",

          code: "DUPLICATE_SEMANTIC",

        },

        { status: 409 },

      );

    }



    return NextResponse.json(responseBase, {

      status: uploadResult.action === "recovered" ? 200 : 201,

    });

  } catch (error) {

    if (error instanceof FinancialDocumentUploadError) {

      const status =

        error.code === "DUPLICATE" || error.code === "DUPLICATE_APPROVED" ? 409 : 400;

      return NextResponse.json({ error: error.message, code: error.code }, { status });

    }

    console.error("[import/documents POST]", error);

    return NextResponse.json({ error: "Arquivo inválido ou corrompido." }, { status: 422 });

  }

}

