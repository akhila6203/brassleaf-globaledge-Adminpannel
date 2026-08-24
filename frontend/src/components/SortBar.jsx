export default function SortBar({ sort, dir, options, onChange }) {
  return (
    <div className="flex gap-2">
      <select
        value={sort}
        onChange={(e) => onChange({ sort: e.target.value, dir })}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        value={dir}
        onChange={(e) => onChange({ sort, dir: e.target.value })}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="desc">Desc</option>
        <option value="asc">Asc</option>
      </select>
    </div>
  );
}
