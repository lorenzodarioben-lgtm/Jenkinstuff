import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, pipelineStages } from '../src/app.js';
import { parsePort } from '../src/config.js';

async function startTestServer(t) {
  const server = createServer({
    startedAt: new Date('2026-01-01T00:00:00.000Z')
  });

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });

  t.after(() => {
    server.close();
  });

  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

test('health endpoint returns operational metadata', async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(`${baseUrl}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.service, 'jenkins-cicd-pipeline');
  assert.equal(body.startedAt, '2026-01-01T00:00:00.000Z');
  assert.match(body.checkedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('pipeline endpoint exposes the expected pipeline stages', async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(`${baseUrl}/api/pipeline`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.stageCount, pipelineStages.length);
  assert.ok(body.stages.length >= 8);
  assert.deepEqual(
    body.stages.map((stage) => stage.name),
    pipelineStages.map((stage) => stage.name)
  );
});

test('root endpoint documents available endpoints', async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(baseUrl);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(body.endpoints.includes('/health'));
  assert.ok(body.endpoints.includes('/api/pipeline'));
});

test('responses include JSON and browser-safety headers', async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
});

test('responses retain a valid caller request identifier', async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(`${baseUrl}/health`, {
    headers: {
      'x-request-id': 'build-123.request_456'
    }
  });

  assert.equal(response.headers.get('x-request-id'), 'build-123.request_456');
});

test('responses generate a request identifier when the supplied value is invalid', async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(`${baseUrl}/health`, {
    headers: {
      'x-request-id': 'not valid'
    }
  });

  assert.match(response.headers.get('x-request-id'), /^[0-9a-f-]{36}$/);
});

test('version endpoint returns runtime metadata', async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(`${baseUrl}/api/version`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.name, 'jenkins-cicd-pipeline');
  assert.match(body.node, /^v\d+\./);
  assert.equal(body.environment, 'development');
});

test('endpoint paths accept a trailing slash', async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(`${baseUrl}/api/pipeline/`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.stageCount, pipelineStages.length);
});

test('unsupported methods return a JSON 405 response', async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(`${baseUrl}/health`, {
    method: 'POST'
  });
  const body = await response.json();

  assert.equal(response.status, 405);
  assert.equal(body.error, 'Method not allowed');
  assert.deepEqual(body.allowedMethods, ['GET']);
  assert.equal(response.headers.get('allow'), 'GET');
});

test('unknown routes return a JSON 404 response', async (t) => {
  const baseUrl = await startTestServer(t);
  const response = await fetch(`${baseUrl}/missing`);
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error, 'Not found');
  assert.equal(body.path, '/missing');
});

test('PORT validation accepts whole port numbers in range', () => {
  assert.equal(parsePort('1'), 1);
  assert.equal(parsePort('3000'), 3000);
  assert.equal(parsePort('65535'), 65535);
});

test('PORT validation rejects malformed and out-of-range values', () => {
  for (const value of ['0', '65536', '-1', '3000abc', '3000.5']) {
    assert.throws(() => parsePort(value), /Invalid PORT value/);
  }
});
