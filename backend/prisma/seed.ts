import { prisma } from '../src/config/prisma';

// Deterministic random number generator for seed
function seededRandom(seed: number) {
  let x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

async function main() {
  console.log('Starting seed...');

  // 1. Create Merchant Policy
  await prisma.merchantPolicy.upsert({
    where: { id: 'policy-seed-1' },
    update: {},
    create: {
      id: 'policy-seed-1',
      maxRetryAttempts: 3,
      maxDiscountPercent: 10,
      minimumConfidence: 0.70,
      highValueThreshold: 150.0,
      maxAgentSteps: 5,
      highValueApprovalRequired: true,
      active: true,
    },
  });

  // 2. Create Recovery Offers
  const offers = [
    { id: 'offer-seed-1', name: '5% Off Next Month', discountPercent: 5.0, maximumApplicableAmount: null },
    { id: 'offer-seed-2', name: '10% Off Now', discountPercent: 10.0, maximumApplicableAmount: 100.0 },
    { id: 'offer-seed-3', name: 'Waive Late Fee', discountPercent: 0.0, maximumApplicableAmount: null },
  ];
  
  for (const offer of offers) {
    await prisma.recoveryOffer.upsert({
      where: { id: offer.id },
      update: {},
      create: offer,
    });
  }

  // 3. Create Customers & Payments
  const customerCount = 100;
  const paymentCount = 500;
  
  const failureReasons = ['INSUFFICIENT_FUNDS', 'BANK_DECLINED', 'NETWORK_ERROR', 'EXPIRED_CARD', 'AUTHENTICATION_FAILED'];
  const segments = ['Free', 'Basic', 'Premium', 'Enterprise'];
  
  let pIndex = 1;

  for (let i = 1; i <= customerCount; i++) {
    const customerId = `cust-seed-${i}`;
    const randSegments = segments[Math.floor(seededRandom(i) * segments.length)];
    const ltv = Math.floor(seededRandom(i * 2) * 500) + 50;
    
    await prisma.customer.upsert({
      where: { id: customerId },
      update: {},
      create: {
        id: customerId,
        externalRef: `ext-cust-${i}`,
        name: `Synthetic Customer ${i}`,
        email: `customer${i}@synthetic.recoveriq.local`,
        phone: `+1555000${i.toString().padStart(4, '0')}`,
        segment: randSegments,
        lifetimeValue: ltv,
      }
    });

    for (let j = 1; j <= 5; j++) {
      const paymentId = `pay-seed-${pIndex}`;
      const amount = Math.floor(seededRandom(pIndex * 3) * 200) + 10;
      
      const randVal = seededRandom(pIndex * 5);
      let status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'REQUIRES_ACTION' = 'SUCCESS';
      let reason: string | null = null;
      
      if (randVal > 0.8) {
        status = 'FAILED';
        reason = failureReasons[Math.floor(seededRandom(pIndex * 7) * failureReasons.length)];
      } else if (randVal > 0.7) {
        status = 'REQUIRES_ACTION';
      } else if (randVal > 0.6) {
        status = 'PENDING';
      }

      await prisma.payment.upsert({
        where: { id: paymentId },
        update: {},
        create: {
          id: paymentId,
          externalRef: `ext-pay-${pIndex}`,
          customerId: customerId,
          amount: amount,
          currency: 'USD',
          status: status,
          failureReason: reason,
          retryCount: status === 'FAILED' ? Math.floor(seededRandom(pIndex) * 2) : 0,
        }
      });
      pIndex++;
    }
  }

  const cCount = await prisma.customer.count();
  const pCount = await prisma.payment.count();
  const fCount = await prisma.payment.count({ where: { status: 'FAILED' } });
  const sCount = await prisma.payment.count({ where: { status: 'SUCCESS' } });
  const pendCount = await prisma.payment.count({ where: { status: 'PENDING' } });
  const oCount = await prisma.recoveryOffer.count();
  const polCount = await prisma.merchantPolicy.count();

  console.log(`Seed completed:`);
  console.log(`Customers: ${cCount}`);
  console.log(`Payments: ${pCount}`);
  console.log(`Failed payments: ${fCount}`);
  console.log(`Successful payments: ${sCount}`);
  console.log(`Pending payments: ${pendCount}`);
  console.log(`Recovery offers: ${oCount}`);
  console.log(`Merchant policies: ${polCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
