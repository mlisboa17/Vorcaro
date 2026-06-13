const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const stdout = execSync('npx prisma migrate diff --from-schema-datamodel prisma/schema.old.prisma --to-schema-datamodel prisma/schema.prisma --script', { encoding: 'utf-8' });

const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const migrationName = 'add_ofx_import_deduplication';
const dir = path.join(__dirname, 'prisma', 'migrations', `${timestamp}_${migrationName}`);

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'migration.sql'), stdout, 'utf-8');

console.log(`Generated migration at ${dir}/migration.sql`);
