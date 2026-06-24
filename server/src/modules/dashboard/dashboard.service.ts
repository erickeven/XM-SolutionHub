import * as repository from './dashboard.repository';
import type { DashboardSnapshot } from './dashboard.types';

export async function getDashboardSnapshot(
  role: string,
  userId: string,
): Promise<DashboardSnapshot> {
  return repository.getSnapshot(role, userId);
}