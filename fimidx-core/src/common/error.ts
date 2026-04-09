import { isObject } from "lodash-es";
import type { AnyObject } from "softkave-js-utils";

export const kOwnError = Symbol("OwnError");
export const kOwnServerError = Symbol("OwnServerError");

export class OwnError extends Error {
  static isOwnError(error: unknown): error is OwnError {
    return isObject(error) && (error as AnyObject)[kOwnError] === true;
  }

  [kOwnError]: true = true as const;
  meta?: AnyObject;

  constructor(message: string, meta?: AnyObject) {
    super(message);
    this.meta = meta;
  }
}

export class OwnServerError extends OwnError {
  static isOwnServerError(error: unknown): error is OwnServerError {
    return (
      OwnError.isOwnError(error) &&
      (error as AnyObject)[kOwnServerError] === true
    );
  }

  [kOwnServerError]: true = true as const;
  statusCode: number;

  constructor(message: string, statusCode: number, meta?: AnyObject) {
    super(message, meta);
    this.statusCode = statusCode;
  }
}

export const kOwnServerErrorCodes = {
  BadRequest: 400,
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  Conflict: 409,
  InternalServerError: 500,
} as const;
