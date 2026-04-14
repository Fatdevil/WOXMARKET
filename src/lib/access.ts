import prisma from '@/lib/prisma';

/**
 * Checks if a user has an active, paid subscription to a specific voice.
 * IMPORTANT: This follows a "fail-closed" model.
 * Only 'active' status yields true. 'canceled', 'unpaid', 'past_due' yield false.
 * 
 * @param buyerUserId string - The internal user ID of the buyer
 * @param voiceId string - The ID of the voice
 * @returns boolean - Whether the user has strict access to use the voice
 */
export async function hasActiveVoiceAccess(buyerUserId: string, voiceId: string): Promise<boolean> {
  if (!buyerUserId || !voiceId) return false;

  try {
    // 1. Verify the voice actually exists and is not suspended
    const voice = await prisma.voice.findUnique({
      where: { id: voiceId }
    });

    if (!voice || voice.status === 'suspended' || voice.visibility === 'private') {
      // Allow creator to always access their own voice regardless of subscription
      if (voice && voice.creatorUserId === buyerUserId) {
        return true;
      }
      return false; // Fail closed
    }

    // Creator override - you obviously have access to your own creations
    if (voice.creatorUserId === buyerUserId) {
      return true;
    }

    // 2. Fetch subscription status strictly requiring 'active'
    const subscription = await prisma.subscription.findFirst({
      where: {
        buyerUserId,
        voiceId,
        status: 'active'
      }
    });

    if (!subscription) {
      return false;
    }

    // Passed all barriers: The user is actively paying for this.
    return true;

  } catch (error) {
    console.error(`[ACCESS CONTROL ERROR] Error evaluating access for User ${buyerUserId} on Voice ${voiceId}:`, error);
    return false; // Fail closed if DB query fails
  }
}
