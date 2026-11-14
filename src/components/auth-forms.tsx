"use client";

import { Button, PasswordInput, Select, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { signInAsDemo, signUpManager, signUpPatient } from "@/app/actions/auth";
import { DEMO_ACCOUNTS } from "@/lib/demo-accounts";
import { toast } from "./toast";

export function LoginForm() {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(DEMO_ACCOUNTS[0]?.email ?? null);
  const [loading, setLoading] = useState(false);

  const demoOptions = DEMO_ACCOUNTS.map((account) => ({
    value: account.email,
    label: `${account.fullName} · ${account.description}`,
  }));

  return (
    <form
      className="authForm"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!selectedEmail) {
          toast({ error: "Bir demo hesap seçin." });
          return;
        }
        setLoading(true);
        const result = await signInAsDemo(selectedEmail);
        if (result?.error) toast(result);
        setLoading(false);
      }}
    >
      <Stack gap="md">
        <Select
          label="Demo hesap"
          placeholder="Hesap seçin"
          size="md"
          data={demoOptions}
          value={selectedEmail}
          onChange={setSelectedEmail}
          searchable
          nothingFoundMessage="Hesap bulunamadı"
        />
        <Button type="submit" loading={loading} size="md" radius="md" mt="xs" className="primaryAction">
          Seçili hesapla gir
        </Button>
      </Stack>
    </form>
  );
}

export function PatientRegisterForm() {
  const form = useForm({ initialValues: { fullName: "", email: "", password: "" } });
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="authForm"
      onSubmit={form.onSubmit(async (values) => {
        setLoading(true);
        const result = await signUpPatient(values);
        if (result?.error || result?.message) toast(result);
        setLoading(false);
      })}
    >
      <Stack gap="md">
        <TextInput
          label="Ad soyad"
          required
          size="md"
          {...form.getInputProps("fullName")}
          name="name"
          autoComplete="name"
        />
        <TextInput
          label="E-posta"
          required
          size="md"
          {...form.getInputProps("email")}
          name="email"
          autoComplete="email"
        />
        <PasswordInput
          label="Parola"
          required
          size="md"
          {...form.getInputProps("password")}
          name="new-password"
          autoComplete="new-password"
        />
        <Button type="submit" loading={loading} size="md" radius="md" mt="xs" className="primaryAction">
          Kaydol
        </Button>
      </Stack>
    </form>
  );
}

export function ManagerRegisterForm() {
  const form = useForm({
    initialValues: {
      fullName: "",
      email: "",
      password: "",
      facilityName: "",
      kind: "hospital" as "hospital" | "clinic",
    },
  });
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="authForm"
      onSubmit={form.onSubmit(async (values) => {
        setLoading(true);
        const result = await signUpManager(values);
        if (result?.error || result?.message) toast(result);
        setLoading(false);
      })}
    >
      <Stack gap="md">
        <TextInput
          label="Ad soyad"
          required
          size="md"
          {...form.getInputProps("fullName")}
          name="name"
          autoComplete="name"
        />
        <TextInput
          label="E-posta"
          required
          size="md"
          {...form.getInputProps("email")}
          name="email"
          autoComplete="email"
        />
        <PasswordInput
          label="Parola"
          required
          size="md"
          {...form.getInputProps("password")}
          name="new-password"
          autoComplete="new-password"
        />
        <TextInput
          label="Kurum adı"
          required
          size="md"
          {...form.getInputProps("facilityName")}
          name="organization"
          autoComplete="organization"
        />
        <Select
          label="Kurum türü"
          size="md"
          data={[
            { value: "hospital", label: "Hastane (şubeli olabilir)" },
            { value: "clinic", label: "Bağımsız klinik" },
          ]}
          {...form.getInputProps("kind")}
        />
        <Button type="submit" loading={loading} size="md" radius="md" mt="xs" className="primaryAction">
          Kurumu oluştur
        </Button>
      </Stack>
    </form>
  );
}
