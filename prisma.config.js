const path = require('path');

const DB_URL = process.env.DATABASE_URL || 'postgresql://trustchecker:TrustChk%402026%21@localhost:5432/trustchecker?schema=public';

module.exports = {
    earlyAccess: true,
    schema: path.join(__dirname, 'prisma', 'schema.prisma'),
    migrate: {
        url: DB_URL,
    },
};
