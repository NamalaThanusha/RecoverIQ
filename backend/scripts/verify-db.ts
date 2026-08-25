import { prisma } from '../src/config/prisma';

async function main() {
  console.log('Verifying Database Connection...');
  
  try {
    const cCount = await prisma.customer.count();
    const pCount = await prisma.payment.count();
    const polCount = await prisma.merchantPolicy.count();

    console.log('Database connected successfully!');
    console.log(`Verified Customers: ${cCount}`);
    console.log(`Verified Payments: ${pCount}`);
    console.log(`Verified Policies: ${polCount}`);
  } catch (error) {
    console.error('Database verification failed:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
