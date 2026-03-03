---
name: ralph
description: >-
  Autonomous task loop that extracts tasks from PRD or accepts manual task lists,
  then executes them one-by-one with real-time monitoring, quality verification
  (typecheck/lint/test), and a completion report. Use this skill when the user
  says "ralph", "ralph loop", "자율 실행", "태스크 루프", "PRD 실행", "반복 구현",
  or wants to run multiple tasks autonomously with progress tracking. Also trigger
  when the user mentions running tasks from a PRD, batch execution, or iterative
  implementation loops.
argument-hint: "[<prd-path> | --tasks 'task1; task2; task3'] [--max N] [--mode agent|cli] [--dry-run]"
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
  - TaskCreate
  - TaskUpdate
  - TaskList
---

# Ralph Loop — Autonomous Task Execution Skill

Ralph Loop executes a list of development tasks one at a time, verifying each
before proceeding. The key principle: **one task per iteration, fully verified**.

## Arguments

`$ARGUMENTS` is parsed as follows:

| Argument | Default | Description |
|----------|---------|-------------|
| First positional | `PRD.md` | Path to PRD file (markdown with `- [ ]` checkboxes) |
| `--tasks "t1; t2; t3"` | (none) | Manual task list, semicolon-separated. Overrides PRD |
| `--max N` | `10` | Maximum iterations |
| `--mode agent\|cli` | `agent` | Execution mode: `agent` (subagent) or `cli` (claude -p) |
| `--dry-run` | false | Show extracted tasks without executing |
| `--skip-verify` | false | Skip typecheck/lint/test (faster, less safe) |
| `--context "file1 file2"` | (none) | Additional context files for the worker to read |

## Execution Flow

### Phase 1: Setup

1. **Parse arguments** from `$ARGUMENTS`
2. **Extract task list**:
   - If `--tasks` provided: split by `;` and trim
   - Otherwise: read PRD file, extract all `- [ ]` items in order
3. **Validate**:
   - At least 1 incomplete task exists
   - Project has `bun` and expected scripts (`typecheck`, `lint`)
   - If `--mode cli`: verify `claude` CLI is available
4. **Show plan** to user:
   ```
   Ralph Loop Plan
   ═══════════════════════════════════════
   Source: PRD.md (or --tasks)
   Tasks:  N incomplete
   Mode:   agent (subagent) / cli (claude -p)
   Max:    10 iterations
   Verify: typecheck + lint + test
   ═══════════════════════════════════════
   1. [ ] Task description...
   2. [ ] Task description...
   ...
   ```
5. **If `--dry-run`**: stop here and show the plan only
6. **Initialize tracking**:
   - Create `scripts/ralph/progress.md` if not exists (append-only log)
   - Create a TaskCreate item for the overall Ralph Loop session

### Phase 2: Task Loop

For each incomplete task (up to `--max`):

#### 2a. Extract Current Task

Read the PRD file fresh each iteration and pick the **first** `- [ ]` item.
This is critical — do NOT batch tasks. Extract exactly one.

Parse the task to get:
- **Task ID**: e.g., `P1-1`, extracted from the line
- **Task description**: the text after the checkbox
- **Design reference**: look for links or section references in the task line

#### 2b. Build Worker Prompt

Construct a focused prompt for the worker that contains ONLY:
- The single task to implement
- Project conventions (from CLAUDE.md)
- Design reference (if specified in `--context` or found in task line)
- Verification commands to run
- Commit format

The prompt template (adapt to project):

```
You are implementing exactly ONE task for this project.

## Task
{task_description}

## Project Context
- Runtime: {detected from package.json}
- Structure: {detected from directory layout}
- Conventions: {key points from CLAUDE.md}

## Design Reference
{content from design doc if found, or "No design doc specified"}

## Implementation Rules
1. Implement ONLY the task above. Nothing else.
2. Follow existing code patterns — read similar files first.
3. Run quality checks before committing:
   {verification_commands}
4. Commit with format: {commit_format}
5. Do NOT modify unrelated files.
6. Do NOT implement other tasks you see in PRD.

## After Implementation
Reply with a structured summary:
<result>
  <status>success|partial|failed</status>
  <files_changed>file1.ts, file2.ts</files_changed>
  <tests_added>N</tests_added>
  <commit_hash>abc1234</commit_hash>
  <notes>Any important observations</notes>
</result>
```

#### 2c. Execute Task

**Agent mode** (default):
```
Use Agent tool with subagent_type="general-purpose"
- prompt: the constructed worker prompt
- Run in foreground (need results before continuing)
```

**CLI mode**:
```bash
# Write prompt to temp file
echo "$WORKER_PROMPT" > /tmp/ralph-task-prompt.md

# Execute with claude -p
claude -p "$(cat /tmp/ralph-task-prompt.md)" \
  --allowedTools "Edit,Bash,Read,Write,Glob,Grep" \
  2>&1 | tee /tmp/ralph-task-output.txt
```

#### 2d. Monitor & Collect Results

After the worker completes:
1. Parse the `<result>` block from output
2. If no structured result, infer status from:
   - Exit code (cli mode)
   - Agent return message
   - Git diff (any new commits?)

Display real-time status:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Iteration 1/10  [14:32:05]
Task: P1-1 — 분석 타입 정의
Status: COMPLETED
Files: 3 changed (+142, -5)
Commit: abc1234
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 2e. Verify (unless --skip-verify)

Run quality gates:
```bash
bun run typecheck 2>&1 | tail -5
bun run lint 2>&1 | tail -5
bun test 2>&1 | tail -10
```

Record results:
- PASS: all three succeed
- PARTIAL: some fail (log which ones)
- FAIL: critical failure

**On failure**: Do NOT retry automatically. Log the failure and continue to the
next task. The user can review failures in the report and decide what to do.
Rationale: auto-retry often leads to cascading fixes that touch unrelated code.

#### 2f. Update Progress

1. **PRD update** (if using PRD source): mark `- [ ]` → `- [x]` for completed task
2. **Progress log** (append to `scripts/ralph/progress.md`):
   ```
   ## Iteration N — YYYY-MM-DD HH:MM
   - Task: {task_id} — {description}
   - Status: {success|partial|failed}
   - Files: {changed_files}
   - Verify: typecheck={pass|fail} lint={pass|fail} test={pass|fail}
   - Commit: {hash}
   - Duration: {time}
   - Notes: {worker notes}
   ```
3. **TaskUpdate**: update the TaskCreate item with current progress

#### 2g. Loop Decision

Continue to next iteration if:
- Remaining tasks > 0
- Current iteration < max
- No catastrophic failure (e.g., git in broken state)

Stop if:
- All tasks complete
- Max iterations reached
- User interrupts (Ctrl+C)

### Phase 3: Completion Report

After the loop ends, generate a structured report:

```markdown
# Ralph Loop — Completion Report
Generated: {timestamp}

## Summary
| Metric | Value |
|--------|-------|
| Total tasks | N |
| Completed | M |
| Failed | K |
| Iterations | I |
| Duration | X min |

## Task Results
| # | Task | Status | Verify | Commit |
|---|------|--------|--------|--------|
| 1 | P1-1 Description | PASS | tc/lint/test | abc1234 |
| 2 | P2-1 Description | FAIL | tc:fail | — |

## Quality Summary
- Typecheck: {pass_count}/{total}
- Lint: {pass_count}/{total}
- Test: {pass_count}/{total}

## Changed Files
{aggregated list of all files changed across iterations}

## Commits
{list of commits with hashes and messages}

## Issues & Notes
{any failures, warnings, or observations from workers}

## Next Steps
{remaining incomplete tasks from PRD, if any}
```

Save the report to `scripts/ralph/report-{timestamp}.md`.

## Error Handling

| Scenario | Action |
|----------|--------|
| Worker times out (>10 min) | Kill, log as TIMEOUT, continue |
| Quality check fails | Log failure, mark task as PARTIAL, continue |
| Git conflict | Stop loop, report conflict, ask user |
| No tasks found | Exit with message |
| PRD file missing | Exit with instructions |
| claude CLI not found (cli mode) | Fall back to agent mode with warning |

## Configuration

The skill adapts to the project by detecting:
- **Package manager**: `bun` (default), `npm`, `pnpm`, `yarn` — from lockfile
- **Verify commands**: from `package.json` scripts
- **Commit format**: from recent git history (Conventional Commits detection)
- **Project context**: from `CLAUDE.md` if present

## Remote Dashboard (Mobile Monitoring)

Ralph Loop includes a real-time dashboard for monitoring progress from any device
(phone, tablet, another machine). The dashboard auto-refreshes every 5 seconds.

### How It Works

1. **Status file**: During execution, Ralph writes `ralph-status.json` to the
   project root. This JSON contains current status, task list, iteration count,
   logs, and timing data.

2. **Dashboard**: A static HTML file (`assets/dashboard.html` in the skill
   directory) reads `ralph-status.json` and displays a dark-themed mobile-friendly
   dashboard with:
   - Overall status badge (running/completed/failed)
   - Metrics grid (completed, failed, remaining, iteration, elapsed time)
   - Progress bar
   - Task list with status icons and verification badges
   - Recent log entries

3. **Serving**: Start a simple HTTP server to serve the dashboard:

### Setup (automatic during Phase 1)

During Phase 1 Setup, copy the dashboard and start the server:
```bash
# Copy dashboard to project root
cp .claude/skills/ralph/assets/dashboard.html ./ralph-dashboard.html

# Start HTTP server on port 8787
python3 -m http.server 8787 --directory . > /dev/null 2>&1 &
DASHBOARD_PID=$!
echo "Dashboard: http://localhost:8787/ralph-dashboard.html"
```

For **mobile access on same WiFi**:
```bash
# Get local IP
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "Mobile: http://${LOCAL_IP}:8787/ralph-dashboard.html"
```

For **remote access** (outside local network):
```bash
# Use cloudflared quick tunnel (no account needed)
cloudflared tunnel --url http://localhost:8787 &
# Outputs a public URL like https://xxx.trycloudflare.com
```

### Status JSON Schema

Write `ralph-status.json` after each iteration with this structure:
```json
{
  "status": "running",
  "source": "PRD.md",
  "iteration": 3,
  "max_iterations": 10,
  "started_at": "2026-03-03T14:30:00+09:00",
  "tasks": [
    {
      "id": "P1-1",
      "name": "분석 타입 정의",
      "status": "completed",
      "duration": "2m 30s",
      "verify": { "typecheck": true, "lint": true, "test": true },
      "commit": "abc1234"
    },
    {
      "id": "P2-1",
      "name": "D1 마이그레이션",
      "status": "running",
      "duration": null,
      "verify": null,
      "commit": null
    },
    {
      "id": "P3-1",
      "name": "LLM 프롬프트",
      "status": "pending",
      "duration": null,
      "verify": null,
      "commit": null
    }
  ],
  "logs": [
    "[14:30:05] Ralph Loop started — 3 tasks, max 10 iterations",
    "[14:30:10] Iteration 1: P1-1 — 분석 타입 정의",
    "[14:32:40] Iteration 1: COMPLETED (2m 30s, tc/lint/test PASS)",
    "[14:32:45] Iteration 2: P2-1 — D1 마이그레이션"
  ]
}
```

### Updating Status During Execution

In Phase 2, update `ralph-status.json` at these points:
- **2a**: Set current task status to `"running"`, add log entry
- **2d**: Update task with results (status, duration, commit)
- **2e**: Update task verify field
- **2g**: Add loop decision log entry

Use the Bash tool to write the JSON:
```bash
# Use a helper to write status atomically
cat > ralph-status.json << 'STATUSEOF'
{JSON content}
STATUSEOF
```

### Cleanup (Phase 3)

After generating the completion report:
1. Update `ralph-status.json` with final status (`"completed"` or `"failed"`)
2. Keep the server running for 5 minutes so the user can review on mobile
3. Log the dashboard URL in the completion report

## Tips for Better Results

- Keep PRD tasks small and focused (1-2 hours of work each)
- Include design doc references in task descriptions
- Use `--context` to point workers at relevant design docs
- Start with `--dry-run` to verify task extraction
- Use `--max 3` for the first run to test the workflow
- After completion, review the report and handle any PARTIAL/FAILED tasks manually
- Open the dashboard on your phone before starting a long Ralph Loop session
