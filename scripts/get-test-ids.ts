import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.subscription.findFirst({where:{status:'active'}}).then(s => {
  console.log('VOICE:', s?.voiceId);
  console.log('USER:', s?.buyerUserId);
}).finally(() => prisma.$disconnect());
