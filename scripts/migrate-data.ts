import { PrismaClient } from '@prisma/client';

const SOURCE_URL = "postgresql://csbrasil:%40Nenezinho1995@csbrasil.postgres.uhserver.com:5432/csbrasil?sslmode=disable&search_path=public";
const DEST_URL = "postgresql://postgres:ALpndxFObhEupjbK@db.qjgmqlhlrzvmilanqldw.supabase.co:5432/postgres?sslmode=require&search_path=public";

const sourcePrisma = new PrismaClient({
  datasources: {
    db: {
      url: SOURCE_URL,
    },
  },
});

const destPrisma = new PrismaClient({
  datasources: {
    db: {
      url: DEST_URL,
    },
  },
});

// List of tables in topological (dependency) order
const TABLES_IN_ORDER = [
  // Tier 1: Independent
  'User',
  'Player',
  'ItemPriceBase',
  'VerificationToken',
  'GuildConfig',
  'GlobalMatch',
  'tracker_players',
  'tracker_matches',

  // Tier 2: Directly depending on Tier 1
  'RoleMapping',
  'AuditLogSetting',
  'AutoClearConfig',
  'Account',
  'Session',
  'Crosshair',
  'EvaluationList',
  'Lobby',
  'MapVetoLobby',
  'Match',
  'Stats',
  'Tournament',
  'UserInventoryItem',

  // Tier 3: Depending on Tier 2
  'PlayerEvaluation',
  'LobbyPlayer',
  'TournamentTeam',
  'TournamentMatch',
  'GlobalMatchPlayer',

  // Tier 4: Tracker tables
  'tracker_match_players',
  'tracker_rounds',
  'tracker_weapon_stats',

  // Tier 5: Events depending on rounds
  'tracker_clutch_events',
  'tracker_damage_events',
  'tracker_grenade_events',
  'tracker_kill_events',
];

// Mapping of tables to their serial (autoincrement) column for sequence resetting
const SEQUENCE_TABLES: Record<string, string> = {
  'AuditLogSetting': 'id',
  'AutoClearConfig': 'id',
  'Player': 'id',
  'RoleMapping': 'id',
  'Stats': 'id',
  'tracker_clutch_events': 'clutch_id',
  'tracker_damage_events': 'damage_id',
  'tracker_grenade_events': 'grenade_id',
  'tracker_kill_events': 'kill_id',
  'tracker_players': 'steamid64',
  'tracker_rounds': 'round_id',
  'tracker_weapon_stats': 'id',
};

// Custom SQL queries to bypass Prisma type parsing errors with "Infinity" / "inf" float columns.
// NOTE: "public" prefix is explicitly required on UOL Host for raw queries to resolve correctly.
const CUSTOM_FETCHERS: Record<string, () => Promise<any[]>> = {
  'tracker_match_players': () => sourcePrisma.$queryRawUnsafe(`
    SELECT 
      "match_id",
      "steamid64",
      "team",
      "kills",
      "deaths",
      "assists",
      CASE WHEN "adr"::text IN ('Infinity', '-Infinity', 'NaN', 'inf', '-inf') THEN NULL ELSE "adr" END as "adr",
      CASE WHEN "kast"::text IN ('Infinity', '-Infinity', 'NaN', 'inf', '-inf') THEN NULL ELSE "kast" END as "kast",
      CASE WHEN "rating"::text IN ('Infinity', '-Infinity', 'NaN', 'inf', '-inf') THEN NULL ELSE "rating" END as "rating",
      "hs_count",
      "utility_damage",
      "flash_assists",
      "fk",
      "fd",
      "triples",
      "quads",
      "aces",
      "clutches",
      "trades",
      "enemies_flashed",
      CASE WHEN "total_blind_duration"::text IN ('Infinity', '-Infinity', 'NaN', 'inf', '-inf') THEN NULL ELSE "total_blind_duration" END as "total_blind_duration",
      CASE WHEN "avg_kill_distance"::text IN ('Infinity', '-Infinity', 'NaN', 'inf', '-inf') THEN NULL ELSE "avg_kill_distance" END as "avg_kill_distance",
      CASE WHEN "avg_ttd"::text IN ('Infinity', '-Infinity', 'NaN', 'inf', '-inf') THEN NULL ELSE "avg_ttd" END as "avg_ttd",
      CASE WHEN "utility_damage_roi"::text IN ('Infinity', '-Infinity', 'NaN', 'inf', '-inf') THEN NULL ELSE "utility_damage_roi" END as "utility_damage_roi",
      "he_thrown",
      "flash_thrown",
      "smokes_thrown",
      "molotovs_thrown",
      "elo_change",
      "elo_after",
      CASE WHEN "impact"::text IN ('Infinity', '-Infinity', 'NaN', 'inf', '-inf') THEN NULL ELSE "impact" END as "impact",
      CASE WHEN "impact_rating"::text IN ('Infinity', '-Infinity', 'NaN', 'inf', '-inf') THEN NULL ELSE "impact_rating" END as "impact_rating"
    FROM "public"."tracker_match_players"
  `),
  'tracker_weapon_stats': () => sourcePrisma.$queryRawUnsafe(`
    SELECT
      "id",
      "match_id",
      "steamid64",
      "weapon",
      "kills",
      "headshots",
      "damage",
      CASE WHEN "accuracy"::text IN ('Infinity', '-Infinity', 'NaN', 'inf', '-inf') THEN NULL ELSE "accuracy" END as "accuracy"
    FROM "public"."tracker_weapon_stats"
  `),
  'tracker_grenade_events': () => sourcePrisma.$queryRawUnsafe(`
    SELECT
      "grenade_id",
      "match_id",
      "round_id",
      "tick",
      "steamid64",
      "grenade_type",
      "x",
      "y",
      "z",
      CASE WHEN "blind_duration"::text IN ('Infinity', '-Infinity', 'NaN', 'inf', '-inf') THEN NULL ELSE "blind_duration" END as "blind_duration"
    FROM "public"."tracker_grenade_events"
  `),
  'tracker_kill_events': () => sourcePrisma.$queryRawUnsafe(`
    SELECT
      "kill_id",
      "match_id",
      "round_id",
      "tick",
      "attacker_steamid",
      "victim_steamid",
      "assister_steamid",
      "weapon",
      "is_headshot",
      "is_wallbang",
      "attacker_x",
      "attacker_y",
      "attacker_z",
      "victim_x",
      "victim_y",
      "victim_z",
      CASE WHEN "distance"::text IN ('Infinity', '-Infinity', 'NaN', 'inf', '-inf') THEN NULL ELSE "distance" END as "distance"
    FROM "public"."tracker_kill_events"
  `)
};

async function clearDestination() {
  console.log("\n==========================================");
  console.log("WIPING DESTINATION DATABASE (TRUNCATE CASCADE)");
  console.log("==========================================");
  
  // Truncate tables in reverse order to be safe, though CASCADE handles everything
  const tablesToTruncate = TABLES_IN_ORDER.map(t => `"${t}"`).join(', ');
  try {
    await destPrisma.$executeRawUnsafe(`TRUNCATE TABLE ${tablesToTruncate} CASCADE;`);
    console.log("Destination database successfully truncated!");
  } catch (error: any) {
    console.error("Error during truncation:", error.message);
    throw error;
  }
}

async function migrateTable(tableName: string) {
  console.log(`\n----------------------------------------`);
  console.log(`Migrating table: ${tableName}`);
  console.log(`----------------------------------------`);

  // 1. Fetch count from source
  // @ts-ignore
  const sourceCount = await sourcePrisma[tableName].count();
  console.log(`Source count: ${sourceCount} rows`);

  if (sourceCount === 0) {
    console.log(`No rows to migrate for ${tableName}. Skipping.`);
    return;
  }

  // 2. Fetch all data from source
  console.log(`Fetching data from UOL Host...`);
  let records: any[];
  if (CUSTOM_FETCHERS[tableName]) {
    records = await CUSTOM_FETCHERS[tableName]();
  } else {
    // @ts-ignore
    records = await sourcePrisma[tableName].findMany();
  }
  console.log(`Successfully fetched ${records.length} records.`);

  // 3. Insert data into destination in batches
  const BATCH_SIZE = 2000;
  let inserted = 0;

  console.log(`Inserting data into Supabase in batches of ${BATCH_SIZE}...`);
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    // @ts-ignore
    await destPrisma[tableName].createMany({
      data: batch,
      skipDuplicates: true, // Safety fallback
    });

    inserted += batch.length;
    console.log(`-> Inserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${inserted}/${records.length})`);
  }

  console.log(`Completed data migration for ${tableName}.`);

  // 4. Reset sequences if applicable
  const sequenceCol = SEQUENCE_TABLES[tableName];
  if (sequenceCol) {
    console.log(`Resetting sequence counter for ${tableName}.${sequenceCol}...`);
    try {
      await destPrisma.$executeRawUnsafe(`
        SELECT setval(
          pg_get_serial_sequence('"${tableName}"', '${sequenceCol}'), 
          COALESCE(MAX("${sequenceCol}"), 1)
        ) FROM "${tableName}";
      `);
      console.log(`Sequence reset successfully!`);
    } catch (seqError: any) {
      console.warn(`Warning resetting sequence on ${tableName}: ${seqError.message}`);
    }
  }
}

async function main() {
  console.log("==================================================");
  console.log("STARTING DATABASE MIGRATION: UOL HOST -> SUPABASE");
  console.log("==================================================");

  const startTime = Date.now();

  try {
    // Wipe target first to ensure clean idempotency
    await clearDestination();

    for (const tableName of TABLES_IN_ORDER) {
      await migrateTable(tableName);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log("\n==================================================");
    console.log(`MIGRATION COMPLETED SUCCESSFULLY in ${duration}s!`);
    console.log("==================================================");
  } catch (error) {
    console.error("\nFATAL ERROR DURING MIGRATION:");
    console.error(error);
    process.exit(1);
  } finally {
    await sourcePrisma.$disconnect();
    await destPrisma.$disconnect();
  }
}

main();
