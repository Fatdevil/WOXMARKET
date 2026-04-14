import prisma from '../src/lib/prisma';
import { execSync } from 'child_process';

async function runSuite() {
  console.log('Fetching viable test target...');
  const sub = await prisma.subscription.findFirst({
    where: { status: 'active', stripeMeteredItemId: { not: null } }
  });

  if (!sub) {
    console.log('No valid active subscription with a stripeMeteredItemId found. Skipping E2E execution.');
    process.exit(0);
  }

  const voiceId = sub.voiceId;
  const userId = sub.buyerUserId;

  const scenarios = [
    { mode: 'normal', concurrency: 3, chars: 100 },
    { mode: 'near_limit', concurrency: 1, chars: 100 },
    { mode: 'overage', concurrency: 2, chars: 100 },
    { mode: 'ceiling', concurrency: 2, chars: 100 },
    { mode: 'force_tts_fail', concurrency: 1, chars: 100 },
    { mode: 'force_stripe_fail', concurrency: 1, chars: 100 }
  ];

  for (const s of scenarios) {
    console.log(`\n\n=== RUNNING SCENARIO: ${s.mode} ===`);
    try {
      execSync(`npx tsx scripts/stress-generate.ts --voiceId=${voiceId} --userId=${userId} --mode=${s.mode} --concurrency=${s.concurrency} --chars=${s.chars} --apiUrl=http://localhost:3001`, { stdio: 'inherit', env: { ...process.env, ENABLE_TEST_FAILURE_HOOKS: 'true' } });
    } catch (err) {
      console.error(`Scenario ${s.mode} failed execution.`);
      process.exit(1);
    }
  }

  console.log('\n\n✅ ALL STRESS TESTS PASSED SUCCESSFULLY.');
  process.exit(0);
}

runSuite().finally(() => prisma.$disconnect());
