import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding Database...');

  // Create a Demo Creator
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const creator = await prisma.user.upsert({
    where: { email: 'creator@voxmarket.ai' },
    update: {},
    create: {
      email: 'creator@voxmarket.ai',
      displayName: 'Vox Studios',
      passwordHash,
      role: 'creator',
      creatorProfile: {
        create: {
          bio: 'Professional Voice Acting Studio from London',
          publicProfileSlug: 'vox-studios'
        }
      }
    }
  });

  console.log('Created Demo Creator:', creator.displayName);

  // Example Voices
  const voicesToSeed = [
    {
      title: 'Arthur - Professional British',
      description: 'A deep, resonant British male voice perfect for audiobooks, documentaries, and high-end commercials. Calm and authoritative.',
      useCase: 'Ideal for audiobooks and storytelling',
      language: 'en',
      category: 'Audiobooks / Narration',
      tags: ['british', 'deep', 'calm', 'authoritative'],
      subscriptionPrice: 19,
      priceType: 'both',
      usagePriceUnit: 1.5,
      visibility: 'public',
      status: 'ready',
    },
    {
      title: 'Elsa - Energetic Swedish',
      description: 'Ljus, energisk och glad tjejröst på svenska. Perfekt för reklamer, sociala medier och TikTok-berättelser.',
      useCase: 'Perfect for ads & TikTok content',
      language: 'sv',
      category: 'Commercials / Ads',
      tags: ['swedish', 'energetic', 'female', 'youthful'],
      subscriptionPrice: 9,
      priceType: 'subscription',
      usagePriceUnit: 0,
      visibility: 'public',
      status: 'ready',
    },
    {
      title: 'Marcus - Gritty Trailer Voice',
      description: 'IN A WORLD... This is your ultimate movie trailer voice. Gritty, intense, and dramatic.',
      useCase: 'Best for gaming and trailers',
      language: 'en',
      category: 'Gaming / Streaming',
      tags: ['trailer', 'intense', 'gritty', 'dramatic'],
      subscriptionPrice: 19,
      priceType: 'both',
      usagePriceUnit: 2.5,
      visibility: 'public',
      status: 'ready',
    }
  ];

  for (const v of voicesToSeed) {
    const voice = await prisma.voice.create({
      data: {
        creatorUserId: creator.id,
        title: v.title,
        useCase: v.useCase,
        description: v.description,
        language: v.language,
        category: v.category,
        tags: v.tags,
        subscriptionPrice: v.subscriptionPrice,
        priceType: v.priceType,
        usagePriceUnit: v.usagePriceUnit,
        visibility: v.visibility,
        status: v.status,
        publishedAt: new Date(),
        listing: {
          create: {
            status: 'active',
            featuredRank: Math.floor(Math.random() * 10)
          }
        }
      }
    });
    console.log('Seeded Voice:', voice.title);
  }

  console.log('Seeding Complete! 🎉');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
