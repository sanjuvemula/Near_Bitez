// server/middleware/async.js
// This magically wraps our controllers and funnels any errors to the global error handler in server.js
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;