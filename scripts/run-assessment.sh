#!/usr/bin/env bash
# Versioned assessment runner and publisher for Codex CLI.
# Does not commit, push, or modify application source.
set -euo pipefail

usage() {
  cat >&2 <<'HELP'
Usage:
  bash scripts/run-assessment.sh run contract-compliance [--scope TEXT] [--baseline docs/assessments/FILE.md]
  bash scripts/run-assessment.sh run technical-feasibility [--question TEXT] [--baseline docs/assessments/FILE.md]
  bash scripts/run-assessment.sh publish contract-compliance [--scope TEXT] [--baseline docs/assessments/FILE.md] < body.md
  bash scripts/run-assessment.sh publish technical-feasibility [--question TEXT] [--baseline docs/assessments/FILE.md] < body.md

Modes:
  run      Launches codex exec --sandbox read-only, then publishes its final Markdown.
  publish  Publishes an already-prepared Markdown body from stdin; never launches Codex.

An assessment never overwrites old reports, changes application files, or commits to Git.
HELP
  exit 2
}

die() { printf 'assessment: %s\n' "$*" >&2; exit 1; }

[[ $# -ge 2 ]] || usage
MODE="$1"; TYPE="$2"; shift 2
case "$MODE" in run|publish) ;; *) usage ;; esac
case "$TYPE" in contract-compliance|technical-feasibility) ;; *) usage ;; esac

SCOPE=""
QUESTION=""
BASELINE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --scope)
      [[ $# -ge 2 ]] || usage
      SCOPE="$2"; shift 2 ;;
    --question)
      [[ $# -ge 2 ]] || usage
      QUESTION="$2"; shift 2 ;;
    --baseline)
      [[ $# -ge 2 ]] || usage
      BASELINE="$2"; shift 2 ;;
    *) usage ;;
  esac
done
[[ "$TYPE" != "contract-compliance" || -z "$QUESTION" ]] || die '--question is only for technical-feasibility'
[[ "$TYPE" != "technical-feasibility" || -z "$SCOPE" ]] || die '--scope is only for contract-compliance'
if [[ "$TYPE" == "technical-feasibility" && -z "$QUESTION" && -z "$BASELINE" ]]; then
  die 'technical-feasibility requires --question or --baseline'
fi
if [[ "$TYPE" == "contract-compliance" && -z "$SCOPE" ]]; then
  SCOPE='All in-scope wallet, authentication, and OAuth/OIDC product requirements'
fi

command -v git >/dev/null || die 'git is required'
command -v python3 >/dev/null || die 'python3 is required'
ROOT="$(git rev-parse --show-toplevel)" || die 'not in a Git repository'
cd "$ROOT"
[[ -f docs/PRODUCT_UNDERSTANDING_CONTRACT.md ]] || die 'missing Product Understanding Contract'
[[ -f .agents/skills/$TYPE/SKILL.md ]] || die "missing skill $TYPE"

# Baselines must be existing Markdown files beneath this project's assessment directory.
if [[ -n "$BASELINE" ]]; then
  BASELINE="$(python3 - "$ROOT" "$BASELINE" <<'PY'
from pathlib import Path
import sys
root = Path(sys.argv[1]).resolve()
base = (root / 'docs/assessments').resolve()
provided = Path(sys.argv[2])
target = (provided if provided.is_absolute() else root / provided).resolve()
if not target.is_file() or target.suffix != '.md' or not target.is_relative_to(base):
    raise SystemExit('Invalid --baseline: expected an existing Markdown file in docs/assessments/')
print(target.relative_to(root).as_posix())
PY
)" || die 'could not validate baseline'
fi

COMMIT_AT_START="$(git rev-parse HEAD)"
STATUS_AT_START="$(git status --porcelain --untracked-files=normal)"
DIRTY_AT_START=false
[[ -z "$STATUS_AT_START" ]] || DIRTY_AT_START=true

BODY="$(mktemp)"
trap 'rm -f "$BODY"' EXIT

if [[ "$MODE" == "run" ]]; then
  command -v codex >/dev/null || die 'codex CLI is not installed or not in PATH'
  if [[ "$TYPE" == "contract-compliance" ]]; then
    PROMPT=$(cat <<PROMPT_END
OUTPUT_MODE=BODY_ONLY
Explicitly invoke the repository \$contract-compliance skill at .agents/skills/contract-compliance/SKILL.md.
Read AGENTS.md and docs/PRODUCT_UNDERSTANDING_CONTRACT.md.
Scope: $SCOPE
Baseline report: ${BASELINE:-None supplied; do not invent one.}
Inspect the current repository. Follow the skill's evidence, structure, and read-only requirements.
Return only a complete Markdown report body starting with '# Contract Compliance Report'.
Do not include YAML metadata, create files, run a publisher, invoke the script, or modify anything.
PROMPT_END
)
  else
    PROMPT=$(cat <<PROMPT_END
OUTPUT_MODE=BODY_ONLY
Explicitly invoke the repository \$technical-feasibility skill at .agents/skills/technical-feasibility/SKILL.md.
Read AGENTS.md and docs/PRODUCT_UNDERSTANDING_CONTRACT.md.
Technical question: ${QUESTION:-Investigate only findings relevant to the supplied baseline report.}
Baseline report: ${BASELINE:-None supplied; investigate independently.}
Inspect the current source and exact package versions. Follow the skill's evidence, structure, and read-only requirements.
Return only a complete Markdown report body starting with '# Technical Feasibility Assessment'.
Do not include YAML metadata, create files, run a publisher, invoke the script, or modify anything.
PROMPT_END
)
  fi
  codex exec --sandbox read-only --output-last-message "$BODY" "$PROMPT"
  # Fail closed if repository changes during a read-only analysis.
  [[ "$(git rev-parse HEAD)" == "$COMMIT_AT_START" ]] || die 'repository HEAD changed during analysis; report not published'
  [[ "$(git status --porcelain --untracked-files=normal)" == "$STATUS_AT_START" ]] || die 'working-tree status changed during analysis; report not published'
else
  [[ ! -t 0 ]] || die 'publish expects the full Markdown report body on stdin (use shell input redirection)'
  cat > "$BODY"
fi

[[ -s "$BODY" ]] || die 'empty report body; nothing published'

# The Python stdlib publisher owns deterministic metadata and exclusive file creation.
# It does not re-run Codex. No output file exists until the body is validated.
ASSESSMENT_ROOT="$ROOT" \
ASSESSMENT_BODY="$BODY" \
ASSESSMENT_TYPE="$TYPE" \
ASSESSMENT_SCOPE="$SCOPE" \
ASSESSMENT_QUESTION="$QUESTION" \
ASSESSMENT_BASELINE="$BASELINE" \
ASSESSMENT_COMMIT="$COMMIT_AT_START" \
ASSESSMENT_DIRTY="$DIRTY_AT_START" \
python3 - <<'PY'
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import os
import re
import secrets

root = Path(os.environ['ASSESSMENT_ROOT']).resolve()
body = Path(os.environ['ASSESSMENT_BODY']).read_text(encoding='utf-8').strip()
kind = os.environ['ASSESSMENT_TYPE']
heading = '# Contract Compliance Report' if kind == 'contract-compliance' else '# Technical Feasibility Assessment'
if not body.startswith(heading) or len(body) < 160:
    raise SystemExit(f'assessment: invalid/short report; expected first heading {heading!r}')

contract = root / 'docs/PRODUCT_UNDERSTANDING_CONTRACT.md'
contract_text = contract.read_text(encoding='utf-8')
match = re.search(r'^\*\*Version:\*\*\s*(\S+)', contract_text, re.M)
contract_version = match.group(1) if match else 'unknown'

def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

lock_text = (root / 'pnpm-lock.yaml').read_text(encoding='utf-8') if (root / 'pnpm-lock.yaml').exists() else ''
# Lockfile importer's resolved package version, not a semver range from package.json.
lock_match = re.search(r'^\s{6}better-auth:\s*\n\s+specifier:\s*[^\n]+\n\s+version:\s*([^\s(]+)', lock_text, re.M)
if not lock_match:
    lock_match = re.search(r'^\s{2}better-auth@([0-9][^:\s]*):', lock_text, re.M)
lock_version = lock_match.group(1) if lock_match else 'unknown'
installed = root / 'node_modules/better-auth/package.json'
try:
    installed_version = json.loads(installed.read_text(encoding='utf-8')).get('version', 'unknown')
except (OSError, ValueError):
    installed_version = 'unknown'

now = datetime.now(timezone.utc)
when = now.isoformat(timespec='microseconds').replace('+00:00', 'Z')
stamp = now.strftime('%Y-%m-%dT%H-%M-%S.') + f'{now.microsecond:06d}Z'
run_id = stamp + '-' + secrets.token_hex(4)
reports = root / 'docs/assessments'
reports.mkdir(parents=True, exist_ok=True)

baseline = os.environ['ASSESSMENT_BASELINE']
meta = {
    'schema_version': 1,
    'report_id': run_id,
    'assessment_type': kind,
    'created_at_utc': when,
    'review_status': 'unreviewed',
    'contract_version': contract_version,
    'contract_sha256': sha256(contract),
    'repository_commit': os.environ['ASSESSMENT_COMMIT'],
    'worktree_dirty_at_start': os.environ['ASSESSMENT_DIRTY'] == 'true',
    'better_auth_lock_version': lock_version,
    'better_auth_installed_version': installed_version,
    'skill_sha256': sha256(root / f'.agents/skills/{kind}/SKILL.md'),
    'scope': os.environ['ASSESSMENT_SCOPE'] or None,
    'question': os.environ['ASSESSMENT_QUESTION'] or None,
    'baseline_report': baseline or None,
    'baseline_sha256': sha256(root / baseline) if baseline else None,
    'assessment_method': 'static-read-only',
}
# JSON scalars are valid YAML scalar syntax, without any PyYAML dependency.
header = '---\n' + ''.join(f'{key}: {json.dumps(value, ensure_ascii=False)}\n' for key, value in meta.items()) + '---\n\n'
content = header + body + '\n'

# O_EXCL prevents overwrites even in the unlikely event of a timestamp collision.
for _ in range(5):
    target = reports / f'{run_id}-{kind}.md'
    try:
        with target.open('x', encoding='utf-8') as f:
            f.write(content)
        print(f'Generated: {target.relative_to(root).as_posix()}')
        break
    except FileExistsError:
        run_id = stamp + '-' + secrets.token_hex(4)
else:
    raise SystemExit('assessment: could not obtain a unique report filename')
PY
