import { AuthUser } from "./index";

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
    jwt?: string;
  }
}

