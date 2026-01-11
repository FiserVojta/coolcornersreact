export const ErrorState = ({ message }: { message?: string }) => (
  <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
    {message ?? 'Something went wrong.'}
  </div>
);
