import prisma from '../src/lib/prisma';
import crypto from 'crypto';

export async function resetTestingState(userId: string, voiceId: string, testSecret: string) {
  if (testSecret !== 'vox_super_test_secret') throw new Error('Invalid test secret');
  
  // Wipe generated audio and usage events
  await prisma.usageEvent.deleteMany({
    where: { buyerUserId: userId, voiceId }
  });
  
  await prisma.generatedAudio.deleteMany({
    where: { userId, voiceId } // Using userId since GeneratedAudio maps it to userId instead of buyerUserId
  });
  
  console.log(`[TEST] Reset complete for user ${userId} and voice ${voiceId}`);
}

export async function seedUsageTo(userId: string, voiceId: string, targetUsage: number, testSecret: string) {
  if (testSecret !== 'vox_super_test_secret') throw new Error('Invalid test secret');
  
  // Clean first
  await resetTestingState(userId, voiceId, testSecret);
  
  if (targetUsage > 0) {
    await prisma.usageEvent.create({
      data: {
        buyerUserId: userId,
        voiceId: voiceId,
        eventType: 'paid_generation',
        usageAmount: targetUsage,
        unit: 'characters',
        billingBucket: 'included',
        source: 'test_seed'
      }
    });
    console.log(`[TEST] Seeded ${targetUsage} chars for user ${userId}`);
  }
}

export async function fetchSubscriptionState(userId: string, voiceId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { buyerUserId: userId, voiceId, status: 'active' },
    include: { voice: true }
  });
  return sub;
}
