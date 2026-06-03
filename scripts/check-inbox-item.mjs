import { PrismaClient } from "@prisma/client";

const ids = process.argv.slice(2);
const prisma = new PrismaClient();

for (const id of ids) {
  const item = await prisma.financialInbox.findUnique({
    where: { id },
    include: {
      extractionResults: { orderBy: { createdAt: "desc" }, take: 1 },
      attachments: { select: { id: true, mimeType: true, fileName: true } },
    },
  });
  console.log(
    JSON.stringify(
      {
        id: item?.id,
        channel: item?.channel,
        status: item?.status,
        rawContent: item?.rawContent?.slice(0, 150),
        attachments: item?.attachments,
        extraction: item?.extractionResults?.[0]
          ? {
              status: item.extractionResults[0].status,
              error: item.extractionResults[0].errorMessage,
            }
          : null,
      },
      null,
      2,
    ),
  );
}

await prisma.$disconnect();
