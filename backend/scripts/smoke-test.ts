import { prisma } from '../src/config/prisma';
import { AgentOrchestrator } from '../src/agent/AgentOrchestrator';

async function runSmokeTest() {
  console.log('--- STARTING SMOKE TEST ---');
  try {
    const payment = await prisma.payment.findFirst({
      where: { status: 'FAILED' }
    });

    if (!payment) {
      console.log('No failed payment found to run smoke test.');
      return;
    }

    console.log(`Running orchestrator for payment ID: ${payment.id}`);
    const orchestrator = new AgentOrchestrator(prisma);
    const result = await orchestrator.run(payment.id);

    console.log('\n--- SMOKE TEST RESULT ---');
    console.log(JSON.stringify(result, null, 2));

    const run = await prisma.agentRun.findUnique({
      where: { id: result.runId },
      include: { agentActions: true }
    });

    console.log('\n--- AGENT RUN DATA ---');
    console.log(JSON.stringify(run, null, 2));
    
  } catch (err: any) {
    console.error('Smoke test failed with error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runSmokeTest();
