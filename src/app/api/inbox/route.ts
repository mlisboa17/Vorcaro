import { NextResponse } from "next/server";

import { z } from "zod";

import { auth } from "@/lib/auth";

import { prisma } from "@/lib/prisma";

import { enqueueFinancialInboxProcessing } from "@/lib/queue";

import { toIngestInput } from "@/adapters/web/mappers/inbox.mapper";

import { IngestInboxItemUseCase } from "@/modules/financial-inbox/application/use-cases/ingest-inbox-item.use-case";

import { ListInboxItemsUseCase } from "@/modules/financial-inbox/application/use-cases/list-inbox-items.use-case";

import { PrismaInboxRepository } from "@/modules/financial-inbox/infrastructure/repositories/prisma-inbox.repository";

import {

  normalizeJsonInboxPayload,

  parseInboxJsonBody,

  parseMultipartInboxPayload,

} from "@/lib/inbox/parse-inbox-post";



const inboxQuerySchema = z.object({

  status: z

    .enum(["PENDING", "PROCESSING", "READY", "NEEDS_CONFIRMATION", "SAVED", "ERROR"])

    .optional(),

  limit: z.coerce.number().int().min(1).max(100).optional(),

  offset: z.coerce.number().int().min(0).optional(),

});



export async function GET(request: Request) {

  const session = await auth();



  if (!session?.user?.id) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }



  const { searchParams } = new URL(request.url);

  const parsed = inboxQuerySchema.safeParse({

    status: searchParams.get("status") ?? undefined,

    limit: searchParams.get("limit") ?? undefined,

    offset: searchParams.get("offset") ?? undefined,

  });



  if (!parsed.success) {

    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  }



  const repository = new PrismaInboxRepository(prisma);

  const useCase = new ListInboxItemsUseCase(repository);



  const result = await useCase.execute({

    userId: session.user.id,

    filters: parsed.data,

  });



  return NextResponse.json(result);

}



export async function POST(request: Request) {

  const session = await auth();



  if (!session?.user?.id) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }



  const contentType = request.headers.get("content-type") ?? "";



  try {

    let payload;



    if (contentType.includes("multipart/form-data")) {

      const formData = await request.formData();

      payload = normalizeJsonInboxPayload(await parseMultipartInboxPayload(formData));

    } else {

      let body: unknown;

      try {

        body = await request.json();

      } catch {

        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

      }



      payload = normalizeJsonInboxPayload(parseInboxJsonBody(body));

    }



    const repository = new PrismaInboxRepository(prisma);

    const useCase = new IngestInboxItemUseCase(repository);



    const ingestInput = toIngestInput(session.user.id, payload);

    const { id } = await useCase.execute(ingestInput);



    await enqueueFinancialInboxProcessing({

      inboxItemId: id,

      userId: session.user.id,

    });



    return NextResponse.json(

      {

        id,

        status: "PENDING",

        channel: ingestInput.channel,

        contentType: payload.contentType ?? "TEXT",

      },

      { status: 201 },

    );

  } catch (error) {

    if (error instanceof z.ZodError) {

      return NextResponse.json({ error: error.flatten() }, { status: 400 });

    }



    const message = error instanceof Error ? error.message : "Failed to ingest inbox item";

    return NextResponse.json({ error: message }, { status: 400 });

  }

}

