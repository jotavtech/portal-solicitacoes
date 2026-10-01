import type Database from 'better-sqlite3';
import { hashPassword } from './auth/password.js';

export async function seedDemo(db: Database.Database, enabled: boolean, now = new Date()) {
  if (!enabled) throw new Error('Seed de demonstração precisa ser habilitado explicitamente.');
  if (db.prepare('SELECT name FROM seed_runs WHERE name=?').get('demo-v1')) return;
  const accounts = [
    { username: 'ana', name: 'Ana Oliveira', password: 'Ana-demo-2026!' },
    { username: 'bruno', name: 'Bruno Costa', password: 'Bruno-demo-2026!' },
  ];
  const hashes = await Promise.all(accounts.map((account) => hashPassword(account.password)));
  db.transaction(() => {
    if (db.prepare('SELECT name FROM seed_runs WHERE name=?').get('demo-v1')) return;
    accounts.forEach((account, index) =>
      db
        .prepare(
          'INSERT INTO users(username,name,password_hash) VALUES (?,?,?) ON CONFLICT(username) DO NOTHING',
        )
        .run(account.username, account.name, hashes[index]),
    );
    const ids = accounts.map(
      (account) =>
        (
          db.prepare('SELECT id FROM users WHERE username=?').get(account.username) as {
            id: number;
          }
        ).id,
    );
    const fixtures = [
      [
        'Acesso ao sistema financeiro',
        'Preciso de acesso para consultar os relatórios do departamento.',
        'TI',
        0,
        0,
      ],
      [
        'Atualização do cadastro de benefícios',
        'Solicito atualização das informações do meu benefício de transporte.',
        'RH',
        1,
        1,
      ],
      [
        'Compra de material de escritório',
        'Reposição de cadernos e canetas para a equipe de atendimento.',
        'COMPRAS',
        0,
        0,
      ],
      [
        'Reembolso de deslocamento',
        'Solicito análise do reembolso de deslocamento da visita técnica.',
        'FINANCEIRO',
        1,
        2,
      ],
      [
        'Manutenção do ar-condicionado',
        'O equipamento da sala de reunião está apresentando ruído.',
        'INFRAESTRUTURA',
        0,
        1,
      ],
      [
        'Configuração de estação de trabalho',
        'A nova estação de trabalho precisa de configuração de rede e aplicativos.',
        'TI',
        1,
        2,
      ],
    ] as const;
    fixtures.forEach(([title, description, category, author, steps], index) => {
      const stamp = new Date(now.getTime() - index * 86400000).toISOString();
      const result = db
        .prepare(
          'INSERT INTO requests(title,description,category,requester_id,created_at,updated_at) VALUES (?,?,?,?,?,?)',
        )
        .run(title, description, category, ids[author], stamp, stamp);
      if (steps >= 1)
        db.prepare('UPDATE requests SET status=? WHERE id=?').run(
          'EM_ATENDIMENTO',
          result.lastInsertRowid,
        );
      if (steps >= 2)
        db.prepare('UPDATE requests SET status=? WHERE id=?').run(
          'CONCLUIDO',
          result.lastInsertRowid,
        );
    });
    db.prepare('INSERT INTO seed_runs VALUES (?,?)').run('demo-v1', now.toISOString());
  }).immediate();
}
