export type Anrede = 'Herr' | 'Frau' | 'Divers';

const BG_BY_ANREDE: Record<Anrede, string> = {
  Herr: 'b6e3f4',
  Frau: 'd1d4f9',
  Divers: 'c0aede',
};

export function getBotttUrl(seed: string, anrede: Anrede | string = 'Divers'): string {
  const bg = BG_BY_ANREDE[(anrede as Anrede)] ?? 'c0aede';
  const s = encodeURIComponent(seed || 'default');
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${s}&backgroundColor=${bg}`;
}

export function randomSeed(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function generateBotttOptions(anrede: Anrede | string, count = 6): { seed: string; url: string }[] {
  return Array.from({ length: count }, () => {
    const seed = randomSeed();
    return { seed, url: getBotttUrl(seed, anrede) };
  });
}
