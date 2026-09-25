import { requestCache } from "@/lib/request-cache";
import { getEmployeeById, getProjectPhases, getStaffNotifications } from "@/lib/api";

export function getEmployeeByIdCached(userId: string) {
  return requestCache.get(`employee:${userId}`, () => getEmployeeById(userId), { ttl: 60_000 });
}

export function getProjectPhasesCached() {
  return requestCache.get(`project-phases`, () => getProjectPhases(), { ttl: 120_000 });
}

export function getStaffNotificationsCached(userId: string) {
  return requestCache.get(`notifications:${userId}`, () => getStaffNotifications(userId), { ttl: 15_000 });
}
