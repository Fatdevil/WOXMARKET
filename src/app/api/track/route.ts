import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event, voiceId, context } = body;

    // MVP Optional Tracking (Lightweight Console Logger)
    // Avoids DB pollution for unauthenticated public traffic.
    // Events: 'voice_shared', 'public_page_view', 'subscription_from_public_page'
    
    if (!event) {
       return NextResponse.json({ error: 'Missing event payload' }, { status: 400 });
    }

    console.log(`[ANALYTICS] Event: ${event} | Voice: ${voiceId || 'N/A'} | Context: ${JSON.stringify(context || {})}`);

    return NextResponse.json({ success: true, logged: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process tracking event' }, { status: 500 });
  }
}
