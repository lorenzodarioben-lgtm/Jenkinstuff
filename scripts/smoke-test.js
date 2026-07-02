import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from '../src/app.js';

async function startServer() {
  const server = createServer();

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  const { port } = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`
  };
}

async function fetchJson(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.json();

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}: ${JSON.stringify(body)}`);
  }

  return body;
}

const { server, baseUrl } = await startServer();

try {
  const health = await fetchJson(baseUrl, '/health');
  const pipeline = await fetchJson(baseUrl, '/api/pipeline');

  if (health.status !== 'ok') {
    throw new Error(`Health endpoint returned status ${health.status}`);
  }

  if (!Array.isArray(pipeline.stages) || pipeline.stages.length === 0) {
    throw new Error('Pipeline endpoint did not return any stages');
  }

  const report = {
    status: 'passed',
    checkedAt: new Date().toISOString(),
    baseUrl,
    endpoints: ['/health', '/api/pipeline'],
    stageCount: pipeline.stages.length
  };

  await mkdir('reports', { recursive: true });
  await writeFile('reports/smoke-test.json', `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Smoke test passed against ${baseUrl}`);
} finally {
  server.close();
}
