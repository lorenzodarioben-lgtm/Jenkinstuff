import { createServer as createHttpServer } from 'node:http';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

export const pipelineStages = [
  {
    name: 'Checkout',
    goal: 'Retrieve the latest source from version control.',
    qualityGate: 'SCM checkout succeeds for the target branch.'
  },
  {
    name: 'Runtime Diagnostics',
    goal: 'Record the Node.js and npm versions used by the build agent.',
    qualityGate: 'Runtime tooling is available before validation starts.'
  },
  {
    name: 'Install Dependencies',
    goal: 'Create a reproducible build environment.',
    qualityGate: 'npm ci completes from the lockfile.'
  },
  {
    name: 'Static Analysis',
    goal: 'Catch syntax, formatting, and repository hygiene issues early.',
    qualityGate: 'Lint checks pass with no blocking findings.'
  },
  {
    name: 'Automated Tests',
    goal: 'Validate service behavior before packaging.',
    qualityGate: 'All unit and endpoint tests pass.'
  },
  {
    name: 'Smoke Test',
    goal: 'Boot the service and verify critical endpoints.',
    qualityGate: 'Health and pipeline endpoints return valid payloads.'
  },
  {
    name: 'Build Container Image',
    goal: 'Package the verified service into a deployable Docker image.',
    qualityGate: 'Docker build completes with a health check configured.'
  },
  {
    name: 'Verify Container Image',
    goal: 'Run the built image and verify live endpoints through Docker.',
    qualityGate: 'Container health and pipeline endpoints return valid payloads.'
  },
  {
    name: 'Security Audit',
    goal: 'Surface dependency vulnerabilities before the image is treated as releasable.',
    qualityGate: 'Moderate or higher production dependency issues are reviewed.'
  },
  {
    name: 'Archive Verification Reports',
    goal: 'Keep smoke-test output attached to the build record.',
    qualityGate: 'Available reports are archived without changing test results.'
  }
];

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers
  });
  response.end(JSON.stringify(payload, null, 2));
}

function buildHealthPayload(startedAt) {
  return {
    status: 'ok',
    service: packageJson.name,
    version: packageJson.version,
    uptimeSeconds: Math.round(process.uptime()),
    startedAt: startedAt.toISOString(),
    checkedAt: new Date().toISOString(),
    commit: process.env.GIT_COMMIT || process.env.COMMIT_SHA || 'local'
  };
}

export function createServer(options = {}) {
  const startedAt = options.startedAt ?? new Date();

  return createHttpServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', 'http://localhost');

    if (request.method !== 'GET') {
      sendJson(response, 405, {
        error: 'Method not allowed',
        allowedMethods: ['GET']
      }, {
        allow: 'GET'
      });
      return;
    }

    if (requestUrl.pathname === '/') {
      sendJson(response, 200, {
        service: packageJson.name,
        description: packageJson.description,
        version: packageJson.version,
        endpoints: ['/health', '/api/pipeline', '/api/version']
      });
      return;
    }

    if (requestUrl.pathname === '/health') {
      sendJson(response, 200, buildHealthPayload(startedAt));
      return;
    }

    if (requestUrl.pathname === '/api/pipeline') {
      sendJson(response, 200, {
        service: packageJson.name,
        stageCount: pipelineStages.length,
        stages: pipelineStages
      });
      return;
    }

    if (requestUrl.pathname === '/api/version') {
      sendJson(response, 200, {
        name: packageJson.name,
        version: packageJson.version,
        node: process.version,
        environment: process.env.NODE_ENV || 'development'
      });
      return;
    }

    sendJson(response, 404, {
      error: 'Not found',
      path: requestUrl.pathname
    });
  });
}
