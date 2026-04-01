export const EMBEDDING_MODEL = '@cf/baai/bge-base-en-v1.5';
export const LLM_MODEL = '@cf/meta/llama-3.1-8b-instruct';

// Generate embeddings for a batch of texts (384-dim, matches Vectorize index)
export async function embedTexts(ai: Ai, texts: string[]): Promise<number[][]> {
  const result = await ai.run(EMBEDDING_MODEL as any, { text: texts } as any) as any;
  return result.data as number[][];
}

// Score sentiment for a single feedback text
export async function scoreSentiment(
  ai: Ai,
  text: string
): Promise<{ label: string; score: number }> {
  const result = await ai.run(LLM_MODEL as any, {
    messages: [
      {
        role: 'system',
        content:
          'Return ONLY valid JSON: {"label":"positive"|"negative"|"neutral"|"mixed","score":float from -1.0 to 1.0}. No prose.',
      },
      { role: 'user', content: `Analyze sentiment: ${text}` },
    ],
    max_tokens: 60,
  } as any) as any;

  try {
    const raw = (result.response as string).trim();
    const match = raw.match(/\{.*\}/s);
    if (match) return JSON.parse(match[0]);
  } catch (_) {}
  return { label: 'neutral', score: 0 };
}

export interface ExtractedInsight {
  title: string;
  category: 'feature_request' | 'bug' | 'praise' | 'complaint' | 'question';
  urgency_score: number;
  value_score: number;
  sentiment_score: number;
  sentiment_label: string;
  topics: Array<{ label: string; count: number }>;
  urgency_factors: Record<string, number>;
  value_factors: Record<string, number>;
  related_feedback_ids: string[];
}

// Extract themes and score them from a batch of feedback texts
export async function extractInsights(
  ai: Ai,
  feedbackItems: Array<{ id: string; source: string; text: string }>,
  prompt: string,
  insightCount: number
): Promise<ExtractedInsight[]> {
  const feedbackBlock = feedbackItems
    .map((f) => `[ID:${f.id}][${f.source}] ${f.text}`)
    .join('\n---\n');

  const systemPrompt = `You are a senior product analyst. Extract the top ${insightCount} themes from the feedback below.

Return ONLY valid JSON in this exact shape:
{
  "insights": [
    {
      "title": "string",
      "category": "feature_request"|"bug"|"praise"|"complaint"|"question",
      "urgency_score": 0-100,
      "value_score": 0-100,
      "sentiment_score": -1.0 to 1.0,
      "sentiment_label": "positive"|"negative"|"neutral"|"mixed",
      "topics": [{"label":"string","count":number}],
      "urgency_factors": {"frequency_velocity":0-100,"source_diversity":0-100,"sentiment_intensity":0-100,"keyword_signals":0-100,"event_correlation":0-100},
      "value_factors": {"impact_breadth":0-100,"segment_weight":0-100,"revenue_keywords":0-100,"effort_estimate":0-100,"unique_author_ratio":0-100},
      "related_feedback_ids": ["id1","id2"]
    }
  ]
}

Scoring guidance:
- urgency_score: frequency velocity, source diversity, sentiment intensity, keyword signals ("blocked","P0","outage","regression"), event correlation
- value_score: impact breadth, segment weight, revenue keywords ("contract","renewal","enterprise","churn"), effort estimate, unique author ratio`;

  const isStructuredContext = prompt.trim().startsWith('{');
  const promptBlock = isStructuredContext
    ? `Analysis context:\n${prompt}`
    : `Prompt: ${prompt}`;

  const result = await ai.run(LLM_MODEL as any, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${promptBlock}\n\nFeedback:\n${feedbackBlock}` },
    ],
    max_tokens: 4096,
  } as any) as any;

  try {
    const raw = (result.response as string).trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return (parsed.insights || []) as ExtractedInsight[];
    }
  } catch (_) {}
  return [];
}
