import { Role } from "../../../generated/prisma/enums.js";

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}