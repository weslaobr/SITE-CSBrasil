const { PrismaClient } = require('@prisma/client');

// Connect to the Supabase database using the environment variable (currently set to Supabase in .env)
const prisma = new PrismaClient();

async function main() {
  console.log("==========================================");
  console.log("ENABLING ROW LEVEL SECURITY (RLS) ON ALL TABLES");
  console.log("==========================================");

  try {
    // Dynamic PL/pgSQL block to find all public tables and enable RLS
    await prisma.$executeRawUnsafe(`
      DO $$ 
      DECLARE 
          r RECORD;
      BEGIN
          FOR r IN 
              SELECT table_name 
              FROM information_schema.tables 
              WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
          LOOP
              EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.table_name);
          END LOOP;
      END $$;
    `);
    
    console.log("Successfully enabled RLS on all public tables!");
  } catch (error) {
    console.error("Failed to enable RLS:", error);
  }
}

main().finally(() => prisma.$disconnect());
