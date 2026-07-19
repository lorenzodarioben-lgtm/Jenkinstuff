import { createServer as createHttpServer } from 'node:http';
import { randomUUID } from 'node:crypto';
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

function sendJson(response, statusCode, payload, headers = {}, includeBody = true) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    ...headers
  });
  response.end(includeBody ? JSON.stringify(payload, null, 2) : undefined);
}

function buildHealthPayload(startedAt, commit) {
  return {
    status: 'ok',
    service: packageJson.name,
    version: packageJson.version,
    uptimeSeconds: Math.round(process.uptime()),
    startedAt: startedAt.toISOString(),
    checkedAt: new Date().toISOString(),
    commit
  };
}

function resolveRequestId(request) {
  const requestId = request.headers['x-request-id'];

  if (typeof requestId === 'string' && /^[A-Za-z0-9._-]{1,128}$/.test(requestId)) {
    return requestId;
  }

  return randomUUID();
}

export function createServer(options = {}) {
  const startedAt = options.startedAt ?? new Date();
  const commit = options.commit ?? process.env.GIT_COMMIT ?? process.env.COMMIT_SHA ?? 'local';

  return createHttpServer((request, response) => {
    const requestUrl = new URL(request.url ?? '/', 'http://localhost');
    const path = requestUrl.pathname === '/'
      ? '/'
      : requestUrl.pathname.replace(/\/+$/, '');

    response.setHeader('x-request-id', resolveRequestId(request));
    const sendResponse = (statusCode, payload, headers) => {
      sendJson(response, statusCode, payload, headers, request.method !== 'HEAD');
    };

    if (!['GET', 'HEAD'].includes(request.method)) {
      sendResponse(405, {
        error: 'Method not allowed',
        allowedMethods: ['GET', 'HEAD']
      }, {
        allow: 'GET, HEAD'
      });
      return;
    }

    if (path === '/') {
      sendResponse(200, {
        service: packageJson.name,
        description: packageJson.description,
        version: packageJson.version,
        endpoints: ['/health', '/ready', '/api/pipeline', '/api/version']
      });
      return;
    }

    if (path === '/health') {
      sendResponse(200, buildHealthPayload(startedAt, commit));
      return;
    }

    if (path === '/ready') {
      sendResponse(200, {
        status: 'ready',
        service: packageJson.name,
        checkedAt: new Date().toISOString()
      });
      return;
    }

    if (path === '/api/pipeline') {
      sendResponse(200, {
        service: packageJson.name,
        stageCount: pipelineStages.length,
        stages: pipelineStages
      });
      return;
    }

    if (path === '/api/version') {
      sendResponse(200, {
        name: packageJson.name,
        version: packageJson.version,
        node: process.version,
        environment: process.env.NODE_ENV || 'development',
        commit
      });
      return;
    }

    sendResponse(404, {
      error: 'Not found',
      path
    });
  });
}
