export const ErrorState = ({ message }: { message?: string }) => (
  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold font-label text-rose-700">
    {message ?? 'Something went wrong.'}
  </div>
);
