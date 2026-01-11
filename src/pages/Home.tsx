import { Link } from 'react-router-dom';

export const Home = () => {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12">
      <section className="rounded-3xl bg-gradient-to-br from-brand-50 via-white to-emerald-50 px-8 py-12 shadow-card">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">CoolCorners</p>
            <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
              Explore curated places and trips with Keycloak-ready React
            </h1>
            <p className="text-lg text-slate-700">
              This React port mirrors your Angular routes starting with Places. Auth is wired for Keycloak, ready for
              incremental rollout.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/places"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Browse places
              </Link>
              <Link
                to="/trips"
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-400"
              >
                View trips
              </Link>
            </div>
          </div>
          <div className="hidden h-40 w-64 rounded-2xl bg-white/70 shadow-inner md:block" />
        </div>
      </section>
    </main>
  );
};
