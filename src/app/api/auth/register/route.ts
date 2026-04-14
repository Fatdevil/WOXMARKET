import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { email, password, displayName, role } = await req.json();

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Checking if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const assignedRole = role === 'creator' ? 'creator' : 'buyer';

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        role: assignedRole,
      },
    });

    // If creator, also initialize creator profile
    if (assignedRole === 'creator') {
      await prisma.creatorProfile.create({
        data: {
          userId: user.id,
        },
      });
    }

    return NextResponse.json(
      { message: 'User created successfully', userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
