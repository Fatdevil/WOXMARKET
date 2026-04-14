import { seedUsageTo, resetTestingState, fetchSubscriptionState } from './testUtils';
import { getPlanBillingConfig } from '../src/lib/billing/plans';

const MOCK_SECRET = 'vox_super_test_secret';

// Parse arguments
const args = process.argv.slice(2);
const options: Record<string, string> = {};
args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    options[key] = value || 'true';
  }
});

const voiceId = options['voiceId'];
const userId = options['userId'];
const mode = options['mode'] || 'normal';
const chars = parseInt(options['chars'] || '1000', 10);
const concurrency = parseInt(options['concurrency'] || '1', 10);
const apiUrl = options['apiUrl'] || 'http://localhost:3000';

async function runTest() {
  if (!voiceId || !userId) {
    console.error('Usage: npx tsx scripts/stress-generate.ts --voiceId=x --userId=y --mode=...');
    process.exit(1);
  }

  console.log(`\n======================================`);
  console.log(`🚀 VOXMARKET BILLING STRESS TEST SUITE`);
  console.log(`======================================`);
  console.log(`Mode: ${mode.toUpperCase()} | Voice: ${voiceId} | User: ${userId}`);

  // Fetch plan settings to compute correct seeding
  const sub = await fetchSubscriptionState(userId, voiceId);
  if (!sub) {
    console.error(`[FAIL] No active subscription found for user ${userId} to voice ${voiceId}`);
    process.exit(1);
  }
  if (!sub.stripeMeteredItemId) {
    console.error(`[FAIL] Active subscription lacks stripeMeteredItemId! Please manually populate your test db.`);
    process.exit(1);
  }

  const { includedLimit, absoluteCeiling } = getPlanBillingConfig(sub.voice.subscriptionPrice);
  console.log(`Plan Limits -> Included: ${includedLimit} | Absolute Ceiling: ${absoluteCeiling}`);

  // Seed DB based on mode
  let targetSeed = 0;
  switch (mode) {
    case 'normal':
    case 'force_tts_fail':
      targetSeed = 0;
      break;
    case 'near_limit':
      targetSeed = includedLimit - chars + 50; 
      break;
    case 'overage':
    case 'force_stripe_fail':
      targetSeed = includedLimit + 5000;
      break;
    case 'ceiling':
      targetSeed = absoluteCeiling;
      break;
  }

  console.log(`\n⏳ Resetting and Seeding state...`);
  await seedUsageTo(userId, voiceId, targetSeed, MOCK_SECRET);
  console.log(`State seeded to ${targetSeed} used chars.`);

  console.log(`\n💥 FIRING LOAD: ${concurrency} concurrent reqs, ${chars} chars each...`);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-test-secret': MOCK_SECRET,
    'x-test-user-id': userId
  };

  if (mode === 'force_tts_fail') {
     headers['x-test-force-tts-fail'] = 'true';
  }
  if (mode === 'force_stripe_fail') {
     headers['x-test-force-stripe-fail'] = 'true';
  }

  const generateRequests = Array.from({ length: concurrency }).map((_, i) => {
     return fetch(`${apiUrl}/api/voices/${voiceId}/generate`, {
       method: 'POST',
       headers,
       body: JSON.stringify({ text: 'A'.repeat(chars) })
     }).then(async res => {
          if (res.status === 200) return { status: 200, isSuccess: true };
          const data = await res.json().catch(() => ({}));
          return { status: res.status, error: data.error, message: data.message };
     }).catch(err => ({ error: err.message, status: 500 }));
  });

  const startTime = Date.now();
  const results = await Promise.all(generateRequests);
  const duration = Date.now() - startTime;

  console.log(`\n📊 RESULTS IN ${duration}ms`);
  
  let successes = 0;
  let rejections = 0;
  let errors = 0;

  results.forEach((res: any, idx) => {
    if (res.status === 429) {
       console.log(`Req ${idx+1}: BLOCKED (429) ->`, res.message || res.error);
       rejections++;
    } else if (res.error) {
       console.log(`Req ${idx+1}: ERROR ->`, res.error);
       errors++;
    } else if (res.status === 500) {
       console.log(`Req ${idx+1}: SERVER ERROR (500) ->`, res.error);
       errors++;
    } else if (res.status === 200 || !res.status) {
       // Since the API returns audio/mpeg, res.json() will fail and return { status: 200 }. We caught it above and wrapped it.
       console.log(`Req ${idx+1}: SUCCESS (Audio Generated)`);
       successes++;
    } else {
       console.log(`Req ${idx+1}: UNKNOWN ->`, res);
    }
  });

  console.log(`\n📋 SUMMARY`);
  console.log(`Target Mode: ${mode}`);
  console.log(`Attempted: ${concurrency}`);
  console.log(`Successes: ${successes}`);
  console.log(`Blocked (Ceiling/Limits): ${rejections}`);
  console.log(`Failures (500s/Stripe/TTS): ${errors}`);

  // Final check logic
  let passed = false;
  if (mode === 'normal' || mode === 'near_limit' || mode === 'overage') passed = successes === concurrency;
  else if (mode === 'ceiling') passed = rejections === concurrency;
  else if (mode === 'force_tts_fail' || mode === 'force_stripe_fail') passed = errors === concurrency;
  else passed = false;
  
  console.log(`\nVERDICT: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  process.exit(passed ? 0 : 1);
}

runTest().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
