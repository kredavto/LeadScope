export function StatusPill({ value }: { value: string | number }) {
  const text = String(value);
  const normalized = text.toUpperCase();
  const tone = ["BLOCKED", "SUPPRESSED", "DENIED", "DELETE"].some((item) => normalized.includes(item))
    ? "block"
    : ["REVIEW", "QUARANTINED", "CHECK"].some((item) => normalized.includes(item))
      ? "review"
      : "allow";
  return <span className={`status ${tone}`}>{text}</span>;
}

