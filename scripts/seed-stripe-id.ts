import prisma from '../src/lib/prisma';
import crypto from 'crypto';

async function seed() {
   let sub = await prisma.subscription.findFirst({
      where: { status: 'active' }
   });
   
   if (!sub) {
      console.log('No active sub, creating test setup from scratch...');

      const mockCreator = await prisma.user.create({
         data: { email: 'creator_test_' + Date.now() + '@example.com', displayName: 'Test Creator', role: 'creator', passwordHash: 'none' }
      });

      const mockBuyer = await prisma.user.create({
         data: { email: 'buyer_test_' + Date.now() + '@example.com', displayName: 'Test Buyer', role: 'buyer', passwordHash: 'none' }
      });

      const mockVoice = await prisma.voice.create({
         data: {
             creatorUserId: mockCreator.id,
             title: 'Stress Test Voice',
             subscriptionPrice: 9.0, // Maps to 10k limit / 100k absolute
             status: 'ready',
             moderationStatus: 'approved',
             visibility: 'public'
         }
      });

      sub = await prisma.subscription.create({
         data: {
             buyerUserId: mockBuyer.id,
             voiceId: mockVoice.id,
             status: 'active',
             stripeMeteredItemId: 'si_test_dummy_id_123',
             currentPeriodStart: new Date(new Date().setDate(1)), // Start of month
             currentPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1, 1)) // Next month
         }
      });

      console.log('Created fully mocked hierarchy for E2E tests:', sub);
   } else {
      await prisma.subscription.update({
         where: { id: sub.id },
         data: { stripeMeteredItemId: 'si_test_dummy_id_123' }
      });
      console.log('Seeded Stripe Metered Item Id for User: ' + sub.buyerUserId);
   }
}

seed().finally(() => prisma.$disconnect());
