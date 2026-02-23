import path from 'node:path';
import { defineConfig } from 'prisma/config';

const DB_URL = process.env.DATABASE_URL ?? 'postgresql://trustchecker:TrustChk%402026%21@localhost:5432/trustchecker?schema=public';

export default defineConfig({
    earlyAccess: true,
    schema: path.join(__dirname, 'prisma', 'schema.prisma'),

    migrate: {
        url: DB_URL,
    },
});
