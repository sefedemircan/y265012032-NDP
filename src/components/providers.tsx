"use client";

import { createTheme, MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { Notifications } from "@mantine/notifications";
import "dayjs/locale/tr";

const theme = createTheme({
  primaryColor: "teal",
  defaultRadius: "md",
  fontFamily: "var(--font-manrope), sans-serif",
  headings: { fontFamily: "var(--font-manrope), sans-serif" },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} forceColorScheme="light">
      <DatesProvider settings={{ locale: "tr", firstDayOfWeek: 1 }}>
        <Notifications position="top-right" />
        {children}
      </DatesProvider>
    </MantineProvider>
  );
}
