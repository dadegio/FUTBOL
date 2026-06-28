import type { SessionUser } from "./session";
import {
  getPlayerAdminMissingItems,
  getPlayerRegistrationStatus,
  isPlayerEligibleForMatchSheet,
  type PlayerEligibilityInput,
} from "./tournament-rules";

export type PlayerVisibilityInput = PlayerEligibilityInput & {
  id: string;
  firstName: string;
  lastName: string;
  number: number;
  position?: string | null;
  photoUrl?: string | null;
  teamId?: string | null;
  team?: unknown;
  [key: string]: unknown;
};

export function canSeeAdminPlayerDetails(user: SessionUser | null | undefined) {
  return user?.role === "ADMIN";
}

export function canEditAdminPlayerDetails(user: SessionUser | null | undefined) {
  return user?.role === "ADMIN";
}

export function publicPlayerStatus(player: PlayerEligibilityInput) {
  return {
    registrationStatus: getPlayerRegistrationStatus(player),
    isEligibleForMatchSheet: isPlayerEligibleForMatchSheet(player),
  };
}

export function sanitizePlayerForRole<T extends PlayerVisibilityInput>(
  player: T,
  user: SessionUser | null | undefined
) {
  const status = publicPlayerStatus(player);

  const base: Record<string, unknown> = {
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    number: player.number,
    position: player.position ?? null,
    photoUrl: player.photoUrl ?? null,
    teamId: player.teamId ?? null,
    team: player.team,
    ...status,
  };

  if (canSeeAdminPlayerDetails(user)) {
    return {
      ...player,
      ...status,
      adminMissingItems: getPlayerAdminMissingItems(player),
    };
  }

  return base;
}
