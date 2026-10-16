# IntelliMail Platform

An **AI mail platform** web app — messaging + agent assistance over email, built with
Next.js, LangChain/LangGraph, and the OpenAI Agents SDK. Backed by Cloudflare D1 (SQLite)
through a Next.js server handler for email threads, drafts, and agent tool calls.

## Features

- Mail-style UI (shadcn/Radix based)
- Agent tools and graph-driven assistant flows (LangGraph)
- OpenAI Agents SDK for agent runs
- Cloudflare D1 (SQLite) persistence + miniflare local emulation
- Deploy via Vercel / Cloudflare (scripts incl.)
- Seed and migrations scripts under `scripts/`

## Tech stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, Radix/shadcn UI
- **AI:** LangChain (core/agents), OpenRouter, OpenAI Agents SDK
- **Data:** Cloudflare D1 (SQLite), libsql client, drizzle-like migrations
- **Infra:** Cloudflare Workers/OpenNext, Vercel

## Getting started

```bash
npm install   # or pnpm/yarn
npm run dev   # or: npm run seed (after setting env)
```

Configure env (`.env.local`):

```ini
OPENAI_API_KEY=
OPENROUTER_API_KEY=
AGENTMAIL_API_KEY=
AGENTMAIL_INBOX_ID=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_D1_TOKEN=
CLOUDFLARE_DATABASE_ID=
```

Then deploy via Cloudflare / Vercel following `scripts/deploy-vercel-no-git.mjs`.

## License

Personal / experimental project.
