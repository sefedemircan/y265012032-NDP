"use client";

import { Badge, Button, Group, Table, Text } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelAppointment, decideAppointment } from "@/app/actions/clinic";
import type { AppointmentView } from "@/application/views";
import { formatAppointmentTime, formatFeeKurus, STATUS_LABELS } from "@/lib/format";
import { toast } from "./toast";

const COLORS = {
  PENDING: "yellow",
  APPROVED: "teal",
  REJECTED: "red",
  CANCELLED: "gray",
} as const;

export function AppointmentList({
  rows,
  showPatient = false,
  allowCancel = false,
  allowDecision = false,
}: {
  rows: AppointmentView[];
  showPatient?: boolean;
  allowCancel?: boolean;
  allowDecision?: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function run(id: string, action: () => Promise<{ error?: string; message?: string }>) {
    setPendingId(id);
    const result = await action();
    toast(result);
    setPendingId(null);
    if (!result.error) router.refresh();
  }

  if (rows.length === 0) {
    return <Text c="dimmed">Kayıtlı randevu yok.</Text>;
  }

  return (
    <Table.ScrollContainer minWidth={720}>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Tarih</Table.Th>
            <Table.Th>Hizmet</Table.Th>
            <Table.Th>Kurum</Table.Th>
            <Table.Th>Personel</Table.Th>
            {showPatient ? <Table.Th>Hasta</Table.Th> : null}
            <Table.Th>Süre / ücret</Table.Th>
            <Table.Th>Durum</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => (
            <Table.Tr key={row.id}>
              <Table.Td>{formatAppointmentTime(row.startsAt)}</Table.Td>
              <Table.Td>{row.serviceName}</Table.Td>
              <Table.Td>{row.facilityName}</Table.Td>
              <Table.Td>{row.staffName}</Table.Td>
              {showPatient ? <Table.Td>{row.patientName}</Table.Td> : null}
              <Table.Td>
                {row.durationMinutes} dk · {formatFeeKurus(row.feeKurus)}
              </Table.Td>
              <Table.Td>
                <Badge color={COLORS[row.status]} variant="light">
                  {STATUS_LABELS[row.status]}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Group gap="xs" justify="flex-end">
                  {allowDecision && row.status === "PENDING" ? (
                    <>
                      <Button
                        size="xs"
                        loading={pendingId === row.id}
                        onClick={() => run(row.id, () => decideAppointment(row.id, "approve"))}
                      >
                        Onayla
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        loading={pendingId === row.id}
                        onClick={() => run(row.id, () => decideAppointment(row.id, "reject"))}
                      >
                        Reddet
                      </Button>
                    </>
                  ) : null}
                  {allowCancel && (row.status === "PENDING" || row.status === "APPROVED") ? (
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      loading={pendingId === row.id}
                      onClick={() => run(row.id, () => cancelAppointment(row.id))}
                    >
                      İptal
                    </Button>
                  ) : null}
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
