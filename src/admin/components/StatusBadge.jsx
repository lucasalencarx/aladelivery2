export default function StatusBadge({ children }) {
  const normalized = String(children || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  let tone = "neutral";

  if (normalized.includes("novo")) tone = "green";
  if (normalized.includes("prepar")) tone = "orange";
  if (normalized.includes("saiu")) tone = "blue";
  if (normalized.includes("entreg")) tone = "purple";
  if (normalized.includes("cancel")) tone = "red";

  return (
    <span className={`statusBadge ${tone}`}>
      {children}
    </span>
  );
}
