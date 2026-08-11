const createTableSql = `
  CREATE TABLE IF NOT EXISTS pageviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    referrer TEXT,
    country TEXT,
    language TEXT,
    user_agent TEXT,
    created_at INTEGER NOT NULL
  )
`;

const createDateIndexSql = `
  CREATE INDEX IF NOT EXISTS idx_pageviews_created_at
  ON pageviews(created_at)
`;

async function initialize(db: D1Database) {
  await db.batch([
    db.prepare(createTableSql),
    db.prepare(createDateIndexSql),
  ]);
}

export async function recordPageview(
  db: D1Database,
  input: {
    path: string;
    referrer: string | null;
    country: string | null;
    language: string | null;
    userAgent: string | null;
  },
) {
  await initialize(db);
  await db
    .prepare(
      `INSERT INTO pageviews
        (path, referrer, country, language, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.path.slice(0, 512),
      input.referrer?.slice(0, 512) ?? null,
      input.country?.slice(0, 8) ?? null,
      input.language?.slice(0, 64) ?? null,
      input.userAgent?.slice(0, 512) ?? null,
      Date.now(),
    )
    .run();
}

export async function pageviewStats(db: D1Database) {
  await initialize(db);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const result = await db
    .prepare(
      `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS last_seven_days
       FROM pageviews`,
    )
    .bind(sevenDaysAgo)
    .first<{ total: number; last_seven_days: number }>();

  return {
    total: Number(result?.total ?? 0),
    lastSevenDays: Number(result?.last_seven_days ?? 0),
  };
}
