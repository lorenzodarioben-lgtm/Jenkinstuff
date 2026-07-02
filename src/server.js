import { createServer } from './app.js';

function parsePort(value) {
  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return port;
}

const port = parsePort(process.env.PORT || '3000');
const host = process.env.HOST || '0.0.0.0';
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
