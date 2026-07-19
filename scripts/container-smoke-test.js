import { spawnSync } from 'node:child_process';
import { writeJsonReport } from './report.js';

const image = process.argv[2] || process.env.DOCKER_IMAGE || 'jenkins-cicd-pipeline:local';
const containerName = process.env.CONTAINER_NAME || `jenkins-cicd-pipeline-smoke-${Date.now()}`;

function runDocker(args, options = {}) {
  const result = spawnSync('docker', args, {
    encoding: 'utf8',
    ...options
  });

  if (result.status !== 0 && !options.allowFailure) {
    throw new Error([
      `docker ${args.join(' ')} failed`,
      result.stdout.trim(),
      result.stderr.trim()
    ].filter(Boolean).join('\n'));
  }

  return result.stdout.trim();
}

function parsePublishedPort(portOutput) {
  const firstLine = portOutput.split(/\r?\n/).find(Boolean);
  const match = firstLine?.match(/:(\d+)$/);

  if (!match) {
    throw new Error(`Could not determine published container port from: ${portOutput}`);
  }

  return match[1];
}

async function fetchJson(url) {
  const response = await fetch(url);
  const body = await response.json();

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}: ${JSON.stringify(body)}`);
  }

  return {
    body,
    requestId: response.headers.get('x-request-id'),
    status: response.status
  };
}

async function waitForEndpoint(url, attempts = 20) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetchJson(url);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw lastError;
}

async function waitForContainerHealth(containerName, attempts = 20) {
  let lastStatus = 'unknown';

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    lastStatus = runDocker([
      'inspect',
      '--format',
      '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}',
      containerName
    ]);

    if (lastStatus === 'healthy') {
      return lastStatus;
    }

    if (lastStatus === 'unhealthy') {
      throw new Error(`Container health check reported ${lastStatus}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Container did not become healthy. Last status: ${lastStatus}`);
}

runDocker(['rm', '--force', containerName], { allowFailure: true });

try {
  const containerId = runDocker([
    'run',
    '--detach',
    '--name',
    containerName,
    '--publish',
    '127.0.0.1::3000',
    image
  ]);

  const containerHealthStatus = await waitForContainerHealth(containerName);
  const publishedPort = parsePublishedPort(runDocker(['port', containerName, '3000/tcp']));
  const baseUrl = `http://127.0.0.1:${publishedPort}`;
  const health = await waitForEndpoint(`${baseUrl}/health`);
  const pipeline = await fetchJson(`${baseUrl}/api/pipeline`);

  if (health.body.status !== 'ok') {
    throw new Error(`Health endpoint returned status ${health.body.status}`);
  }

  if (!Array.isArray(pipeline.body.stages) || pipeline.body.stages.length === 0) {
    throw new Error('Pipeline endpoint did not return any stages');
  }

  const report = {
    containerId,
    image,
    verifiedAt: new Date().toISOString(),
    containerHealthStatus,
    healthStatus: health.body.status,
    testedEndpoints: [
      { path: '/health', requestId: health.requestId, status: health.status },
      { path: '/api/pipeline', requestId: pipeline.requestId, status: pipeline.status }
    ],
    pipelineStageCount: pipeline.body.stages.length
  };

  await writeJsonReport('container-smoke-test.json', report);

  console.log(`Container smoke test passed for ${image}`);
  console.log(`Container: ${containerId}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Pipeline stages: ${pipeline.body.stages.length}`);
} finally {
  const logs = runDocker(['logs', '--tail', '50', containerName], { allowFailure: true });

  if (logs) {
    console.log('Container logs:');
    console.log(logs);
  }

  runDocker(['rm', '--force', containerName], { allowFailure: true });
}
