/**
 * A shuffled copy of `items` (Fisher–Yates). The input is left untouched.
 *
 * `random` is injectable so a test can make the order deterministic; it must
 * return a number in [0, 1), like `Math.random`.
 */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    ;[copy[index], copy[swap]] = [copy[swap], copy[index]]
  }

  return copy
}
