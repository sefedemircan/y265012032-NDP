"use client";

import { notifications } from "@mantine/notifications";
import type { ActionResult } from "@/application/views";

export function toast(result: ActionResult): void {
  if (result.error) {
    notifications.show({ color: "red", title: "İşlem olmadı", message: result.error });
    return;
  }
  if (result.message) {
    notifications.show({ color: "teal", title: "Tamam", message: result.message });
  }
}
