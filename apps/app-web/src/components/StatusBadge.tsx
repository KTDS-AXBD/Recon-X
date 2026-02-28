const STATUS_COLORS: Record<string, string> = {
  candidate: "#3b82f6",
  approved: "#22c55e",
  rejected: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  candidate: "검토 대기",
  approved: "승인",
  rejected: "반려",
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = STATUS_COLORS[status] ?? "#6b7280";
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "12px",
        fontSize: "12px",
        fontWeight: 600,
        backgroundColor: `${color}1a`,
        color,
      }}
    >
      {label}
    </span>
  );
}
