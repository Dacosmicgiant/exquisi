/** The last N days ending now. A function (not inline) so server components stay pure for the linter. */
export function lastDays(days: number): { from: Date; to: Date } {
  const to = new Date();
  return { from: new Date(to.getTime() - days * 86_400_000), to };
}
