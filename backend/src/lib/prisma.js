import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// DATABASE_URL must point at Supabase's connection pooler (port 6543,
// ?pgbouncer=true), not the direct connection (port 5432). Each Vercel
// serverless instance opens its own pool here — against the direct
// connection that exhausts Supabase's connection limit under any
// concurrent load, and requests just hang waiting for a free connection
// until the function times out. `max: 1` keeps each instance's own
// footprint on the pooler minimal, since Vercel can spin up many
// instances concurrently.
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
