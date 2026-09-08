import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ZodType } from 'zod';

function formatIssues(issues: { path: (string | number)[]; message: string }[]): string {
  return issues.map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`).join('; ');
}

export function validateBody<T>(schema: ZodType<T>): RequestHandler<ParamsDictionary, unknown, T> {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: { message: formatIssues(result.error.issues), code: 'VALIDATION_ERROR' },
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateParams<T>(schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: { message: formatIssues(result.error.issues), code: 'VALIDATION_ERROR' },
      });
      return;
    }
    next();
  };
}
