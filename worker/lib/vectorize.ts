import { embedTexts, EMBEDDING_MODEL } from './ai';

const BATCH_SIZE = 50;

// Upsert feedback embeddings into Vectorize; record linkage in D1
export async function upsertFeedbackVectors(
  ai: Ai,
  vectorize: VectorizeIndex,
  db: D1Database,
  feedbackItems: Array<{ id: string; source: string; category: string; text: string }>
): Promise<void> {
  // Only process items not yet embedded
  const existingResult = await db
    .prepare(`SELECT feedback_id FROM feedback_embeddings WHERE feedback_id IN (${feedbackItems.map(() => '?').join(',')})`)
    .bind(...feedbackItems.map((f) => f.id))
    .all();
  const existingIds = new Set((existingResult.results as any[]).map((r) => r.feedback_id));
  const toEmbed = feedbackItems.filter((f) => !existingIds.has(f.id));

  if (toEmbed.length === 0) return;

  for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
    const batch = toEmbed.slice(i, i + BATCH_SIZE);
    const embeddings = await embedTexts(ai, batch.map((f) => f.text));

    const vectors = batch.map((f, j) => ({
      id: f.id,
      values: embeddings[j],
      metadata: { source: f.source, category: f.category },
    }));
    await vectorize.upsert(vectors);

    const now = new Date().toISOString();
    const stmts = batch.map((f) =>
      db
        .prepare(
          `INSERT OR REPLACE INTO feedback_embeddings (feedback_id,vector_id,embedding_model,created_at) VALUES (?,?,?,?)`
        )
        .bind(f.id, f.id, EMBEDDING_MODEL, now)
    );
    await db.batch(stmts);
  }
}

// Semantic search: embed the query then find nearest feedback IDs
export async function semanticSearch(
  ai: Ai,
  vectorize: VectorizeIndex,
  query: string,
  topK = 20
): Promise<string[]> {
  const [[embedding]] = await Promise.all([embedTexts(ai, [query])]);
  const result = await vectorize.query(embedding, { topK });
  return (result.matches || []).map((m: any) => m.id as string);
}
