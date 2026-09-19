import "server-only"

import { prisma } from "@/lib/prisma"

export interface PushDevice {
  id: string
  deviceLabel: string | null
  createdAt: Date
  lastSuccessAt: Date | null
}

/**
 * The devices an administrator has switched notifications on for, newest
 * first. Endpoints and keys are delivery credentials and never leave the
 * server; the list carries only what a person needs to recognise a device.
 */
export async function listPushDevices(adminId: string): Promise<PushDevice[]> {
  return prisma.adminPushSubscription.findMany({
    where: { adminId },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: { id: true, deviceLabel: true, createdAt: true, lastSuccessAt: true },
  })
}
