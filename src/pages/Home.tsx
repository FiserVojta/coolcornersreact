import { Link } from 'react-router-dom';

export const Home = () => {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12">
      <section
        className="relative overflow-hidden rounded-3xl px-8 py-14"
        style={{
          background: 'linear-gradient(135deg, #08311b 0%, #0f5a32 45%, #163a5f 100%)',
          boxShadow: '0 30px 80px rgba(8, 49, 27, 0.35)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(circle at 85% 15%, rgba(255,255,255,0.12), transparent 40%)' }}
        />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">
              CoolCorners
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
              Explore curated places and trips with the community
            </h1>
            <p className="text-lg leading-relaxed text-white/80">
              Discover hand-picked corners, plan trips, and join community-led wanders. Browse openly — sign in to contribute.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/places"
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-800 shadow-sm transition hover:-translate-y-0.5"
              >
                Browse places
              </Link>
              <Link
                to="/trips"
                className="rounded-full border border-white/40 bg-transparent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                View trips
              </Link>
            </div>
          </div>
          <div
            className="hidden h-40 w-64 rounded-2xl md:block"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
          />
        </div>
      </section>
    </main>
  );
};
