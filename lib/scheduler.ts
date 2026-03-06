export type Pairing = { homeTeamId: string; awayTeamId: string; round: number };

function shuffle<T>(arr: T[], seed?: number): T[] {
  const a = [...arr];
  let x = seed ?? Math.floor(Math.random() * 1e9);
  const rand = () => (x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296;

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor((seed !== undefined ? rand() : Math.random()) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Round-robin (solo andata).
 * Se numero squadre dispari -> una riposa (BYE).
 */
export function generateRoundRobin(
  teamIds: string[],
  opts?: { random?: boolean; seed?: number; alternateHomeAway?: boolean }
): Pairing[] {
  const { random = true, seed, alternateHomeAway = true } = opts ?? {};
  let teams = random ? shuffle(teamIds, seed) : [...teamIds];

  const BYE = "__BYE__";
  if (teams.length < 2) return [];
  if (teams.length % 2 === 1) teams = [...teams, BYE];

  const n = teams.length;
  const rounds = n - 1;
  const half = n / 2;

  const pairings: Pairing[] = [];

  let arr = [...teams];
  for (let r = 1; r <= rounds; r++) {
    const left = arr.slice(0, half);
    const right = arr.slice(half).reverse();

    for (let i = 0; i < half; i++) {
      const a = left[i];
      const b = right[i];
      if (a === BYE || b === BYE) continue;

      const flip = alternateHomeAway ? (r + i) % 2 === 0 : false;
      const homeTeamId = flip ? b : a;
      const awayTeamId = flip ? a : b;

      pairings.push({ round: r, homeTeamId, awayTeamId });
    }

    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr = [fixed, ...rest];
  }

  return pairings;
}