import test from 'node:test';
import assert from 'node:assert/strict';
import { createShutdownHandler } from '../src/shutdown.js';

function createLogger() {
  return {
    error() {},
    log() {},
    warn() {}
  };
}

test('shutdown exits successfully after the HTTP server closes', () => {
  const exitCodes = [];
  let clearedTimer;
  const handler = createShutdownHandler({
    close(callback) {
      callback();
    }
  }, {
    clearTimer(timer) {
      clearedTimer = timer;
    },
    exit(code) {
      exitCodes.push(code);
    },
    logger: createLogger(),
    setTimer() {
      return 'timer-id';
    }
  });

  handler('SIGTERM');

  assert.deepEqual(exitCodes, [0]);
  assert.equal(clearedTimer, 'timer-id');
});

test('shutdown is idempotent while a close is still in progress', () => {
  let closeCalls = 0;
  const handler = createShutdownHandler({
    close() {
      closeCalls += 1;
    }
  }, {
    exit() {},
    logger: createLogger(),
    setTimer() {
      return 'timer-id';
    }
  });

  handler('SIGTERM');
  handler('SIGINT');

  assert.equal(closeCalls, 1);
});

test('shutdown forces a failing exit when the close deadline is exceeded', () => {
  const exitCodes = [];
  let timerCallback;
  const handler = createShutdownHandler({
    close() {}
  }, {
    exit(code) {
      exitCodes.push(code);
    },
    logger: createLogger(),
    setTimer(callback) {
      timerCallback = callback;
      return 'timer-id';
    }
  });

  handler('SIGTERM');
  timerCallback();

  assert.deepEqual(exitCodes, [1]);
});
