import PageHeader from "./PageHeader";

export default function PlaceholderPage({
  title,
  description,
  icon,
  children,
}) {
  return (
    <section className="adminPage">
      <PageHeader
        title={title}
        description={description}
      />

      <div className="placeholderPageCard">
        <div className="placeholderPageIcon">{icon}</div>
        <strong>{title}</strong>
        <p>
          {children ||
            "Módulo pronto na estrutura administrativa. Conecte os dados do Supabase conforme a necessidade do projeto."}
        </p>
      </div>
    </section>
  );
}
