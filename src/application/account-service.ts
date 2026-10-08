import { DomainError } from "@/domain/errors";
import { Clinic } from "@/domain/organization/Clinic";
import { Hospital } from "@/domain/organization/Hospital";
import { Doctor } from "@/domain/users/Doctor";
import { HealthPersonnel } from "@/domain/users/HealthPersonnel";
import type { ClinicManager } from "@/domain/users/ClinicManager";
import { assertPassword } from "./guards";
import type { AccountGateway, ClinicStore } from "./ports";

export class AccountService {
  constructor(
    private readonly store: ClinicStore,
    private readonly accounts: AccountGateway,
  ) {}

  async registerManager(input: {
    fullName: string;
    email: string;
    password: string;
    facilityName: string;
    kind: "hospital" | "clinic";
  }): Promise<void> {
    assertPassword(input.password);
    const facilityId = crypto.randomUUID();
    if (input.kind === "hospital") new Hospital(facilityId, input.facilityName, [], []);
    else new Clinic(facilityId, input.facilityName, facilityId, [], []);

    const userId = await this.accounts.createConfirmedUser({
      email: input.email.trim(),
      password: input.password,
      fullName: input.fullName.trim(),
    });

    try {
      await this.accounts.insertFacility({
        id: facilityId,
        name: input.facilityName.trim(),
        kind: input.kind,
        parentId: null,
      });
      await this.accounts.assignProfile({
        id: userId,
        fullName: input.fullName.trim(),
        email: input.email.trim(),
        role: "clinic_manager",
        specialty: null,
        facilityId,
      });
    } catch (error) {
      await this.accounts.deleteFacility(facilityId).catch(() => undefined);
      await this.accounts.deleteUser(userId).catch(() => undefined);
      throw error;
    }
  }

  async registerStaff(
    manager: ClinicManager,
    input: {
      facilityId: string;
      role: "doctor" | "health_personnel";
      fullName: string;
      email: string;
      password: string;
      specialty: string;
      serviceIds: string[];
    },
  ): Promise<void> {
    assertPassword(input.password);
    if (input.serviceIds.length === 0) throw new DomainError("Personelin en az bir hizmeti olmalıdır.");

    const snapshot = await this.store.load();
    const facility = snapshot.requireFacility(input.facilityId);
    if (!manager.managesOrganization(facility.getOrganizationId())) {
      throw new DomainError("Bu kurum yetkinizin dışında.");
    }

    const services = input.serviceIds.map((id) => snapshot.requireService(id));
    for (const service of services) {
      if (service.getFacilityId() !== facility.getId()) {
        throw new DomainError("Hizmet personelin kurumuna ait değil.");
      }
    }

    const fullName = input.fullName.trim();
    const email = input.email.trim();
    const draft =
      input.role === "doctor"
        ? new Doctor("taslak", fullName, email, input.specialty, facility.getId(), input.serviceIds)
        : new HealthPersonnel("taslak", fullName, email, facility.getId(), input.serviceIds);
    draft.assertCanOffer(services);

    const userId = await this.accounts.createConfirmedUser({
      email,
      password: input.password,
      fullName,
    });

    try {
      await this.accounts.assignProfile({
        id: userId,
        fullName,
        email,
        role: input.role,
        specialty: input.role === "doctor" ? input.specialty.trim() : null,
        facilityId: facility.getId(),
      });
      await this.store.replaceStaffServices(userId, input.serviceIds);
    } catch (error) {
      await this.accounts.deleteUser(userId).catch(() => undefined);
      throw error;
    }
  }
}
