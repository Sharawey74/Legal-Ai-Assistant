type Status = "processing" | "ready" | "failed";

const styles: Record<Status, string> = {
  processing: "bg-tertiary/20 text-tertiary border-tertiary/30",
  ready:      "bg-primary/20  text-primary border-primary/30",
  failed:     "bg-error/20    text-error border-error/30",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`px-2 py-0.5 rounded-md font-label-md text-label-md capitalize border ${styles[status]}`}>
      {status}
    </span>
  );
}
