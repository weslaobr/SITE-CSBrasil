const { PrismaClient } = require('@prisma/client');

const regions = [
  'sa-east-1', // São Paulo
  'us-east-1', // N. Virginia
  'us-east-2', // Ohio
  'us-west-1', // N. California
  'us-west-2', // Oregon
  'eu-west-1', // Ireland
  'eu-west-2', // London
  'eu-west-3', // Paris
  'eu-central-1', // Frankfurt
  'ap-southeast-1', // Singapore
  'ap-southeast-2', // Sydney
  'ap-northeast-1', // Tokyo
  'ap-northeast-2', // Seoul
  'ca-central-1', // Canada Central
];

async function testRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const url = `postgres://postgres.qjgmqlhlrzvmilanqldw:ALpndxFObhEupjbK@${host}:6543/postgres?sslmode=require&pgbouncer=true`;

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url,
      },
    },
  });

  try {
    // console.log(`Testing ${region} (${host})...`);
    const count = await prisma.user.count();
    console.log(`\n>>> FOUND IT! Region is ${region}! Host: ${host} <<<`);
    console.log(`Users count: ${count}`);
    return true;
  } catch (err) {
    if (err.message.includes("tenant/user postgres.qjgmqlhlrzvmilanqldw not found")) {
      // Wrong region
      return false;
    } else {
      // Connection timeout or authentication error
      console.log(`Region ${region} failed with error: ${err.message.split('\n')[0]}`);
      return false;
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("Searching for the correct Supabase pooler region...");
  for (const region of regions) {
    const found = await testRegion(region);
    if (found) {
      break;
    }
  }
  console.log("Search finished.");
}

main();
