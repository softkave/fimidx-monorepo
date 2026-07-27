import type {ErrorRequestHandler} from 'express';
import {kOwnServerErrorCodes, OwnServerError} from 'fimidx-core/common/error';
import {ZodError} from 'zod';
import type {IHttpOutgoingErrorResponse} from '../types/http.js';
import {fimidxNodeWinstonLogger} from '../utils/fimidxNodeloggers.js';

export const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
  fimidxNodeWinstonLogger.error('Request error', {
    error: err,
    url: req.url,
    method: req.method,
  });

  if (res.headersSent) {
    next(err);
    return;
  }

  let statusCode: number = kOwnServerErrorCodes.InternalServerError;
  let message = 'Unknown error';

  if (OwnServerError.isOwnServerError(err)) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = kOwnServerErrorCodes.BadRequest;
    message = err.message;
  } else if (err instanceof Error) {
    message = err.message;
  }

  const response: IHttpOutgoingErrorResponse = {
    type: 'error',
    message,
  };
  res.status(statusCode).send(response);
};
