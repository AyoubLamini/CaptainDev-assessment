import { Identity } from '@prisma/client';

declare global {
  namespace Express {
    export interface Request {
      identity?: Identity;
    }
  }
}
