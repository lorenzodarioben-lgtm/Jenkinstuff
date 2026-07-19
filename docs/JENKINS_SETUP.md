# Jenkins Setup

These notes describe how to run the pipeline from a Jenkins controller or local Jenkins sandbox.

## Required Agent Tools

Install these on the Jenkins agent:

- Git.
- Node.js 22 or newer.
- npm 10 or newer.
- Docker and Docker Compose, if container build checks are enabled.

## Recommended Jenkins Job

Create a Multibranch Pipeline or Pipeline from SCM job:

1. Source: Git.
2. Repository URL: `https://github.com/lorenzodarioben-lgtm/jenkins-cicd-pipeline.git`
3. Branch: `main` or a feature branch.
4. Script path: `Jenkinsfile`.

## Environment Flags

| Variable | Default | Description |
| --- | --- | --- |
| `BUILD_CONTAINER` | enabled | Set to `false` when the Jenkins agent does not have Docker daemon access. |

## Expected Flow

1. Jenkins checks out the repository.
2. Jenkins records the checked-out commit and the Node.js and npm versions available on the agent.
3. `npm ci` installs dependencies from the lockfile.
4. `npm run lint`, `npm test`, and `npm run smoke` validate the service.
5. If Docker is enabled, Jenkins builds the image with its commit revision and runs `npm run smoke:container` after Docker reports the container healthy.
6. `npm run audit` checks production dependencies and marks the build unstable if the audit fails.
7. Smoke-test reports are archived when present.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `node` not found | Install Node.js on the Jenkins agent or use an agent image that includes Node. |
| `npm ci` fails | Confirm `package-lock.json` is committed and npm can read the workspace. |
| Docker build fails | Check Docker daemon access for the Jenkins user. |
| Container smoke test fails | Inspect the container logs printed by `scripts/container-smoke-test.js`. |
| A response cannot be correlated to a build | Use the `X-Request-Id` in the response together with the `commit` field from `/health` or `/api/version`. |
| Security audit marks unstable | Review the audit output and update affected dependencies before treating the build as releasable. |
