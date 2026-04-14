import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { uploadBuffer } from '@/lib/storage';
import crypto from 'crypto';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    const voiceId = params.id;

    if (!session?.user || session.user.role !== 'creator') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const voice = await prisma.voice.findUnique({ where: { id: voiceId } });
    if (!voice || voice.creatorUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await req.formData();
    const audioContent = formData.get('audio') as File;
    
    if (!audioContent) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // 1. Upload file to R2
    const bytes = await audioContent.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // File structure as defined in spec: voices/{voiceId}/training/{uuid}.webm
    const fileId = crypto.randomUUID();
    const storageKey = `voices/${voiceId}/training/${fileId}.webm`;
    
    await uploadBuffer(buffer, storageKey, audioContent.type);

    // 2. Create Training Job securely retaining the private key
    const job = await prisma.voiceTrainingJob.create({
      data: {
        voiceId,
        userId: session.user.id,
        sourceAudioKey: storageKey,
        preprocessingStatus: 'pending',
        trainingStatus: 'pending',
        startedAt: new Date(),
      }
    });

    // 3. Update Voice status to training
    await prisma.voice.update({
      where: { id: voiceId },
      data: { status: 'training' }
    });

    // --- SIMULATED AI TRAINING TIMERS ---
    // We simulate the flow: processing -> training -> ready
    setTimeout(async () => {
      // Step 1: Processing
      await prisma.voiceTrainingJob.update({
        where: { id: job.id },
        data: { preprocessingStatus: 'completed', trainingStatus: 'processing' }
      });
      
      setTimeout(async () => {
        // Step 2: Ready
        await prisma.voiceTrainingJob.update({
          where: { id: job.id },
          data: { trainingStatus: 'completed', completedAt: new Date() }
        });
        await prisma.voice.update({
          where: { id: voiceId },
          data: { status: 'ready' }
        });
        console.log(`[SIMULATED TRAINING] Voice ${voiceId} is now ready!`);
      }, 10000); // 10 seconds of "training"
      
    }, 5000); // 5 seconds of "preprocessing"

    return NextResponse.json({ message: 'Upload successful, training started', jobId: job.id }, { status: 200 });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
