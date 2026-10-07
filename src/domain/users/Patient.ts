import { User, type UserRole } from "./User";

export class Patient extends User {
  getRole(): UserRole {
    return "patient";
  }

  canApprove(): boolean {
    return false;
  }
}
