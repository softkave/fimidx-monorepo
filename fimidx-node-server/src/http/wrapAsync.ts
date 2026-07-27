import type {NextFunction, Request, RequestHandler, Response} from 'express';

/**
 * Forwards rejected promises from async route handlers to Express error
 * middleware via `next(err)`. Required because fire-and-forget wrappers drop
 * rejections even on Express 5.
 */
export function wrapAsync(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
