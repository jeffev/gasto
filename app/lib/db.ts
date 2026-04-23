import * as SQLite from "expo-sqlite";
import { Despesa, Categoria, Orcamento, Entrada, CategoriaEntrada } from "./types";

let db: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("financa.db").then(async (database) => {
      await migrate(database);
      db = database;
      return db;
    });
  }
  return dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS meta_economia (
      id    INTEGER PRIMARY KEY,
      valor REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS despesas (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      descricao     TEXT    NOT NULL,
      valor         REAL    NOT NULL,
      categoria     TEXT    NOT NULL,
      data          TEXT    NOT NULL,
      input_original TEXT,
      recorrente    INTEGER DEFAULT 0,
      criado_em     TEXT    DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS orcamentos (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria TEXT    NOT NULL UNIQUE,
      limite    REAL    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entradas (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      descricao     TEXT    NOT NULL,
      valor         REAL    NOT NULL,
      categoria     TEXT    NOT NULL,
      data          TEXT    NOT NULL,
      recorrente    INTEGER DEFAULT 0,
      criado_em     TEXT    DEFAULT (datetime('now','localtime'))
    );
  `);

  try { await db.execAsync(`ALTER TABLE despesas ADD COLUMN recorrente INTEGER DEFAULT 0`); } catch {}
  try { await db.execAsync(`ALTER TABLE despesas ADD COLUMN pago INTEGER DEFAULT 0`); } catch {}

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS aprendizado (
      id          TEXT PRIMARY KEY,
      concluido   INTEGER DEFAULT 0,
      concluido_em TEXT
    );
  `);
}

// ---------------------------------------------------------------------------
// Inserir despesa
// ---------------------------------------------------------------------------

export async function inserirDespesa(params: {
  descricao: string;
  valor: number;
  categoria: Categoria;
  data: string;
  input_original: string;
  recorrente?: number;
}): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO despesas (descricao, valor, categoria, data, input_original, recorrente)
     VALUES (?, ?, ?, ?, ?, ?)`,
    params.descricao,
    params.valor,
    params.categoria,
    params.data,
    params.input_original,
    params.recorrente ?? 0
  );
  return result.lastInsertRowId;
}

// ---------------------------------------------------------------------------
// Buscar despesas
// ---------------------------------------------------------------------------

export async function listarDespesas(limite = 50): Promise<Despesa[]> {
  const db = await getDb();
  return db.getAllAsync<Despesa>(
    `SELECT * FROM despesas ORDER BY data DESC, criado_em DESC LIMIT ?`,
    limite
  );
}

export async function listarDespesasDoMes(ano: number, mes: number): Promise<Despesa[]> {
  const db = await getDb();
  const prefixo = `${ano}-${String(mes).padStart(2, "0")}`;
  return db.getAllAsync<Despesa>(
    `SELECT * FROM despesas WHERE data LIKE ? ORDER BY data DESC`,
    `${prefixo}%`
  );
}

export async function totalDoMes(ano: number, mes: number): Promise<number> {
  const db = await getDb();
  const prefixo = `${ano}-${String(mes).padStart(2, "0")}`;
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(valor), 0) as total FROM despesas WHERE data LIKE ?`,
    `${prefixo}%`
  );
  return row?.total ?? 0;
}

export async function totalPorCategoria(
  ano: number,
  mes: number
): Promise<Array<{ categoria: string; total: number }>> {
  const db = await getDb();
  const prefixo = `${ano}-${String(mes).padStart(2, "0")}`;
  return db.getAllAsync(
    `SELECT categoria, COALESCE(SUM(valor), 0) as total
     FROM despesas
     WHERE data LIKE ?
     GROUP BY categoria
     ORDER BY total DESC`,
    `${prefixo}%`
  );
}

export async function buscarDespesas(query: string): Promise<Despesa[]> {
  const db = await getDb();
  return db.getAllAsync<Despesa>(
    `SELECT * FROM despesas WHERE descricao LIKE ? OR categoria LIKE ? ORDER BY data DESC, criado_em DESC LIMIT 100`,
    `%${query}%`, `%${query}%`
  );
}

export async function marcarDespesaPaga(id: number, pago: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE despesas SET pago = ? WHERE id = ?`, pago, id);
}

// ---------------------------------------------------------------------------
// Despesas recorrentes
// ---------------------------------------------------------------------------

export async function listarRecorrentes(): Promise<Despesa[]> {
  const db = await getDb();
  return db.getAllAsync<Despesa>(
    `SELECT * FROM despesas WHERE recorrente = 1 ORDER BY categoria`
  );
}

/**
 * Copia despesas recorrentes do mês anterior para o mês atual,
 * se ainda não existirem nele.
 */
export async function gerarRecorrentesDoMes(ano: number, mes: number): Promise<number> {
  const db = await getDb();
  const prefixoAtual = `${ano}-${String(mes).padStart(2, "0")}`;

  const mesAnt = mes === 1 ? 12 : mes - 1;
  const anoAnt = mes === 1 ? ano - 1 : ano;
  const prefixoAnt = `${anoAnt}-${String(mesAnt).padStart(2, "0")}`;

  // Recorrentes do mês anterior
  const recorrentes = await db.getAllAsync<Despesa>(
    `SELECT * FROM despesas WHERE recorrente = 1 AND data LIKE ?`,
    `${prefixoAnt}%`
  );

  let geradas = 0;
  for (const d of recorrentes) {
    // Verifica se já existe uma despesa recorrente com mesma descrição/categoria no mês atual
    const jaExiste = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) as n FROM despesas WHERE recorrente = 1 AND categoria = ? AND descricao = ? AND data LIKE ?`,
      d.categoria, d.descricao, `${prefixoAtual}%`
    );
    if (!jaExiste || jaExiste.n === 0) {
      const novaData = `${prefixoAtual}-${d.data.slice(8, 10)}`;
      await db.runAsync(
        `INSERT INTO despesas (descricao, valor, categoria, data, input_original, recorrente)
         VALUES (?, ?, ?, ?, ?, 1)`,
        d.descricao, d.valor, d.categoria, novaData, d.input_original ?? d.descricao
      );
      geradas++;
    }
  }
  return geradas;
}

// ---------------------------------------------------------------------------
// Atualizar despesa
// ---------------------------------------------------------------------------

export async function atualizarDespesa(params: {
  id: number;
  descricao: string;
  valor: number;
  categoria: Categoria;
  data: string;
  recorrente: number;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE despesas SET descricao = ?, valor = ?, categoria = ?, data = ?, recorrente = ? WHERE id = ?`,
    params.descricao,
    params.valor,
    params.categoria,
    params.data,
    params.recorrente,
    params.id
  );
}

// ---------------------------------------------------------------------------
// Deletar despesa
// ---------------------------------------------------------------------------

export async function deletarDespesa(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM despesas WHERE id = ?`, id);
}

// ---------------------------------------------------------------------------
// Orçamentos
// ---------------------------------------------------------------------------

export async function listarOrcamentos(): Promise<Orcamento[]> {
  const db = await getDb();
  return db.getAllAsync<Orcamento>(`SELECT * FROM orcamentos ORDER BY categoria`);
}

export async function salvarOrcamento(categoria: Categoria, limite: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO orcamentos (categoria, limite) VALUES (?, ?)
     ON CONFLICT(categoria) DO UPDATE SET limite = excluded.limite`,
    categoria, limite
  );
}

export async function deletarOrcamento(categoria: Categoria): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM orcamentos WHERE categoria = ?`, categoria);
}

export async function buscarOrcamento(categoria: Categoria): Promise<Orcamento | null> {
  const db = await getDb();
  return db.getFirstAsync<Orcamento>(
    `SELECT * FROM orcamentos WHERE categoria = ?`, categoria
  ) ?? null;
}

// ---------------------------------------------------------------------------
// Entradas
// ---------------------------------------------------------------------------

export async function inserirEntrada(params: {
  descricao: string;
  valor: number;
  categoria: CategoriaEntrada;
  data: string;
  recorrente?: number;
}): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO entradas (descricao, valor, categoria, data, recorrente)
     VALUES (?, ?, ?, ?, ?)`,
    params.descricao, params.valor, params.categoria, params.data, params.recorrente ?? 0
  );
  return result.lastInsertRowId;
}

export async function listarEntradas(limite = 50): Promise<Entrada[]> {
  const db = await getDb();
  return db.getAllAsync<Entrada>(
    `SELECT * FROM entradas ORDER BY data DESC, criado_em DESC LIMIT ?`, limite
  );
}

export async function listarEntradasDoMes(ano: number, mes: number): Promise<Entrada[]> {
  const db = await getDb();
  const prefixo = `${ano}-${String(mes).padStart(2, "0")}`;
  return db.getAllAsync<Entrada>(
    `SELECT * FROM entradas WHERE data LIKE ? ORDER BY data DESC`, `${prefixo}%`
  );
}

export async function totalEntradasDoMes(ano: number, mes: number): Promise<number> {
  const db = await getDb();
  const prefixo = `${ano}-${String(mes).padStart(2, "0")}`;
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(valor), 0) as total FROM entradas WHERE data LIKE ?`, `${prefixo}%`
  );
  return row?.total ?? 0;
}

export async function atualizarEntrada(params: {
  id: number;
  descricao: string;
  valor: number;
  categoria: CategoriaEntrada;
  data: string;
  recorrente: number;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE entradas SET descricao=?, valor=?, categoria=?, data=?, recorrente=? WHERE id=?`,
    params.descricao, params.valor, params.categoria, params.data, params.recorrente, params.id
  );
}

export async function deletarEntrada(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM entradas WHERE id = ?`, id);
}

// ---------------------------------------------------------------------------
// Configurações gerais
// ---------------------------------------------------------------------------

export async function getConfig(chave: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ valor: string }>(
    `SELECT valor FROM configuracoes WHERE chave = ?`, chave
  );
  return row?.valor ?? null;
}

export async function setConfig(chave: string, valor: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO configuracoes (chave, valor) VALUES (?, ?)
     ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor`,
    chave, valor
  );
}

// ---------------------------------------------------------------------------
// Meta de economia
// ---------------------------------------------------------------------------

export async function buscarMeta(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ valor: number }>(
    `SELECT valor FROM meta_economia WHERE id = 1`
  );
  return row?.valor ?? 0;
}

export async function salvarMeta(valor: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO meta_economia (id, valor) VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET valor = excluded.valor`,
    valor
  );
}

export async function listarRecorrentesParaProximoMes(): Promise<{ despesas: Despesa[]; entradas: Entrada[] }> {
  const db = await getDb();
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth() + 1;
  const prefixo = `${ano}-${String(mes).padStart(2, "0")}`;
  const [despesas, entradas] = await Promise.all([
    db.getAllAsync<Despesa>(`SELECT * FROM despesas WHERE recorrente = 1 AND data LIKE ? ORDER BY categoria`, `${prefixo}%`),
    db.getAllAsync<Entrada>(`SELECT * FROM entradas WHERE recorrente = 1 AND data LIKE ? ORDER BY categoria`, `${prefixo}%`),
  ]);
  return { despesas, entradas };
}

// ---------------------------------------------------------------------------
// Aprendizado
// ---------------------------------------------------------------------------

export async function marcarPilulaLida(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO aprendizado (id, concluido, concluido_em) VALUES (?, 1, datetime('now','localtime'))
     ON CONFLICT(id) DO UPDATE SET concluido = 1, concluido_em = excluded.concluido_em`,
    id
  );
}

export async function listarPilulasLidas(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string }>(
    `SELECT id FROM aprendizado WHERE concluido = 1`
  );
  return new Set(rows.map((r) => r.id));
}

export async function gerarEntradasRecorrentesDoMes(ano: number, mes: number): Promise<number> {
  const db = await getDb();
  const prefixoAtual = `${ano}-${String(mes).padStart(2, "0")}`;
  const mesAnt = mes === 1 ? 12 : mes - 1;
  const anoAnt = mes === 1 ? ano - 1 : ano;
  const prefixoAnt = `${anoAnt}-${String(mesAnt).padStart(2, "0")}`;

  const recorrentes = await db.getAllAsync<Entrada>(
    `SELECT * FROM entradas WHERE recorrente = 1 AND data LIKE ?`, `${prefixoAnt}%`
  );

  let geradas = 0;
  for (const e of recorrentes) {
    const jaExiste = await db.getFirstAsync<{ n: number }>(
      `SELECT COUNT(*) as n FROM entradas WHERE recorrente=1 AND categoria=? AND descricao=? AND data LIKE ?`,
      e.categoria, e.descricao, `${prefixoAtual}%`
    );
    if (!jaExiste || jaExiste.n === 0) {
      const novaData = `${prefixoAtual}-${e.data.slice(8, 10)}`;
      await db.runAsync(
        `INSERT INTO entradas (descricao, valor, categoria, data, recorrente) VALUES (?,?,?,?,1)`,
        e.descricao, e.valor, e.categoria, novaData
      );
      geradas++;
    }
  }
  return geradas;
}
