export function formatarData(
  value: string,
  timeZone: string,
  onlyTime = false,
) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    ...(onlyTime
      ? {}
      : ({ day: "2-digit", month: "2-digit", year: "numeric" } as const)),
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
