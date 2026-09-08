import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

export function asyncHandler<P = ParamsDictionary, ResBody = unknown, ReqBody = unknown>(
  fn: (
    req: Request<P, ResBody, ReqBody>,
    res: Response<ResBody>,
    next: NextFunction,
  ) => Promise<void>,
): RequestHandler<P, ResBody, ReqBody> {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
