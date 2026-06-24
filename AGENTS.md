# Agent Instructions

You're working inside the **WAT framework** (Workflows, Agents, Tools). This architecture separates concerns so that probabilistic AI handles reasoning while deterministic code handles execution. That separation is what makes this system reliable.

## The WAT Architecture

**Layer 1: Workflows (The Instructions)**
- Markdown SOPs stored in `workflows/`
- Each workflow defines the objective, required inputs, which tools to use, expected outputs, and how to handle edge cases
- Written in plain language, the same way you'd brief someone on your team

**Layer 2: Agents (The Decision-Maker)**
- This is your role. You're responsible for intelligent coordination.
- Read the relevant workflow, run tools in the correct sequence, handle failures gracefully, and ask clarifying questions when needed
- You connect intent to execution without trying to do everything yourself
- Example: If you need to pull data from a website, don't attempt it directly. Read `workflows/scrape_website.md`, figure out the required inputs, then execute `tools/scrape_single_site.ts`

**Layer 3: Tools (The Execution)**
- TypeScript scripts in `tools/` that do the actual work
- API calls, data transformations, file operations, database queries
- Credentials and API keys are stored in `.env` (see `.env.example` for required variables)
- These scripts are consistent, testable, and fast

**Why this matters:** When AI tries to handle every step directly, accuracy drops fast. If each step is 90% accurate, you're down to 59% success after just five steps. By offloading execution to deterministic scripts, you stay focused on orchestration and decision-making where you excel.

## Tools Must Be TypeScript

All tools in `tools/` **must be written in TypeScript** (`.ts`). Do not create Python, Bash, Ruby, or other language scripts for workflow execution.

**Why:**
- One runtime (`tsx` / Node) for every tool — same dependencies, same `.env` loading, same error handling
- Shared helpers live in `tools/lib/` and are importable across tools
- TypeScript catches bad API shapes and refactors before runtime

**Conventions:**
- Entry-point scripts go in `tools/` (e.g. `tools/send_github_activity_email.ts`)
- Reusable logic goes in `tools/lib/` (e.g. `tools/lib/github_activity.ts`)
- Run with: `npm run tool tools/<script>.ts`
- Use `import "dotenv/config"` at the top of entry-point scripts
- Match existing patterns: ESM imports, `.js` extensions in relative import paths

If you're tempted to write a one-off Python script or shell wrapper, write TypeScript instead.

## How to Operate

**1. Look for existing tools first**
Before building anything new, check `tools/` based on what your workflow requires. Only create new scripts when nothing exists for that task.

**2. Learn and adapt when things fail**
When you hit an error:
- Read the full error message and trace
- Fix the script and retest (if it uses paid API calls or credits, check with me before running again)
- Document what you learned in the workflow (rate limits, timing quirks, unexpected behavior)
- Example: You get rate-limited on an API, so you dig into the docs, discover a batch endpoint, refactor the tool to use it, verify it works, then update the workflow so this never happens again

**3. Keep workflows current**
Workflows should evolve as you learn. When you find better methods, discover constraints, or encounter recurring issues, update the workflow. That said, don't create or overwrite workflows without asking unless I explicitly tell you to. These are your instructions and need to be preserved and refined, not tossed after one use.

**4. Keep `.env.example` in sync**
Every project must have a `.env.example` at the repo root. When you add, rename, or remove an environment variable in code, update `.env.example` in the same change — placeholders only, never real secrets. If `.env.example` is missing, create it before finishing the task.

**5. Keep `README.md` in sync**
When you add workflows, tools, setup steps, env vars, or change how the project runs, update `README.md` in the same change so it stays accurate for someone opening the repo cold.

**6. Add a GitHub Actions workflow for every new workflow**
When you create a workflow in `workflows/`, add a matching GitHub Actions file in `.github/workflows/` in the same change. Every workflow action **must** include `workflow_dispatch` so it can be run manually from the Actions tab. The action should run the workflow's entry-point tool (e.g. `npm run tool tools/send_github_activity_email.ts`) and pass required env vars from repository secrets. Document the workflow file and required secrets in the workflow SOP and `README.md`. Do not use secret names starting with `GITHUB_` — GitHub rejects them.

After adding or changing required env vars, **use the GitHub CLI (`gh`) to set the matching repository secrets** — do not leave secret setup as a manual step for the user unless they ask you not to. Read values from the local `.env` (never commit `.env`) and run `gh secret set <NAME> --body "<value>"` for each secret the action needs. Verify with `gh secret list`.

## Vercel AI SDK

When a tool needs LLM reasoning, use the [Vercel AI SDK](https://sdk.vercel.ai/docs) (`ai` + a provider package such as `@ai-sdk/openai`, `@ai-sdk/anthropic`, or `@ai-sdk/google`), not raw API calls. Put AI logic in `tools/lib/`; keep entry scripts thin. Prefer `generateObject` when output feeds downstream code. Model and provider keys via `.env` (per-workflow model env vars with sensible defaults). Prepare data deterministically first; call the model last. Check before re-running paid API calls.

## The Self-Improvement Loop

Every failure is a chance to make the system stronger:
1. Identify what broke
2. Fix the tool
3. Verify the fix works
4. Update the workflow with the new approach
5. Move on with a more robust system

This loop is how the framework improves over time.

## File Structure

**What goes where:**
- **Deliverables**: Final outputs go to cloud services (Google Sheets, Slides, etc.) where I can access them directly
- **Intermediates**: Temporary processing files that can be regenerated

**Directory layout:**
```
.tmp/            # Temporary files (scraped data, intermediate exports). Regenerated as needed.
tools/           # TypeScript scripts for deterministic execution
workflows/       # Markdown SOPs defining what to do and how
.env             # API keys and secrets (gitignored — copy from .env.example)
.env.example     # Documented env var template (committed; placeholders only)
credentials.json, token.json  # Google OAuth (gitignored)
```

**Core principle:** Local files are just for processing. Anything I need to see or use lives in cloud services. Everything in `.tmp/` is disposable.

## Bottom Line

You sit between what I want (workflows) and what actually gets done (tools). Your job is to read instructions, make smart decisions, call the right tools, recover from errors, and keep improving the system as you go.

Stay pragmatic. Stay reliable. Keep learning.