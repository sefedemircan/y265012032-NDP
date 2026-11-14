"use client";

import { Button, Group, Paper, Select, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { bookAppointment, listOpenSlots } from "@/app/actions/clinic";
import type { OpenSlot, PatientDashboard } from "@/application/views";
import { CATEGORY_LABELS, formatFeeKurus } from "@/lib/format";
import { AppointmentList } from "./appointment-list";
import { toast } from "./toast";

function dateValue(value: string | Date | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return dayjs(value).format("YYYY-MM-DD");
  return value.slice(0, 10);
}

export function PatientPanel({ data }: { data: PatientDashboard }) {
  const router = useRouter();
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<OpenSlot[]>([]);
  const [startMinute, setStartMinute] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  const facility = data.facilities.find((item) => item.id === facilityId) ?? null;
  const department = facility?.departments.find((item) => item.id === departmentId) ?? null;
  const service = department?.services.find((item) => item.id === serviceId) ?? null;

  const facilityOptions = useMemo(
    () =>
      data.facilities.map((item) => ({
        value: item.id,
        label: item.organizationName === item.name ? item.name : `${item.organizationName} · ${item.name}`,
      })),
    [data.facilities],
  );

  async function loadSlots() {
    if (!facilityId || !serviceId || !staffId || !date) return;
    setLoadingSlots(true);
    const result = await listOpenSlots({ facilityId, serviceId, staffId, date });
    setLoadingSlots(false);
    if ("error" in result) {
      toast({ error: result.error });
      setSlots([]);
      return;
    }
    setSlots(result.slots);
    setStartMinute(null);
    if (result.slots.length === 0) toast({ message: "Bu günde uygun saat yok." });
  }

  return (
    <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
      <Paper withBorder p="lg" radius="md" bg="white">
        <Stack>
          <Title order={3}>Randevu al</Title>
          <Select
            label="Kurum"
            placeholder="Klinik veya şube"
            data={facilityOptions}
            value={facilityId}
            onChange={(value) => {
              setFacilityId(value);
              setDepartmentId(null);
              setServiceId(null);
              setStaffId(null);
              setSlots([]);
              setStartMinute(null);
            }}
          />
          <Select
            label="Bölüm"
            data={(facility?.departments ?? []).map((item) => ({ value: item.id, label: item.name }))}
            value={departmentId}
            onChange={(value) => {
              setDepartmentId(value);
              setServiceId(null);
              setStaffId(null);
              setSlots([]);
              setStartMinute(null);
            }}
            disabled={!facility}
          />
          <Select
            label="Hizmet"
            data={(department?.services ?? []).map((item) => ({
              value: item.id,
              label: `${item.name} · ${CATEGORY_LABELS[item.category]} · ${item.durationMinutes} dk · ${formatFeeKurus(item.feeKurus)}`,
            }))}
            value={serviceId}
            onChange={(value) => {
              setServiceId(value);
              setStaffId(null);
              setSlots([]);
              setStartMinute(null);
            }}
            disabled={!department}
          />
          <Select
            label="Personel"
            data={(service?.staff ?? []).map((item) => ({
              value: item.id,
              label: item.specialty ? `${item.fullName} · ${item.specialty}` : item.fullName,
            }))}
            value={staffId}
            onChange={(value) => {
              setStaffId(value);
              setSlots([]);
              setStartMinute(null);
            }}
            disabled={!service}
          />
          <DatePickerInput
            label="Tarih"
            value={date}
            onChange={(value) => {
              setDate(dateValue(value));
              setSlots([]);
              setStartMinute(null);
            }}
            minDate={dayjs().format("YYYY-MM-DD")}
            maxDate={dayjs().add(30, "day").format("YYYY-MM-DD")}
            disabled={!staffId}
          />
          <Group>
            <Button variant="light" loading={loadingSlots} disabled={!date} onClick={loadSlots}>
              Uygun saatleri göster
            </Button>
          </Group>
          <Select
            label="Saat"
            placeholder={slots.length ? "Saat seçin" : "Önce saatleri getirin"}
            data={slots.map((slot) => ({ value: String(slot.startMinute), label: slot.label }))}
            value={startMinute}
            onChange={setStartMinute}
            disabled={slots.length === 0}
          />
          <Button
            loading={booking}
            disabled={!facilityId || !serviceId || !staffId || !date || !startMinute}
            onClick={async () => {
              if (!facilityId || !serviceId || !staffId || !date || !startMinute) return;
              setBooking(true);
              const result = await bookAppointment({
                facilityId,
                serviceId,
                staffId,
                date,
                startMinute: Number(startMinute),
              });
              toast(result);
              setBooking(false);
              if (!result.error) {
                setSlots([]);
                setStartMinute(null);
                router.refresh();
              }
            }}
          >
            Randevu talep et
          </Button>
          <Text size="sm" c="dimmed">
            Talep onay bekler. Saat, personelin uygunluğu ve kurumun çalışma saati içinde olmalıdır.
          </Text>
        </Stack>
      </Paper>
      <Paper withBorder p="lg" radius="md" bg="white">
        <Stack>
          <Title order={3}>Randevularım</Title>
          <AppointmentList rows={data.appointments} allowCancel />
        </Stack>
      </Paper>
    </SimpleGrid>
  );
}
