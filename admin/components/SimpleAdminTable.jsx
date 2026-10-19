export default function SimpleAdminTable({
  columns,
  rows,
  emptyText = "Nenhum registro encontrado.",
}) {
  return (
    <div className="adminTableCard">
      <div className="adminTableScroll">
        <table className="adminTable">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="adminTableEmpty">
                    {emptyText}
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.id ?? index}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.render
                        ? column.render(
                            row[column.key],
                            row
                          )
                        : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}