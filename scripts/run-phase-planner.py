#!/usr/bin/env python3
"""Read-only Codex phase planner: Skill -> Codex -> timestamped proposal.

This low-level report generator never writes PLANS.md or executes tasks. Use phase-plan-exec.py for sprint orchestration.
Run from any directory inside the WalletGate Git repository.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import sys
import tempfile


def cmd(*args: str, cwd: Path) -> str:
    return subprocess.check_output(args, cwd=cwd, text=True).strip()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def frontmatter_fields(content: str) -> dict[str, str]:
    if not content.startswith('---\n'):
        return {}
    end = content.find('\n---\n', 4)
    if end == -1:
        return {}
    fields: dict[str, str] = {}
    for line in content[4:end].splitlines():
        if ':' not in line:
            continue
        k, v = line.split(':', 1)
        v = v.strip()
        try:
            fields[k.strip()] = str(json.loads(v)) if v else ''
        except (ValueError, TypeError):
            fields[k.strip()] = v.strip('"\'')
    return fields


def select_report(directory: Path, kind: str, contract_version: str, explicit: str | None, root: Path) -> Path:
    base = directory.resolve()
    if explicit:
        candidate = (root / explicit).resolve()
        if not candidate.is_file() or candidate.suffix != '.md' or not candidate.is_relative_to(base):
            raise ValueError(f'Expected an existing Markdown report under docs/assessments/: {explicit}')
        return candidate

    ranked: list[tuple[int, str, Path]] = []
    for candidate in base.glob('*.md'):
        metadata = frontmatter_fields(candidate.read_text(encoding='utf-8'))
        guessed = kind in candidate.name
        if metadata.get('assessment_type') != kind and not guessed:
            continue
        contract_match = int(metadata.get('contract_version') == contract_version)
        date = metadata.get('created_at_utc') or metadata.get('assessment_date') or candidate.name
        ranked.append((contract_match, date, candidate))
    if not ranked:
        raise ValueError(f'No {kind} reports found. Run the corresponding assessment skill first.')
    ranked.sort(key=lambda entry: (entry[0], entry[1], entry[2].name), reverse=True)
    return ranked[0][2]


def main() -> int:
    parser = argparse.ArgumentParser(description='Generate a timestamped, unapproved proposal for the Top 1 phase and all its tasks')
    parser.add_argument('--compliance', help='Explicit compliance Markdown report beneath docs/assessments/')
    parser.add_argument('--feasibility', help='Explicit feasibility Markdown report beneath docs/assessments/')
    parser.add_argument('--focus', default='', help='Optional focus; does not narrow mandatory product checks')
    args = parser.parse_args()

    root = Path(cmd('git', 'rev-parse', '--show-toplevel', cwd=Path.cwd())).resolve()
    contract = root / 'docs/PRODUCT_UNDERSTANDING_CONTRACT.md'
    skill = root / '.agents/skills/phase-plan-exec/SKILL.md'
    reports = root / 'docs/assessments'
    if not contract.is_file() or not skill.is_file() or not reports.is_dir():
        raise ValueError('Missing Product Contract, phase-planner Skill or docs/assessments/')
    match = re.search(r'^\*\*Version:\*\*\s*(\S+)', contract.read_text(encoding='utf-8'), re.M)
    version = match.group(1) if match else 'unknown'
    compliance = select_report(reports, 'contract-compliance', version, args.compliance, root)
    feasibility = select_report(reports, 'technical-feasibility', version, args.feasibility, root)
    commit = cmd('git', 'rev-parse', 'HEAD', cwd=root)
    status = cmd('git', 'status', '--porcelain', '--untracked-files=normal', cwd=root)

    prompt = f'''OUTPUT_MODE=BODY_ONLY
Use the $phase-plan-exec skill in .agents/skills/phase-plan-exec/SKILL.md.
Read AGENTS.md, the approved Product Contract, existing PLANS.md and docs/plans/history/ files if any,
and the current repository source.
Use this compliance report: {compliance.relative_to(root).as_posix()}
Use this technical feasibility report: {feasibility.relative_to(root).as_posix()}
Optional focus: {args.focus or 'None'}
Produce a candidate plan for ONLY the single highest-priority unfinished phase and ALL its tasks,
including prerequisites, acceptance criteria, verifications and explicit approval gate.
Use '## Top 1 Phase'; do not output additional phase proposals or a Top 3 roadmap.
Return only a complete Markdown report body beginning with '# Phase Priority Proposal'.
Do not modify any files, generate YAML metadata, call the script, approve phases or implement tasks.
'''
    with tempfile.TemporaryDirectory(prefix='walletgate-phase-planner-') as temp:
        body_path = Path(temp) / 'body.md'
        process = subprocess.run(
            ['codex', 'exec', '--sandbox', 'read-only', '--output-last-message', str(body_path), prompt],
            cwd=root,
            check=False,
        )
        if process.returncode != 0:
            raise RuntimeError(f'Codex returned exit status {process.returncode}; no report published.')
        if cmd('git', 'rev-parse', 'HEAD', cwd=root) != commit or cmd('git', 'status', '--porcelain', '--untracked-files=normal', cwd=root) != status:
            raise RuntimeError('Git state changed during read-only analysis; no report published.')
        if not body_path.is_file():
            raise RuntimeError('Codex did not produce a Markdown report.')
        body = body_path.read_text(encoding='utf-8').strip()
        expected = ('# Phase Priority Proposal', '## Baseline', '## Top 1 Phase', '## All Tasks for Top 1 Phase', '## Dependency and Coverage Check', '## Approval Gate')
        headings = tuple(re.findall(r'^#{1,2} .+$', body, re.M))
        if len(body) < 500 or not body.startswith(expected[0] + '\n') or headings != expected:
            raise ValueError('Incomplete/invalid planning report; no report published.')
        if 'PROPOSAL_ONLY' not in body:
            raise ValueError('Missing approval gate; no report published.')

        now = datetime.now(timezone.utc)
        stamp = now.strftime('%Y-%m-%dT%H-%M-%S.') + f'{now.microsecond:06d}Z'
        meta = {
            'schema_version': 1,
            'artifact_type': 'phase-priority-proposal',
            'review_status': 'unreviewed',
            'approved': False,
            'generated_at_utc': now.isoformat().replace('+00:00', 'Z'),
            'contract_version': version,
            'contract_sha256': sha256(contract),
            'repository_commit': commit,
            'worktree_dirty_at_start': bool(status),
            'compliance_report': compliance.relative_to(root).as_posix(),
            'compliance_sha256': sha256(compliance),
            'technical_feasibility_report': feasibility.relative_to(root).as_posix(),
            'technical_feasibility_sha256': sha256(feasibility),
            'phase_plan_exec_skill_sha256': sha256(skill),
            'focus': args.focus or None,
        }
        header = '---\n' + ''.join(f'{k}: {json.dumps(v, ensure_ascii=False)}\n' for k, v in meta.items()) + '---\n\n'
        output_dir = root / 'docs/plans/proposals'
        output_dir.mkdir(parents=True, exist_ok=True)
        for _ in range(8):
            path = output_dir / f'{stamp}-{secrets.token_hex(4)}-phase-priority.md'
            try:
                with path.open('x', encoding='utf-8') as file:
                    file.write(header + body + '\n')
                print(f'Generated proposal (NOT approved): {path.relative_to(root)}')
                return 0
            except FileExistsError:
                continue
        raise RuntimeError('Could not allocate a unique proposal file.')


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (ValueError, OSError, RuntimeError, subprocess.CalledProcessError) as e:
        print(f'phase-planner: {e}', file=sys.stderr)
        sys.exit(1)
