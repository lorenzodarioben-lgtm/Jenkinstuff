export function createShutdownHandler(server, options = {}) {
  const exit = options.exit ?? process.exit;
  const logger = options.logger ?? console;
  const forceAfterMs = options.forceAfterMs ?? 10_000;
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;
  let shuttingDown = false;

  return (signal) => {
    if (shuttingDown) {
      logger.warn(`${signal} received while the server is already closing.`);
      return;
    }

    shuttingDown = true;
    logger.log(`${signal} received. Closing HTTP server.`);

    const forceTimer = setTimer(() => {
      logger.error('HTTP server did not close before the shutdown deadline.');
      exit(1);
    }, forceAfterMs);

    server.close((error) => {
      clearTimer(forceTimer);
      exit(error ? 1 : 0);
    });
  };
}
