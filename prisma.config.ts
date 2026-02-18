import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
    earlyAccess: true,
    schema: path.join(__dirname, 'prisma', 'schema.prisma'),

    migrate: {
        url: process.env.DATABASE_URL ?? 'postgresql://trustchecker:trustchecker_dev_2026@localhost:5432/trustchecker?schema=public',
    },
});
