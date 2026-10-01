import { openDatabase } from './database.js';
import { loadConfig } from './config.js';
import { seedDemo } from './seed.js';
const command = process.argv[2],
  config = loadConfig();
if (command !== 'migrate' && command !== 'seed') throw new Error('Use migrate ou seed.');
const db = openDatabase(config.DATABASE_PATH);
try {
  if (command === 'seed') {
    if (config.NODE_ENV === 'production')
      throw new Error('Seed público de demonstração desabilitado em produção.');
    await seedDemo(db, config.DEMO_SEED_ENABLED || process.argv.includes('--demo'));
    console.log('Seed de demonstração aplicado. Credenciais públicas de teste no README.');
  } else console.log('Migrations aplicadas; dados existentes preservados.');
} finally {
  db.close();
}
