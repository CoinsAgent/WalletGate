"""Git-native sprint records. Markdown is readable; fenced JSON is machine state.

Validation checks evidence integrity and traceability, not the truth of a worker's
claims. Review and real acceptance tests remain necessary.
"""
from __future__ import annotations

from collections import Counter
import hashlib
import json
from pathlib import Path
import re

STATUSES = ('MISSING', 'PARTIAL', 'IMPLEMENTED', 'VERIFIED', 'BLOCKED', 'RETIRED')


def block(text: str, name: str) -> dict | None:
    matches = re.findall(r'```json ' + re.escape(name) + r'\n(.*?)\n```', text, re.S)
    if len(matches) > 1:
        raise ValueError(f'duplicate {name} blocks')
    return json.loads(matches[0]) if matches else None


def fenced(name: str, data: dict) -> str:
    return f'```json {name}\n{json.dumps(data, indent=2, ensure_ascii=False)}\n```\n'


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def local(root: Path, value: str) -> Path:
    path = (root / value.split('#', 1)[0]).resolve()
    if not path.is_relative_to(root.resolve()) or not path.is_file():
        raise ValueError(f'missing or unsafe repository evidence: {value}')
    return path


def artifact(root: Path, ref: dict) -> None:
    if digest(local(root, ref['path'])) != ref['sha256']:
        raise ValueError(f'evidence hash mismatch: {ref["path"]}')


def coverage(root: Path) -> dict:
    data = block((root / 'docs/CONTRACT_COVERAGE.md').read_text(), 'contract-coverage')
    if not data or not data.get('requirements'):
        raise ValueError('missing contract-coverage record')
    ids = [r['id'] for r in data['requirements']]
    if len(ids) != len(set(ids)):
        raise ValueError('duplicate coverage IDs')
    for row in data['requirements']:
        if row['status'] not in STATUSES:
            raise ValueError('unknown coverage status')
    return data


def validate_manifest(data: dict, known: set[str]) -> None:
    if data['kind'] not in {'implementation', 'research'} or not data['objective_key'].strip():
        raise ValueError('phase needs kind and stable objective_key')
    if not data['requirements'] or not set(data['requirements']) <= known:
        raise ValueError('phase must reference known coverage requirements')
    if data['kind'] == 'research' and not data.get('blocker'):
        raise ValueError('research requires a specific documented blocker')
    criteria = data['acceptance']
    if not criteria or len(criteria) != len(set(criteria)):
        raise ValueError('acceptance IDs must be nonempty and unique')
    seen: set[str] = set()
    covered: set[str] = set()
    for task in data['tasks']:
        if task['id'] in seen or not set(task['depends_on']) <= seen:
            raise ValueError('duplicate task or dependencies not in execution order')
        if not all(task.get(k) for k in ('goal', 'deliverable', 'verification', 'acceptance')):
            raise ValueError('each task needs goal, deliverable, verification and acceptance')
        if not set(task['acceptance']) <= set(criteria):
            raise ValueError('task references unknown acceptance criteria')
        covered.update(task['acceptance'])
        seen.add(task['id'])
    if covered != set(criteria):
        raise ValueError('every acceptance criterion must map to a task')


def manifest(text: str) -> dict | None:
    return block(text, 'sprint-plan')


def product_path(value: str) -> bool:
    path = Path(value)
    return (path.parts[0] in {'app', 'lib', 'components'} and
            path.suffix in {'.ts', '.tsx', '.js', '.jsx', '.css'} and
            not re.search(r'(^|[./_-])(test|spec)([./_-]|$)', value) and
            path.name not in {'vitest.config.ts'})


def product_snapshot(root: Path) -> dict:
    return {p.relative_to(root).as_posix(): digest(p)
            for directory in ('app', 'lib', 'components')
            for p in (root / directory).rglob('*')
            if p.is_file() and product_path(p.relative_to(root).as_posix())}


def progress(root: Path, phase: str) -> tuple[Path, dict | None]:
    path = root / f'docs/plans/progress/{phase}.md'
    return path, block(path.read_text(), 'sprint-evidence') if path.exists() else None


def completion(root: Path, phase: str, plan: dict, *, before: dict | None = None) -> dict:
    _, evidence = progress(root, phase)
    if not evidence or evidence.get('phase') != phase:
        raise ValueError('missing matching sprint-evidence')
    task_ids = {t['id'] for t in plan['tasks']}
    if set(evidence['tasks']) != task_ids:
        raise ValueError('evidence must cover every task exactly')
    for task in evidence['tasks'].values():
        if task['status'] != 'COMPLETE' or not task.get('artifacts') or not task.get('commands'):
            raise ValueError('each task needs completed work, commands and artifacts')
        for ref in task['artifacts']:
            artifact(root, ref)
        for command in task['commands']:
            if not command.get('command') or command['exit_code'] != 0 or not command.get('result'):
                raise ValueError('completion needs successful commands and observed results')
            artifact(root, command['log'])
    if set(evidence['acceptance']) != set(plan['acceptance']):
        raise ValueError('missing acceptance evidence')
    for criterion, tasks in evidence['acceptance'].items():
        if not tasks or not set(tasks) <= task_ids or not any(
            criterion in t['acceptance'] and t['id'] in tasks for t in plan['tasks']
        ):
            raise ValueError('acceptance evidence must reference its covering tasks')
    if plan['kind'] == 'implementation':
        refs = evidence.get('product_deliverables', [])
        if not refs:
            raise ValueError('implementation completion requires product-code deliverables')
        for ref in refs:
            artifact(root, ref)
            if not product_path(ref['path']):
                raise ValueError('deliverable must be production code, not a test or document')
            if before is not None and before.get(ref['path']) == ref['sha256']:
                raise ValueError('product deliverable unchanged during this sprint')
    elif not evidence.get('findings') or not evidence.get('reproduction') or not plan.get('blocker'):
        raise ValueError('research needs blocker, findings and reproducible commands')
    handoff = evidence.get('handoff', {})
    if not all(handoff.get(k) for k in ('delivered', 'reusable', 'decisions_limitations', 'remaining_gaps', 'next_objective')):
        raise ValueError('missing concise handoff fields')
    return evidence


def append_handoff(root: Path, phase: str, evidence: dict) -> None:
    path, _ = progress(root, phase)
    text = path.read_text()
    # Identical completion reruns do not append duplicate handoffs; a later resume
    # with new evidence gets its own entry without rewriting historical text.
    stamp = hashlib.sha256(json.dumps(evidence['handoff'], sort_keys=True).encode()).hexdigest()
    marker = f'<!-- handoff:{stamp} -->'
    if marker in text:
        return
    labels = {'delivered': 'Delivered functionality', 'reusable': 'Reusable code and test evidence',
              'decisions_limitations': 'Technical decisions and limitations',
              'remaining_gaps': 'Remaining Contract gaps', 'next_objective': 'Recommended next objective'}
    with path.open('a') as out:
        out.write('\n## Handoff\n\n' + marker + '\n\n')
        for key, label in labels.items():
            out.write(f'- **{label}:** {evidence["handoff"][key]}\n')


def update_coverage(root: Path, phase: str, plan: dict, evidence: dict) -> None:
    data = coverage(root)
    if data['contract_sha256'] != digest(root / 'docs/PRODUCT_UNDERSTANDING_CONTRACT.md'):
        raise ValueError('contract changed; reconcile stable coverage IDs before updating')
    rows = {r['id']: r for r in data['requirements']}
    for update in evidence.get('coverage_updates', []):
        if update['id'] not in plan['requirements'] or update['status'] not in STATUSES:
            raise ValueError('coverage update outside sprint scope or unknown status')
        row = rows[update['id']]
        if not update.get('reason') or not update.get('acceptance') or not set(update['acceptance']) <= set(plan['acceptance']):
            raise ValueError('coverage updates require reason and acceptance mapping')
        for key in ('code', 'tests'):
            for path in update.get(key, []):
                local(root, path)
        if update['status'] == 'VERIFIED':
            if plan['kind'] != 'implementation' or not update.get('code') or not update.get('tests'):
                raise ValueError('VERIFIED requires product acceptance, code and tests; research is insufficient')
            if set(update['acceptance']) != set(row['acceptance']):
                raise ValueError('VERIFIED requires all requirement acceptance checks')
        row.update({k: update[k] for k in ('status', 'reason', 'code', 'tests') if k in update})
        ref = f'docs/plans/progress/{phase}.md'
        row['evidence'] = list(dict.fromkeys([*row.get('evidence', []), ref]))
    write_coverage(root, data)


def write_coverage(root: Path, data: dict) -> None:
    lines = ['# Contract Coverage', '',
             'Stable IDs survive Contract revisions. Split requirements receive new IDs; superseded IDs remain RETIRED with successor links. '
             'Reconcile changed wording and invalidate affected verification before updating the recorded Contract hash. '
             'VERIFIED means actual product acceptance evidence, never prototype success or human policy approval.', '',
             'Statuses: MISSING, PARTIAL, IMPLEMENTED (acceptance pending), VERIFIED, BLOCKED, RETIRED. '
             'The JSON below is authoritative; the table is generated from it.', '',
             '| ID | Contract | Requirement | Status |', '| --- | --- | --- | --- |']
    for row in data['requirements']:
        lines.append(f'| {row["id"]} | {row["contract"]} | {row["requirement"]} | {row["status"]} |')
    lines.extend(['', fenced('contract-coverage', data)])
    (root / 'docs/CONTRACT_COVERAGE.md').write_text('\n'.join(lines))


def counts(root: Path) -> str:
    return ', '.join(f'{s}={Counter(r["status"] for r in coverage(root)["requirements"])[s]}' for s in STATUSES)
