import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const channels = ["TELEGRAM", "TELEGRAM_VOICE", "TELEGRAM_IMAGE"];

const items = await prisma.financialInbox.findMany({
  where: { channel: { in: channels } },
  orderBy: { createdAt: "desc" },
  take: 15,
  select: {
    id: true,
    channel: true,
    status: true,
    createdAt: true,
    rawContent: true,
    user: { select: { email: true } },
  },
});

const connections = await prisma.telegramConnection.findMany({
  select: { telegramChatId: true, isActive: true, user: { select: { email: true } } },
});

console.log(
  JSON.stringify(
    {
      connections: connections.map((c) => ({
        ...c,
        telegramChatId: c.telegramChatId.toString(),
      })),
      items: items.map((i) => ({
        ...i,
        createdAt: i.createdAt.toISOString(),
        rawContent: (i.rawContent || "").slice(0, 120),
      })),
    },
    null,
    2,
  ),
);
await prisma.$disconnect();
