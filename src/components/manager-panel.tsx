"use client";

import {
  Button,
  Checkbox,
  Group,
  MultiSelect,
  NumberInput,
  Paper,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addBranch,
  addDepartment,
  addService,
  addStaff,
  removeAvailability,
  saveAvailability,
  saveHours,
} from "@/app/actions/clinic";
import type { ManagedFacility, ManagerDashboard } from "@/application/views";
import { CATEGORY_LABELS, formatMinutes, WEEKDAY_LABELS } from "@/lib/format";
import { AppointmentList } from "./appointment-list";
import { toast } from "./toast";

export function ManagerPanel({ data }: { data: ManagerDashboard }) {
  const [facilityId, setFacilityId] = useState<string | null>(data.facilities[0]?.id ?? null);
  const facility = data.facilities.find((item) => item.id === facilityId) ?? data.facilities[0];
  const options = data.facilities.map((item) => ({
    value: item.id,
    label: `${item.name} (${item.kind === "hospital" ? "hastane" : "klinik"})`,
  }));

  return (
    <Stack gap="lg">
      <Paper withBorder p="lg" radius="md" bg="white">
        <Group justify="space-between">
          <div>
            <Title order={3}>{data.organizationName}</Title>
            <Text c="dimmed" size="sm">
              {data.organizationKind === "hospital" ? "Çok şubeli hastane" : "Bağımsız klinik"}
            </Text>
          </div>
          <Select label="Kayıt yapılan birim" data={options} value={facility?.id ?? null} onChange={setFacilityId} w={280} />
        </Group>
      </Paper>

      <Tabs defaultValue="saatler" variant="outline">
        <Tabs.List>
          {data.organizationKind === "hospital" ? <Tabs.Tab value="sube">Şubeler</Tabs.Tab> : null}
          <Tabs.Tab value="saatler">Çalışma saatleri</Tabs.Tab>
          <Tabs.Tab value="bolum">Bölümler</Tabs.Tab>
          <Tabs.Tab value="hizmet">Hizmetler</Tabs.Tab>
          <Tabs.Tab value="personel">Personel</Tabs.Tab>
          <Tabs.Tab value="uygunluk">Uygunluk</Tabs.Tab>
          <Tabs.Tab value="onay">Onaylar</Tabs.Tab>
        </Tabs.List>
        {data.organizationKind === "hospital" ? (
          <Tabs.Panel value="sube" pt="md">
            <BranchTab facilities={data.facilities} />
          </Tabs.Panel>
        ) : null}
        <Tabs.Panel value="saatler" pt="md">
          {facility ? <HoursForm key={facility.id} facility={facility} /> : null}
        </Tabs.Panel>
        <Tabs.Panel value="bolum" pt="md">
          {facility ? <DepartmentForm facility={facility} /> : null}
        </Tabs.Panel>
        <Tabs.Panel value="hizmet" pt="md">
          {facility ? <ServiceForm facility={facility} /> : null}
        </Tabs.Panel>
        <Tabs.Panel value="personel" pt="md">
          {facility ? <StaffForm facility={facility} /> : null}
        </Tabs.Panel>
        <Tabs.Panel value="uygunluk" pt="md">
          {facility ? <SlotForm facility={facility} /> : null}
        </Tabs.Panel>
        <Tabs.Panel value="onay" pt="md">
          <Paper withBorder p="lg" radius="md" bg="white">
            <AppointmentList rows={data.pending} showPatient allowDecision />
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

function BranchTab({ facilities }: { facilities: ManagedFacility[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const branches = facilities.filter((item) => item.kind === "clinic");

  return (
    <Paper withBorder p="lg" radius="md" bg="white">
      <Stack>
        <Title order={4}>Şubeler</Title>
        {branches.map((branch) => (
          <Text key={branch.id}>{branch.name}</Text>
        ))}
        {branches.length === 0 ? <Text c="dimmed">Henüz şube yok.</Text> : null}
        <TextInput label="Yeni şube adı" value={name} onChange={(event) => setName(event.currentTarget.value)} />
        <Button
          w="fit-content"
          loading={loading}
          onClick={async () => {
            setLoading(true);
            const result = await addBranch(name);
            toast(result);
            setLoading(false);
            if (!result.error) {
              setName("");
              router.refresh();
            }
          }}
        >
          Şube ekle
        </Button>
      </Stack>
    </Paper>
  );
}

function HoursForm({ facility }: { facility: ManagedFacility }) {
  const router = useRouter();
  const initial = useMemo(() => {
    return WEEKDAY_LABELS.map((label, dayOfWeek) => {
      const existing = facility.hours.find((hour) => hour.dayOfWeek === dayOfWeek);
      return {
        label,
        dayOfWeek,
        open: Boolean(existing),
        start: existing ? formatMinutes(existing.startMinute) : "09:00",
        end: existing ? formatMinutes(existing.endMinute) : "17:00",
      };
    });
  }, [facility]);
  const [rows, setRows] = useState(initial);
  const [loading, setLoading] = useState(false);

  return (
    <Paper withBorder p="lg" radius="md" bg="white">
      <Stack>
        <Title order={4}>{facility.name} çalışma saatleri</Title>
        {rows.map((row, index) => (
          <SimpleGrid key={row.dayOfWeek} cols={{ base: 1, sm: 4 }} style={{ alignItems: "end" }}>
            <Checkbox
              label={row.label}
              checked={row.open}
              onChange={(event) => {
                const next = [...rows];
                next[index] = { ...row, open: event.currentTarget.checked };
                setRows(next);
              }}
              mt="lg"
            />
            <TextInput
              label="Başlangıç"
              disabled={!row.open}
              value={row.start}
              onChange={(event) => {
                const next = [...rows];
                next[index] = { ...row, start: event.currentTarget.value };
                setRows(next);
              }}
            />
            <TextInput
              label="Bitiş"
              disabled={!row.open}
              value={row.end}
              onChange={(event) => {
                const next = [...rows];
                next[index] = { ...row, end: event.currentTarget.value };
                setRows(next);
              }}
            />
          </SimpleGrid>
        ))}
        <Button
          w="fit-content"
          loading={loading}
          onClick={async () => {
            setLoading(true);
            const result = await saveHours(
              facility.id,
              rows.filter((row) => row.open).map((row) => ({ dayOfWeek: row.dayOfWeek, start: row.start, end: row.end })),
            );
            toast(result);
            setLoading(false);
            if (!result.error) router.refresh();
          }}
        >
          Saatleri kaydet
        </Button>
      </Stack>
    </Paper>
  );
}

function DepartmentForm({ facility }: { facility: ManagedFacility }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Paper withBorder p="lg" radius="md" bg="white">
      <Stack>
        <Title order={4}>{facility.name} bölümleri</Title>
        {facility.departments.map((department) => (
          <Text key={department.id}>{department.name}</Text>
        ))}
        <TextInput label="Yeni bölüm" value={name} onChange={(event) => setName(event.currentTarget.value)} />
        <Button
          w="fit-content"
          loading={loading}
          onClick={async () => {
            setLoading(true);
            const result = await addDepartment(facility.id, name);
            toast(result);
            setLoading(false);
            if (!result.error) {
              setName("");
              router.refresh();
            }
          }}
        >
          Bölüm ekle
        </Button>
      </Stack>
    </Paper>
  );
}

function ServiceForm({ facility }: { facility: ManagedFacility }) {
  const router = useRouter();
  const [departmentId, setDepartmentId] = useState<string | null>(facility.departments[0]?.id ?? null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("examination");
  const [duration, setDuration] = useState<number | string>(20);
  const [fee, setFee] = useState("500");
  const [loading, setLoading] = useState(false);

  return (
    <Paper withBorder p="lg" radius="md" bg="white">
      <Stack>
        <Title order={4}>Hizmetler</Title>
        {facility.departments.flatMap((department) =>
          department.services.map((service) => (
            <Text key={service.id}>
              {department.name} · {service.name} · {CATEGORY_LABELS[service.category]} · {service.durationMinutes} dk
            </Text>
          )),
        )}
        <Select
          label="Bölüm"
          data={facility.departments.map((department) => ({ value: department.id, label: department.name }))}
          value={departmentId}
          onChange={setDepartmentId}
        />
        <TextInput label="Hizmet adı" value={name} onChange={(event) => setName(event.currentTarget.value)} />
        <Select
          label="Tür"
          data={[
            { value: "examination", label: "Muayene" },
            { value: "diagnostic", label: "Tanı" },
            { value: "laboratory", label: "Laboratuvar" },
          ]}
          value={category}
          onChange={(value) => setCategory(value ?? "examination")}
        />
        <NumberInput label="Süre (dakika)" min={1} value={duration} onChange={setDuration} />
        <TextInput label="Ücret (TL)" value={fee} onChange={(event) => setFee(event.currentTarget.value)} />
        <Button
          w="fit-content"
          loading={loading}
          onClick={async () => {
            if (!departmentId) return;
            setLoading(true);
            const result = await addService({
              facilityId: facility.id,
              departmentId,
              name,
              category,
              durationMinutes: Number(duration),
              feeLira: fee,
            });
            toast(result);
            setLoading(false);
            if (!result.error) {
              setName("");
              router.refresh();
            }
          }}
        >
          Hizmet ekle
        </Button>
      </Stack>
    </Paper>
  );
}

function StaffForm({ facility }: { facility: ManagedFacility }) {
  const router = useRouter();
  const [role, setRole] = useState<"doctor" | "health_personnel">("doctor");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const services = facility.departments.flatMap((department) =>
    department.services
      .filter((service) => (role === "doctor" ? service.category === "examination" : service.category !== "examination"))
      .map((service) => ({ value: service.id, label: `${department.name} · ${service.name}` })),
  );

  return (
    <Paper withBorder p="lg" radius="md" bg="white">
      <Stack>
        <Title order={4}>{facility.name} personeli</Title>
        {facility.staff.map((member) => (
          <Text key={member.id}>
            {member.fullName}
            {member.specialty ? ` · ${member.specialty}` : ""} · {member.email}
          </Text>
        ))}
        <Select
          label="Rol"
          data={[
            { value: "doctor", label: "Doktor" },
            { value: "health_personnel", label: "Sağlık personeli" },
          ]}
          value={role}
          onChange={(value) => {
            setRole(value === "health_personnel" ? "health_personnel" : "doctor");
            setServiceIds([]);
          }}
        />
        <TextInput
          label="Ad soyad"
          name="staffName"
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.currentTarget.value)}
        />
        <TextInput
          label="E-posta"
          name="staffEmail"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
        />
        <PasswordInput
          label="Parola"
          name="staffNewPassword"
          autoComplete="new-password"
          visible={false}
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
        {role === "doctor" ? (
          <TextInput label="Uzmanlık" value={specialty} onChange={(event) => setSpecialty(event.currentTarget.value)} />
        ) : null}
        <MultiSelect label="Verdiği hizmetler" data={services} value={serviceIds} onChange={setServiceIds} />
        <Button
          w="fit-content"
          loading={loading}
          onClick={async () => {
            setLoading(true);
            const result = await addStaff({
              facilityId: facility.id,
              role,
              fullName,
              email,
              password,
              specialty,
              serviceIds,
            });
            toast(result);
            setLoading(false);
            if (!result.error) {
              setFullName("");
              setEmail("");
              setPassword("");
              setSpecialty("");
              setServiceIds([]);
              router.refresh();
            }
          }}
        >
          Personeli kaydet
        </Button>
      </Stack>
    </Paper>
  );
}

function SlotForm({ facility }: { facility: ManagedFacility }) {
  const router = useRouter();
  const [staffId, setStaffId] = useState<string | null>(facility.staff[0]?.id ?? null);
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("12:00");
  const [loading, setLoading] = useState(false);
  const member = facility.staff.find((item) => item.id === staffId);

  return (
    <Paper withBorder p="lg" radius="md" bg="white">
      <Stack>
        <Title order={4}>Personel uygunluğu</Title>
        <Select
          label="Personel"
          data={facility.staff.map((item) => ({ value: item.id, label: item.fullName }))}
          value={staffId}
          onChange={setStaffId}
        />
        {member?.slots.map((slot) => (
          <Group key={slot.id} justify="space-between">
            <Text>
              {WEEKDAY_LABELS[slot.dayOfWeek]} {formatMinutes(slot.startMinute)}–{formatMinutes(slot.endMinute)}
            </Text>
            <Button
              size="xs"
              variant="subtle"
              color="red"
              onClick={async () => {
                const result = await removeAvailability(slot.id);
                toast(result);
                if (!result.error) router.refresh();
              }}
            >
              Sil
            </Button>
          </Group>
        ))}
        <Select
          label="Gün"
          value={dayOfWeek}
          onChange={(value) => setDayOfWeek(value ?? "1")}
          data={WEEKDAY_LABELS.map((label, index) => ({ value: String(index), label }))}
        />
        <TextInput label="Başlangıç" value={start} onChange={(event) => setStart(event.currentTarget.value)} />
        <TextInput label="Bitiş" value={end} onChange={(event) => setEnd(event.currentTarget.value)} />
        <Button
          w="fit-content"
          loading={loading}
          disabled={!staffId}
          onClick={async () => {
            if (!staffId) return;
            setLoading(true);
            const result = await saveAvailability({
              staffId,
              dayOfWeek: Number(dayOfWeek),
              start,
              end,
            });
            toast(result);
            setLoading(false);
            if (!result.error) router.refresh();
          }}
        >
          Dilimi kaydet
        </Button>
      </Stack>
    </Paper>
  );
}
