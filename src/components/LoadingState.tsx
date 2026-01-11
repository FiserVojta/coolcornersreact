export const LoadingState = ({ label = 'Loading...' }: { label?: string }) => (
  <div className="flex items-center justify-center py-16">
    <div className="flex items-center gap-3 rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-500" />
      {label}
    </div>
  </div>
);
