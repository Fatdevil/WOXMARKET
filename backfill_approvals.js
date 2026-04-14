const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.voice.updateMany({
    where: { visibility: 'public' },
    data: { moderationStatus: 'approved', moderatedAt: new Date(), moderatedBy: 'system' }
  });
  console.log(`Successfully approved ${result.count} existing voices.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
