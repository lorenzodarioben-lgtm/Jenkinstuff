import { createServer } from './app.js';
import { getRuntimeConfig } from './config.js';
import { createShutdownHandler } from './shutdown.js';

const { host, port } = getRuntimeConfig();
const server = createServer();

server.listen(port, host, () => {
  console.log(`jenkins-cicd-pipeline listening on http://${host}:${port}`);
});

const shutdown = createShutdownHandler(server);

server.on('error', (error) => {
  console.error(`Server failed to start: ${error.message}`);
  process.exit(1);
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
