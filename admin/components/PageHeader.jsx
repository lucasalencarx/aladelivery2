export default function PageHeader({
  eyebrow,
  title,
  description,
  action,
}) {
  return (
    <div className="adminPageHeader">
      <div>
        {eyebrow && <span>{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>

      {action}
    </div>
  );
}
