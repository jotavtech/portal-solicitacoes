import type Database from 'better-sqlite3';
import { requestSchema, dashboardSchema, type RequestInput } from '@portal/contracts';
import { dateBoundary, type Filters } from './filters.js';

type RequestRow = {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
  requester_id: number;
  username: string;
  name: string;
};
const joined = 'SELECT r.*, u.username, u.name FROM requests r JOIN users u ON u.id=r.requester_id';
function publicRequest(row: RequestRow) {
  return requestSchema.parse({
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    requester: { id: row.requester_id, username: row.username, name: row.name },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}
export class RequestRepository {
  constructor(private db: Database.Database) {}
  find(id: number) {
    const row = this.db.prepare(`${joined} WHERE r.id=?`).get(id) as RequestRow | undefined;
    return row ? publicRequest(row) : undefined;
  }
  create(input: RequestInput, author: number, stamp: string) {
    const result = this.db
      .prepare(
        'INSERT INTO requests(title,description,category,requester_id,created_at,updated_at) VALUES (?,?,?,?,?,?)',
      )
      .run(input.title, input.description, input.category, author, stamp, stamp);
    return this.find(Number(result.lastInsertRowid))!;
  }
  updateOpen(id: number, author: number, input: RequestInput, stamp: string) {
    return (
      this.db
        .prepare(
          "UPDATE requests SET title=?,description=?,category=?,updated_at=? WHERE id=? AND requester_id=? AND status='ABERTO'",
        )
        .run(input.title, input.description, input.category, stamp, id, author).changes > 0
    );
  }
  deleteOpen(id: number, author: number) {
    return (
      this.db
        .prepare("DELETE FROM requests WHERE id=? AND requester_id=? AND status='ABERTO'")
        .run(id, author).changes > 0
    );
  }
  advance(id: number, from: string, to: string, stamp: string) {
    return (
      this.db
        .prepare('UPDATE requests SET status=?,updated_at=? WHERE id=? AND status=?')
        .run(to, stamp, id, from).changes > 0
    );
  }
  list(filters: Filters, timeZone: string) {
    const where: string[] = [],
      params: (string | number)[] = [];
    if (filters.q) {
      where.push("r.title LIKE ? ESCAPE '\\'");
      params.push(`%${filters.q.replace(/[\\%_]/g, '\\$&')}%`);
    }
    if (filters.category) {
      where.push('r.category=?');
      params.push(filters.category);
    }
    if (filters.status) {
      where.push('r.status=?');
      params.push(filters.status);
    }
    if (filters.from) {
      where.push('r.created_at>=?');
      params.push(dateBoundary(filters.from, timeZone));
    }
    if (filters.to) {
      where.push('r.created_at<?');
      params.push(dateBoundary(filters.to, timeZone, true));
    }
    const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
    return this.db.transaction(() => {
      const total = (
        this.db.prepare(`SELECT count(*) total FROM requests r${clause}`).get(...params) as {
          total: number;
        }
      ).total;
      // Limita offset à faixa segura sem permitir overflow na multiplicação.
      const offset = Math.min(Number.MAX_SAFE_INTEGER, (filters.page - 1) * filters.pageSize);
      const rows = this.db
        .prepare(`${joined}${clause} ORDER BY r.created_at DESC,r.id DESC LIMIT ? OFFSET ?`)
        .all(...params, filters.pageSize, offset) as RequestRow[];
      return {
        items: rows.map(publicRequest),
        page: filters.page,
        pageSize: filters.pageSize,
        total,
      };
    })();
  }
  dashboard() {
    return dashboardSchema.parse(
      this.db
        .prepare(
          `SELECT count(*) total, coalesce(sum(status='ABERTO'),0) open,
      coalesce(sum(status='EM_ATENDIMENTO'),0) inProgress, coalesce(sum(status='CONCLUIDO'),0) completed FROM requests`,
        )
        .get(),
    );
  }
}
