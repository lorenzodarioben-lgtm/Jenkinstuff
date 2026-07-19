# Architecture

This project centers on a small HTTP service and the checks needed to package it safely as a container image.

## Runtime Components

```mermaid
flowchart TB
    Client[Client or monitor] --> Service[Node.js HTTP service]
    Service --> Health[GET /health]
    Service --> Pipeline[GET /api/pipeline]
    Service --> Version[GET /api/version]
    Jenkins[Jenkins agent] --> Npm[npm ci, lint, test, smoke]
    Jenkins --> Docker[Docker build and container smoke test]
    Docker --> Image[Local Docker image]
```

## Service Responsibilities

| Endpoint | Purpose |
| --- | --- |
| `GET /` | Lists service metadata and available endpoints. |
| `GET /health` | Returns operational health, version, uptime, timestamps, and commit metadata when available. |
| `GET /ready` | Confirms that the running process is ready to accept traffic. |
| `GET /api/pipeline` | Describes the CI/CD stages represented by the project. |
| `GET /api/version` | Returns package and Node.js runtime information. |

All routes return JSON with no-store and browser-safety headers. A request identifier is propagated when valid or generated otherwise. `GET` and `HEAD` are supported; unsupported methods return `405`, and unknown paths return `404`.

## CI/CD Responsibilities

| Area | Implementation |
| --- | --- |
| Dependency management | `npm ci` installs from `package-lock.json`. |
| Static analysis | `scripts/lint.js` checks text hygiene and JavaScript syntax. |
| Automated tests | Node.js built-in test runner validates endpoint behavior. |
| Service smoke test | `scripts/smoke-test.js` starts the service and checks live endpoints. |
| Container packaging | Dockerfile builds a small Node.js runtime image. |
| Container smoke test | `scripts/container-smoke-test.js` waits for Docker health, then verifies live endpoints and writes runtime evidence. |
| Secondary CI | GitHub Actions runs the same package scripts and Docker verification path. |

## Deployment Model

The repository stops at a locally verified Docker image. Images carry an OCI revision label from `VCS_REF`; Jenkins and GitHub Actions provide the current commit to the application and image build. There is no registry push, cloud deployment, or production release target. A real deployment extension would add a registry login, image push, environment-specific configuration, and a deployment command for the chosen platform.
