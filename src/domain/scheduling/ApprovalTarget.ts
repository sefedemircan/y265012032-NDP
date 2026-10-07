export type AppointmentStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface ApprovalTarget {
  getStaffId(): string;
  getOrganizationId(): string;
  getStatus(): AppointmentStatus;
}
