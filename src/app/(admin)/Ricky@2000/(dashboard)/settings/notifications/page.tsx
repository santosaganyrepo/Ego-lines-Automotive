import type { Metadata } from "next"

import { DeviceAppSettings } from "@/components/admin/pwa/device-app-settings"
import { NotificationSettingsForm } from "@/components/admin/settings/notification-settings-form"
import { requirePermission } from "@/lib/auth/admin-guard"
import { can } from "@/lib/auth/permissions"
import { ADMIN_BASE_PATH } from "@/lib/constants/admin-routes"
import { isEmailSendingConfigured } from "@/lib/email/resend-client"
import { vapidPublicKey } from "@/lib/push/push-config"
import { listPushDevices } from "@/lib/queries/push.queries"
import { getBusinessSettings } from "@/lib/queries/settings.queries"

export const metadata: Metadata = {
  title: "Notifications · Settings",
}

export default async function NotificationSettingsPage() {
  const admin = await requirePermission("settings:read")
  const [settings, devices] = await Promise.all([getBusinessSettings(), listPushDevices(admin.id)])

  return (
    <>
      <NotificationSettingsForm
        settings={settings.notifications}
        // A yes/no about the deployment, never the key itself.
        emailConfigured={isEmailSendingConfigured()}
        canEdit={can(admin.role, "settings:write")}
      />
      {/* This device and this administrator: not business settings, so not
          part of the form above and open to every administrator. */}
      <DeviceAppSettings publicKey={vapidPublicKey()} scope={ADMIN_BASE_PATH} devices={devices} />
    </>
  )
}
