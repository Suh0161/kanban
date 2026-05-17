import { AsyncLocalStorage } from 'async_hooks';

const requestContext = new AsyncLocalStorage();

export function runWithRequestContext(context, callback) {
  return requestContext.run(context, callback);
}

export function getRequestContext() {
  return requestContext.getStore() || {};
}
