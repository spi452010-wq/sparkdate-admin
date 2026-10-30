import type { ReactNode } from 'react';

export interface Column<T> { key: string; header: string; render: (row: T) => ReactNode }
export function Table<T extends { id: string }>({ caption, columns, rows }: { caption: string; columns: Column<T>[]; rows: T[] }) {
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label={caption}>
      <table>
        <caption className="sr-only">{caption}</caption>
        <thead><tr>{columns.map((c) => <th key={c.key} scope="col">{c.header}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => <tr key={r.id}>{columns.map((c) => <td key={c.key} data-label={c.header}>{c.render(r)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
