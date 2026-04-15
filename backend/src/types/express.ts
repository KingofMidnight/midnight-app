import { AuthUser } from "./index";

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
  }
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
    jwt?: string;
    file?: Express.Multer.File;
    files?: Express.Multer.File | Express.Multer.File[] | { [fieldname: string]: Express.Multer.File | Express.Multer.File[] };
  }
}
