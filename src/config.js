export function parsePort(value) {
  const normalizedValue = String(value);

  if (!/^\d+$/.test(normalizedValue)) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  const port = Number(normalizedValue);

  if (port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return port;
}
