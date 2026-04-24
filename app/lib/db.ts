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
    CREATE TABLE IF NOT EXISTS desafios (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria    TEXT    NOT NULL,
      descricao    TEXT    NOT NULL,
      meta_valor   REAL    NOT NULL,
      inicio       TEXT    NOT NULL,
      fim          TEXT    NOT NULL,
      aceito       INTEGER DEFAULT 0,
      concluido    INTEGER DEFAULT 0
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS objetivos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nome        TEXT    NOT NULL,
      emoji       TEXT    NOT NULL DEFAULT '🎯',
      valor_alvo  REAL    NOT NULL,
      valor_atual REAL    NOT NULL DEFAULT 0,
      prazo       TEXT    NOT NULL,
      criado_em   TEXT    DEFAULT (datetime('now','localtime'))
    );
  `);

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
// Desafios
// ---------------------------------------------------------------------------

export interface Desafio {
  id: number;
  categoria: string;
  descricao: string;
  meta_valor: number;
  inicio: string;
  fim: string;
  aceito: number;
  concluido: number;
}

export async function listarDesafios(): Promise<Desafio[]> {
  const db = await getDb();
  return db.getAllAsync<Desafio>(`SELECT * FROM desafios ORDER BY id DESC LIMIT 10`);
}

export async function inserirDesafio(params: Omit<Desafio, "id">): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync(
    `INSERT INTO desafios (categoria, descricao, meta_valor, inicio, fim, aceito, concluido) VALUES (?,?,?,?,?,?,?)`,
    params.categoria, params.descricao, params.meta_valor, params.inicio, params.fim, params.aceito, params.concluido
  );
  return r.lastInsertRowId;
}

export async function aceitarDesafio(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE desafios SET aceito = 1 WHERE id = ?`, id);
}

export async function verificarConclusaoDesafio(id: number, inicio: string, fim: string, categoria: string, metaValor: number): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(valor), 0) as total FROM despesas
     WHERE categoria = ? AND data >= ? AND data <= ?`,
    categoria, inicio, fim
  );
  const total = row?.total ?? 0;
  const concluido = total <= metaValor ? 1 : 0;
  await db.runAsync(`UPDATE desafios SET concluido = ? WHERE id = ?`, concluido, id);
  return concluido === 1;
}

export async function gastoMedioSemanalPorCategoria(): Promise<Array<{ categoria: string; mediaGasto: number }>> {
  const db = await getDb();
  const agora = new Date();
  // Últimas 4 semanas completas
  const dataLimite = new Date(agora.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  return db.getAllAsync<{ categoria: string; mediaGasto: number }>(
    `SELECT categoria,
            SUM(valor) / 4.0 as mediaGasto
     FROM despesas
     WHERE data >= ? AND categoria NOT IN ('Assinaturas')
     GROUP BY categoria
     HAVING SUM(valor) > 0
     ORDER BY mediaGasto DESC`,
    dataLimite
  );
}

// ---------------------------------------------------------------------------
// Objetivos
// ---------------------------------------------------------------------------

export interface Objetivo {
  id: number;
  nome: string;
  emoji: string;
  valor_alvo: number;
  valor_atual: number;
  prazo: string;
  criado_em: string;
}

export async function listarObjetivos(): Promise<Objetivo[]> {
  const db = await getDb();
  return db.getAllAsync<Objetivo>(`SELECT * FROM objetivos ORDER BY prazo ASC`);
}

export async function inserirObjetivo(params: Omit<Objetivo, "id" | "criado_em">): Promise<number> {
  const db = await getDb();
  const r = await db.runAsync(
    `INSERT INTO objetivos (nome, emoji, valor_alvo, valor_atual, prazo) VALUES (?,?,?,?,?)`,
    params.nome, params.emoji, params.valor_alvo, params.valor_atual, params.prazo
  );
  return r.lastInsertRowId;
}

export async function atualizarObjetivo(params: Pick<Objetivo, "id" | "nome" | "emoji" | "valor_alvo" | "valor_atual" | "prazo">): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE objetivos SET nome=?, emoji=?, valor_alvo=?, valor_atual=?, prazo=? WHERE id=?`,
    params.nome, params.emoji, params.valor_alvo, params.valor_atual, params.prazo, params.id
  );
}

export async function deletarObjetivo(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM objetivos WHERE id=?`, id);
}

// ---------------------------------------------------------------------------
// Análise de padrões
// ---------------------------------------------------------------------------

export interface InsightDados {
  totalPorCategoriaMes: Array<{ mes: string; categoria: string; total: number }>;
  totalPorDiaSemana: Array<{ dow: number; total: number; qtd: number }>;
  assinaturas: Array<{ descricao: string; valor: number }>;
}

export async function buscarDadosInsights(): Promise<InsightDados> {
  const db = await getDb();
  const agora = new Date();

  // Últimos 3 meses completos + mês atual
  const prefixos: string[] = [];
  for (let i = 0; i <= 3; i++) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    prefixos.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const placeholders = prefixos.map(() => "data LIKE ?").join(" OR ");
  const args = prefixos.map((p) => `${p}%`);

  const [porCategoriaMes, porDiaSemana, assinaturas] = await Promise.all([
    // Total por categoria por mês
    db.getAllAsync<{ mes: string; categoria: string; total: number }>(
      `SELECT substr(data,1,7) as mes, categoria, SUM(valor) as total
       FROM despesas WHERE (${placeholders}) GROUP BY mes, categoria`,
      ...args
    ),
    // Total por dia da semana (0=Dom..6=Sab) — SQLite strftime %w
    db.getAllAsync<{ dow: number; total: number; qtd: number }>(
      `SELECT CAST(strftime('%w', data) AS INTEGER) as dow,
              SUM(valor) as total, COUNT(*) as qtd
       FROM despesas WHERE (${placeholders}) GROUP BY dow`,
      ...args
    ),
    // Despesas recorrentes na categoria Assinaturas
    db.getAllAsync<{ descricao: string; valor: number }>(
      `SELECT descricao, AVG(valor) as valor FROM despesas
       WHERE categoria = 'Assinaturas' AND recorrente = 1
       GROUP BY descricao ORDER BY valor DESC`
    ),
  ]);

  return { totalPorCategoriaMes: porCategoriaMes, totalPorDiaSemana: porDiaSemana, assinaturas };
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

export async function mediaGastosMensais(nMeses = 3): Promise<number> {
  const db = await getDb();
  const agora = new Date();
  const prefixos: string[] = [];
  for (let i = 1; i <= nMeses; i++) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    prefixos.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const placeholders = prefixos.map(() => "data LIKE ?").join(" OR ");
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(valor), 0) as total FROM despesas WHERE (${placeholders})`,
    ...prefixos.map((p) => `${p}%`)
  );
  return (row?.total ?? 0) / nMeses;
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
