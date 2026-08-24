export default function EmptyState({ icon: Icon, message = 'No records found' }) {
  return (
    <div className="px-4 py-12 text-center text-gray-400">
      {Icon && <Icon className="mx-auto mb-2 text-gray-300" size={32} />}
      <p>{message}</p>
    </div>
  );
}

export function ErrorState({ error }) {
  return (
    <div className="p-8">
      <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-4 py-3 text-sm">
        {error}
      </div>
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }) {
  return <div className="p-8 text-gray-400">{label}</div>;
}
