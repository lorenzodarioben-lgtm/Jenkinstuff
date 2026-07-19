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

export function parseHost(value) {
  const host = String(value);

  if (!/^[A-Za-z0-9._:-]+$/.test(host)) {
    throw new Error(`Invalid HOST value: ${value}`);
  }

  return host;
}

export function getRuntimeConfig(environment = process.env) {
  return {
    port: parsePort(environment.PORT || '3000'),
    host: parseHost(environment.HOST || '0.0.0.0')
  };
}
