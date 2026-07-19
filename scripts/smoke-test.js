import { createServer } from '../src/app.js';
import { writeJsonReport } from './report.js';

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

  return {
    body,
    requestId: response.headers.get('x-request-id'),
    status: response.status
  };
}

const { server, baseUrl } = await startServer();
const endpoints = [];

try {
  const health = await fetchJson(baseUrl, '/health');
  endpoints.push({ path: '/health', requestId: health.requestId, status: health.status });
  const readiness = await fetchJson(baseUrl, '/ready');
  endpoints.push({ path: '/ready', requestId: readiness.requestId, status: readiness.status });
  const pipeline = await fetchJson(baseUrl, '/api/pipeline');
  endpoints.push({ path: '/api/pipeline', requestId: pipeline.requestId, status: pipeline.status });

  if (health.body.status !== 'ok') {
    throw new Error(`Health endpoint returned status ${health.body.status}`);
  }

  if (readiness.body.status !== 'ready') {
    throw new Error(`Readiness endpoint returned status ${readiness.body.status}`);
  }

  if (!Array.isArray(pipeline.body.stages) || pipeline.body.stages.length === 0) {
    throw new Error('Pipeline endpoint did not return any stages');
  }

  const report = {
    status: 'passed',
    checkedAt: new Date().toISOString(),
    baseUrl,
    endpoints,
    stageCount: pipeline.body.stages.length
  };

  await writeJsonReport('smoke-test.json', report);

  console.log(`Smoke test passed against ${baseUrl}`);
} catch (error) {
  await writeJsonReport('smoke-test.json', {
    status: 'failed',
    checkedAt: new Date().toISOString(),
    baseUrl,
    endpoints,
    error: error instanceof Error ? error.message : String(error)
  });
  throw error;
} finally {
  server.close();
}
