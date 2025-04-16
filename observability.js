
// Simplified observability implementation for production
export const observabilityMiddleware = [(req, res, next) => next()];
export const healthCheckMiddleware = (req, res) => res.json({ status: 'ok' });
export const setupObservability = () => console.log('Observability disabled in production');
export const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug
};
