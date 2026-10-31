import contextlib
import copy
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import sprint_state as state
spec = importlib.util.spec_from_file_location('controller', Path(__file__).resolve().parents[1] / 'phase-plan-exec.py')
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
planner_spec = importlib.util.spec_from_file_location('planner', Path(__file__).resolve().parents[1] / 'run-phase-planner.py')
planner = importlib.util.module_from_spec(planner_spec)
planner_spec.loader.exec_module(planner)


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        for directory in ('docs/plans/proposals', 'docs/plans/history', 'docs/plans/progress', 'lib'):
            (self.root / directory).mkdir(parents=True)
        self.write('docs/PRODUCT_UNDERSTANDING_CONTRACT.md', 'Contract v1')
        self.write('lib/product.ts', 'export const enabled = false;')
        self.write('lib/product.test.ts', 'acceptance tests')
        self.write('docs/run.log', '1 test passed; exit 0')
        self.data = dict(contract_version='1', contract_sha256=state.digest(self.root/'docs/PRODUCT_UNDERSTANDING_CONTRACT.md'), requirements=[dict(id='WG-001',contract='P1',requirement='testable requirement',status='MISSING',acceptance=['WG-001-A1'],code=[],tests=[],evidence=[])])
        state.write_coverage(self.root, self.data)
        for key, value in dict(ROOT=self.root, PLAN=self.root/'docs/PLANS.md', HISTORY=self.root/'docs/plans/history',PROPOSALS=self.root/'docs/plans/proposals').items():
            p = patch.object(c, key, value); p.start(); self.addCleanup(p.stop)
        self.plan = dict(kind='implementation',objective_key='wallet-safety',requirements=['WG-001'],acceptance=['WG-001-A1'],tasks=[dict(id='C01-T01',goal='Enforce wallet safety',depends_on=[],deliverable='lib/product.ts',verification='run acceptance',acceptance=['WG-001-A1'])])

    def write(self, path, text):
        (self.root/path).write_text(text)

    def ref(self, path):
        return dict(path=path,sha256=state.digest(self.root/path))

    def proposal(self, data=None, name='new.md'):
        data = data or self.plan
        body = '# Phase Priority Proposal\n\n## Baseline\n\n## Top 1 Phase\n\n### C01 — Wallet safety\n\n## All Tasks for Top 1 Phase\n\n'
        body += '\n'.join('### '+t['id']+' — '+t['goal'] for t in data['tasks'])
        body += '\n\n## Dependency and Coverage Check\n\n'+state.fenced('sprint-plan',data)+'\n## Approval Gate\n\nPROPOSAL_ONLY — NO IMPLEMENTATION AUTHORIZED\n'
        path=self.root/'docs/plans/proposals'/name; path.write_text(body); return path

    def create(self):
        return c.create_plan(self.proposal())

    def evidence(self, plan=None):
        plan=plan or c.plan_spec(c.read_current()[2],'PH-001')
        evidence=dict(phase='PH-001', tasks={t['id']:dict(status='COMPLETE',artifacts=[self.ref('lib/product.ts')],commands=[dict(command='run acceptance',exit_code=0,result='1 passed',log=self.ref('docs/run.log'))]) for t in plan['tasks']},acceptance={a:[t['id'] for t in plan['tasks'] if a in t['acceptance']] for a in plan['acceptance']},product_deliverables=[self.ref('lib/product.ts')],coverage_updates=[],handoff={k:'Specific result' for k in ('delivered','reusable','decisions_limitations','remaining_gaps','next_objective')})
        return evidence

    def save_evidence(self, evidence):
        self.write('docs/plans/progress/PH-001.md', '# Progress\n'+state.fenced('sprint-evidence',evidence))

    def cli(self, *args):
        with patch.object(sys, 'argv', ['phase-plan-exec.py', *args]), contextlib.redirect_stdout(io.StringIO()) as output:
            c.main()
        return output.getvalue()

    def worker(self, verdict='READY_FOR_REVIEW', fail=False, product=True):
        def run(args, **kwargs):
            if product:self.write('lib/product.ts', 'export const enabled = true;')
            self.save_evidence(self.evidence())
            Path(args[args.index('--output-last-message')+1]).write_text('SPRINT_STATUS: '+verdict)
            return subprocess.CompletedProcess(args, 1 if fail else 0)
        return run

    def test_planning_persists_all_tasks_and_stable_ids(self):
        self.plan['tasks'].append(dict(id='C01-T02',goal='Regression',depends_on=['C01-T01'],deliverable='tests',verification='run regression',acceptance=['WG-001-A1']))
        phase,count=self.create()
        self.assertEqual((phase,count),('PH-001',2))
        plan=c.plan_spec(c.read_current()[2],phase)
        self.assertEqual(plan['tasks'][1]['depends_on'],['PH-001-T01'])
        self.assertEqual(c.read_current()[1],'PENDING_EXECUTION')

    def test_missing_acceptance_mapping_rejected(self):
        self.plan['acceptance'].append('uncovered')
        with self.assertRaises(ValueError):self.create()
        self.assertFalse(c.PLAN.exists())

    def test_dependency_order_rejected(self):
        self.plan['tasks'][0]['depends_on']=['C01-T02']
        with self.assertRaises(ValueError):self.create()

    def test_no_confirmation_never_starts_worker(self):
        self.create()
        with patch.object(sys.stdin,'isatty',return_value=False),patch.object(c,'run') as run:
            c.execute(yes=False)
        run.assert_not_called()
        self.assertEqual(c.read_current()[1],'PENDING_EXECUTION')

    def test_only_full_yes_is_confirmation(self):
        for answer in ('', 'y', 'no', 'maybe'):
            with patch.object(sys.stdin,'isatty',return_value=True),patch('builtins.input',return_value=answer):
                self.assertFalse(c.confirm('PH-001',yes=False))
        with patch.object(sys.stdin,'isatty',return_value=True),patch('builtins.input',return_value='Yes'):
            self.assertTrue(c.confirm('PH-001',yes=False))

    def test_plan_and_next_cannot_bypass_confirmation(self):
        for action in ('plan','next'):
            with self.assertRaises(SystemExit):self.cli(action,'--yes')
        self.assertFalse(c.PLAN.exists())

    def test_resume_does_not_regenerate_or_replace_pending_plan(self):
        self.create(); original=c.PLAN.read_bytes()
        for status in ('PENDING_EXECUTION','PAUSED','BLOCKED','RUNNING'):
            c.update_status(status)
            with patch.object(c,'generate_proposal') as generate,patch.object(c,'execute') as execute:
                self.cli('plan')
            generate.assert_not_called()
            if status!='RUNNING':execute.assert_called_once_with(yes=False)
            self.assertEqual(c.read_current()[0],'PH-001')
        self.assertIn(b'Wallet safety',original)

    def test_worker_success_requires_changed_product(self):
        self.create()
        with patch.object(c.shutil,'which',return_value='/bin/codex'),patch.object(c,'run',side_effect=self.worker()):
            c.execute(yes=True)
        self.assertEqual(c.read_current()[1],'READY_FOR_REVIEW')
        self.assertIn('## Handoff',(self.root/'docs/plans/progress/PH-001.md').read_text())

    def test_document_only_implementation_cannot_complete(self):
        self.create()
        with patch.object(c.shutil,'which',return_value='/bin/codex'),patch.object(c,'run',side_effect=self.worker(product=False)):
            c.execute(yes=True)
        self.assertEqual(c.read_current()[1],'PAUSED')

    def test_status_line_without_evidence_is_rejected(self):
        self.create()
        def worker(args, **kwargs):
            Path(args[args.index('--output-last-message')+1]).write_text('SPRINT_STATUS: READY_FOR_REVIEW')
            return subprocess.CompletedProcess(args,0)
        with patch.object(c.shutil,'which',return_value='/bin/codex'),patch.object(c,'run',side_effect=worker):c.execute(yes=True)
        self.assertEqual(c.read_current()[1],'PAUSED')
        self.assertIn('## Handoff',(self.root/'docs/plans/progress/PH-001.md').read_text())

    def test_failed_worker_cannot_complete(self):
        self.create()
        with patch.object(c.shutil,'which',return_value='/bin/codex'),patch.object(c,'run',side_effect=self.worker(fail=True)):c.execute(yes=True)
        self.assertEqual(c.read_current()[1],'PAUSED')

    def test_running_sprint_can_resume_with_new_yes(self):
        self.create(); c.update_status('RUNNING')
        with patch.object(c.shutil,'which',return_value='/bin/codex'),patch.object(c,'run',side_effect=self.worker()):c.execute(yes=True)
        self.assertEqual(c.read_current()[1],'READY_FOR_REVIEW')

    def test_resume_reuses_original_product_baseline_after_partial_delivery(self):
        self.create()
        original=state.digest(self.root/'lib/product.ts')
        with patch.object(c.shutil,'which',return_value='/bin/codex'),patch.object(c,'run',side_effect=self.worker(verdict='PAUSED')):
            c.execute(yes=True)
        self.assertEqual(c.read_current()[1],'PAUSED')
        with patch.object(c.shutil,'which',return_value='/bin/codex'),patch.object(c,'run',side_effect=self.worker(product=False)):
            c.execute(yes=True)
        self.assertEqual(c.read_current()[1],'READY_FOR_REVIEW')
        text=(self.root/'docs/plans/progress/PH-001.md').read_text()
        self.assertEqual(state.block(text,'sprint-baseline')['product']['lib/product.ts'],original)

    def test_worker_interrupt_is_paused_with_handoff(self):
        self.create()
        with patch.object(c.shutil,'which',return_value='/bin/codex'),patch.object(c,'run',side_effect=KeyboardInterrupt),self.assertRaises(KeyboardInterrupt):
            c.execute(yes=True)
        self.assertEqual(c.read_current()[1],'PAUSED')
        self.assertIn('## Handoff',(self.root/'docs/plans/progress/PH-001.md').read_text())

    def test_test_file_is_not_product_deliverable(self):
        self.create();evidence=self.evidence()
        evidence['product_deliverables']=[self.ref('lib/product.test.ts')]
        self.save_evidence(evidence)
        with self.assertRaises(ValueError):state.completion(self.root,'PH-001',c.plan_spec(c.read_current()[2],'PH-001'))

    def test_missing_or_tampered_acceptance_evidence_rejected(self):
        self.create(); plan=c.plan_spec(c.read_current()[2],'PH-001')
        evidence=self.evidence(); evidence['acceptance']={}; self.save_evidence(evidence)
        with self.assertRaises(ValueError):state.completion(self.root,'PH-001',plan)
        self.save_evidence(self.evidence());self.write('docs/run.log','tampered')
        with self.assertRaises(ValueError):state.completion(self.root,'PH-001',plan)

    def test_failed_test_rejects_completion(self):
        self.create(); evidence=self.evidence();evidence['tasks']['PH-001-T01']['commands'][0]['exit_code']=1;self.save_evidence(evidence)
        with self.assertRaises(ValueError):state.completion(self.root,'PH-001',c.plan_spec(c.read_current()[2],'PH-001'))

    def test_research_requires_specific_blocker_and_findings(self):
        self.plan['kind']='research'
        with self.assertRaises(ValueError):self.create()
        self.plan.update(blocker='Provider cannot override sub',inputs={'lib/product.ts':state.digest(self.root/'lib/product.ts')})
        self.create(); evidence=self.evidence();self.save_evidence(evidence)
        plan=c.plan_spec(c.read_current()[2],'PH-001')
        with self.assertRaises(ValueError):state.completion(self.root,'PH-001',plan)
        evidence.update(findings='Reproduced provider no-go',reproduction='run acceptance');self.save_evidence(evidence)
        state.completion(self.root,'PH-001',plan)

    def test_coverage_verified_requires_all_acceptance_and_product_tests(self):
        self.create(); plan=c.plan_spec(c.read_current()[2],'PH-001');evidence=self.evidence()
        update=dict(id='WG-001',status='VERIFIED',acceptance=['WG-001-A1'],reason='Product acceptance passed',code=['lib/product.ts'],tests=['lib/product.test.ts'])
        evidence['coverage_updates']=[update]
        state.update_coverage(self.root,'PH-001',plan,evidence)
        row=state.coverage(self.root)['requirements'][0]
        self.assertEqual(row['status'],'VERIFIED');self.assertIn('docs/plans/progress/PH-001.md',row['evidence'])
        plan['kind']='research'
        with self.assertRaises(ValueError):state.update_coverage(self.root,'PH-001',plan,evidence)

    def test_coverage_update_validation_is_atomic(self):
        self.create(); before=(self.root/'docs/CONTRACT_COVERAGE.md').read_bytes()
        evidence=self.evidence();evidence['coverage_updates']=[dict(id='WG-001',status='PARTIAL',acceptance=['WG-001-A1'],reason='Some progress'),dict(id='other',status='VERIFIED')]
        with self.assertRaises(ValueError):state.update_coverage(self.root,'PH-001',c.plan_spec(c.read_current()[2],'PH-001'),evidence)
        self.assertEqual(before,(self.root/'docs/CONTRACT_COVERAGE.md').read_bytes())

    def test_contract_revision_blocks_stale_coverage(self):
        self.write('docs/PRODUCT_UNDERSTANDING_CONTRACT.md','Contract v2')
        with self.assertRaises(SystemExit):self.create()
        self.assertIn('Reconcile Coverage',self.cli('status'))

    def test_handoff_is_append_only_and_idempotent(self):
        self.create();evidence=self.evidence();self.save_evidence(evidence)
        path=self.root/'docs/plans/progress/PH-001.md';before=path.read_bytes()
        state.append_handoff(self.root,'PH-001',evidence);state.append_handoff(self.root,'PH-001',evidence)
        self.assertTrue(path.read_bytes().startswith(before));self.assertEqual(path.read_text().count('## Handoff'),1)

    def archive(self):
        self.create();self.save_evidence(self.evidence());c.update_status('READY_FOR_REVIEW')
        c.PLAN.rename(c.HISTORY/'PH-001.md')

    def test_duplicate_phase_prevented_even_if_title_changes(self):
        self.archive();self.plan['tasks'][0]['goal']='Different wording'
        with self.assertRaises(SystemExit):self.create()
        self.assertFalse(c.PLAN.exists())

    def test_duplicate_research_needs_changed_relevant_inputs(self):
        self.plan.update(kind='research',blocker='Specific provider gap',inputs={'lib/product.ts':state.digest(self.root/'lib/product.ts')})
        self.archive();self.plan['objective_key']='renamed-research'
        with self.assertRaises(SystemExit):self.create()
        self.write('lib/product.ts','changed relevant API')
        self.plan['inputs']['lib/product.ts']=state.digest(self.root/'lib/product.ts')
        self.assertEqual(self.create()[0],'PH-002')

    def test_next_refuses_missing_evidence(self):
        self.create();c.update_status('READY_FOR_REVIEW')
        with self.assertRaises(SystemExit):self.cli('next')
        self.assertTrue(c.PLAN.exists());self.assertFalse(list(c.HISTORY.glob('*')))

    def test_next_archives_and_only_plans_with_no_confirmation(self):
        self.create();self.save_evidence(self.evidence());c.update_status('READY_FOR_REVIEW')
        self.plan['objective_key']='close-other-gap';proposal=self.proposal(name='second.md')
        with patch.object(sys.stdin,'isatty',return_value=False),patch.object(c,'run') as run:
            self.cli('next','--proposal',str(proposal))
        self.assertTrue((c.HISTORY/'PH-001.md').exists());self.assertEqual(c.read_current()[:2],('PH-002','PENDING_EXECUTION'));run.assert_not_called()

    def test_status_reads_repository_and_counts_once(self):
        self.create();self.save_evidence(self.evidence());c.update_status('READY_FOR_REVIEW')
        output=self.cli('status')
        for text in ('Completed Sprints: 1','PH-001: READY_FOR_REVIEW','Completed Tasks (1/1)','Remaining Tasks (0)','MISSING=1','Next recommended action:'):self.assertIn(text,output)
        self.write('docs/run.log','stale log')
        self.assertIn('Completed Sprints: 0',self.cli('status'))

    def test_assessments_optional(self):
        self.assertIsNone(planner.select_report(self.root/'absent','technical-feasibility','1',None,self.root))

    def test_legacy_plan_reads_appended_index_without_rewriting(self):
        self.create();text=c.read_current()[2];data=state.manifest(text)
        legacy=text[:text.index('```json sprint-plan')]
        self.write('docs/PLANS.md',legacy)
        evidence=self.evidence(data);evidence['legacy_plan']=data;self.save_evidence(evidence)
        self.assertEqual(c.plan_spec(legacy,'PH-001'),data)
        self.assertEqual(c.PLAN.read_text(),legacy)


if __name__=='__main__':unittest.main()
