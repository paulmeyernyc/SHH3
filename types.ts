/**
 * Extended types for the Error Framework
 */

import { Request as ExpressRequest } from 'express';

declare global {
  namespace Express {
    export interface Request {
      id?: string;
      user?: {
        id: string | number;
        [key: string]: any;
      };
    }
  }
}