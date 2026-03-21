const { Client } = require('pg');
const client = new Client({
  connectionString: "postgresql://csbrasil:%40Nenezinho1995@csbrasil.postgres.uhserver.com:5432/csbrasil?sslmode=disable"
});

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully");
    
    const res = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name;
    `);
    
    console.log("Tables found:");
    console.table(res.rows);
    
    const schemas = await client.query(`SELECT schema_name FROM information_schema.schemata;`);
    console.log("Schemas found:");
    console.table(schemas.rows);
  } catch (err) {
    console.error("Error connecting or querying:", err);
  } finally {
    await client.end();
  }
}

run();
