import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeJsonReport } from '../scripts/report.js';

test('verification reports are written as formatted JSON', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'jenkins-cicd-pipeline-'));
  t.after(() => rm(directory, { force: true, recursive: true }));

  const reportPath = await writeJsonReport('check.json', { status: 'passed' }, directory);

  assert.equal(reportPath, join(directory, 'check.json'));
  assert.equal(await readFile(reportPath, 'utf8'), '{\n  "status": "passed"\n}\n');
});

test('verification reports reject unsafe file names', async () => {
  await assert.rejects(
    writeJsonReport('../check.json', { status: 'passed' }),
    /Report file name/
  );
  await assert.rejects(
    writeJsonReport('check.txt', { status: 'passed' }),
    /Report file name/
  );
});
