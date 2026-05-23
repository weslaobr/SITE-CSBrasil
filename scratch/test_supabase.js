const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:ALpndxFObhEupjbK@db.qjgmqlhlrzvmilanqldw.supabase.co:5432/postgres?sslmode=require"
  });

  try {
    console.log("Connecting to Supabase...");
    await client.connect();
    console.log("Connected successfully!");
    const res = await client.query("SELECT version();");
    console.log("Version:", res.rows[0].version);
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await client.end();
  }
}

main();
