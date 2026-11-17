// A small seeded random source (mulberry32) so a screenshot seed replays the
// same field, and the helpers every other module reaches for: ranges, picks,
// chances, shuffles and weighted draws. Everything random in the game flows
// through one of these, so a seed pins the whole run.
export function createRandom(seed) {
  let a = seed >>> 0;
  const rng = {
    next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(min, max) {
      return min + this.next() * (max - min);
    },
    int(min, max) {
      return Math.floor(this.range(min, max + 1));
    },
    pick(list) {
      return list[Math.floor(this.next() * list.length)];
    },
    chance(p) {
      return this.next() < p;
    },
    // Fisher-Yates, in place, on a copy so the caller's table stays intact.
    shuffle(list) {
      const copy = [...list];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(this.next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
    // Pick one entry of [{ value, weight }] by weight; falls back to the first.
    weightedPick(entries) {
      let total = 0;
      for (const e of entries) total += e.weight;
      if (total <= 0) return entries[0] && entries[0].value;
      let roll = this.next() * total;
      for (const e of entries) {
        roll -= e.weight;
        if (roll <= 0) return e.value;
      }
      return entries[entries.length - 1].value;
    },
  };
  return rng;
}
