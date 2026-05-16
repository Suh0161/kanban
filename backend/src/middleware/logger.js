export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const method = req.method;
    const url = req.originalUrl || req.url;
    const status = res.statusCode;
    const statusColor =
      status >= 500 ? '\x1b[31m' :
      status >= 400 ? '\x1b[33m' :
      status >= 300 ? '\x1b[36m' :
      '\x1b[32m';
    const reset = '\x1b[0m';
    console.log(
      `${statusColor}${method}${reset} ${url} ${statusColor}${status}${reset} ${duration}ms`
    );
  });

  next();
}
