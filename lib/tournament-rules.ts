export const FUTPOLI_RULES = {
  maxPlayersPerTeam: 14,
  minPlayersInMatchSheet: 8,
  playerFeeCentsPerAppearance: 50,
  refereeCostCentsPerMatch: 2000,
  refereeCostCentsPerTeam: 1000,
} as const;

export const AUTHORIZED_PLAYER_STATUS = "AUTHORIZED" as const;

export function centsToEuro(cents: number) {
  return cents / 100;
}
