# PM Feedback

PM Feedback is a small Cloudflare-native product for turning raw customer feedback into useful product direction. It starts with seed data, then lets you explore feedback, generate insights, and review analysis from a simple dashboard.

## What it does

- **Data**: a raw feedback view backed by D1. Right now the app ships with seed data for demos and testing.
- **Insights**: Workers AI compiles related feedback into higher-level insight themes, groups similar items with vector search, and sorts them by urgency, value, sentiment, and related user count.
- **Surveys**: each insight can generate a customer survey so PMs can go deeper and hear directly from users.
- **Analysis**: trend charts, customer segmentation, and event correlation help you understand what is happening, who is reporting it, and when it changed.
- **RAG search**: Workers AI and Vectorize work together so the app can ground responses in the underlying feedback data.
- **Events**: event correlation is included as a direction for grounding feedback in real product launches and incidents; not fully complete since we're using demo data.

## Cloudflare stack

- **D1** for app data and analysis storage
- **Workers AI** for insight generation, survey generation, and text analysis
- **Vectorize** for semantic grouping and retrieval
- **Workflows** for asynchronous analysis runs
- **Workers Assets** for serving the React app

## Architecture

- **Frontend (React + Vite)** calls `/api/*` for feedback, insights, analysis, and surveys.
- **Cloudflare Worker API** is the single backend entry point and handles routing + orchestration.
- **D1** stores feedback, generated insights, run metadata, and analysis aggregates.
- **Workers AI** turns filtered D1 feedback into grouped insights, scores, and surveys.
- **Vectorize** provides semantic retrieval for grounded Q&A and similar-issue grouping.

Flow:

`User action -> Worker API -> D1 query/filter -> Workers AI (+ Vectorize when needed) -> D1 persist -> UI refresh`

## Local development

```bash
npm install
npm run dev:worker
```

## Data commands

```bash
npm run db:migrate:local
npm run db:seed:local
npm run deploy
```
