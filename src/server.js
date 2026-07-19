import { createServer } from './app.js';
import { getRuntimeConfig } from './config.js';

const { host, port } = getRuntimeConfig();
const server = createServer();

server.listen(port, host, () => {
  console.log(`jenkins-cicd-pipeline listening on http://${host}:${port}`);
});

function shutdown(signal) {
  console.log(`${signal} received. Closing HTTP server.`);
  server.close((error) => {
    process.exit(error ? 1 : 0);
  });
}

server.on('error', (error) => {
  console.error(`Server failed to start: ${error.message}`);
  process.exit(1);
});

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
