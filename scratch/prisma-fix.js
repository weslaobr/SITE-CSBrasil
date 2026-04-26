const { Client } = require('pg');

async function main() {
    const client = new Client({
        connectionString: "postgresql://csbrasil:%40Nenezinho1995@csbrasil.postgres.uhserver.com:5432/csbrasil?sslmode=disable"
    });

    try {
        await client.connect();
        console.log("Connected to PostgreSQL");

        // Create table manually
        const query = `
            CREATE TABLE IF NOT EXISTS "Crosshair" (
                "id" TEXT NOT NULL,
                "userId" TEXT NOT NULL,
                "name" TEXT NOT NULL,
                "code" TEXT NOT NULL,
                "description" TEXT,
                "isPublic" BOOLEAN NOT NULL DEFAULT true,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT "Crosshair_pkey" PRIMARY KEY ("id")
            );

            -- Add foreign key if not exists
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crosshair_userid_fkey') THEN
                    ALTER TABLE "Crosshair" ADD CONSTRAINT "crosshair_userid_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END
            $$;
        `;

        await client.query(query);
        console.log("Table 'Crosshair' created successfully!");
    } catch (err) {
        console.error("Error creating table:", err);
    } finally {
        await client.end();
    }
}

main();
