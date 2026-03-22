import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEvents } from '../../api/events';
import { LoadingState } from '../../components/LoadingState';
import { ErrorState } from '../../components/ErrorState';
import { EventCard } from '../../components/EventCard';
import { useAuth } from '../../auth/AuthContext';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';

type PriceFilter = 'free' | 'low' | 'medium' | 'high' | '';
type Timeframe = 'today' | 'tomorrow' | 'this_week' | 'this_month' | 'next_month' | '';

export const EventsList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState<PriceFilter>('');
  const [timeframe, setTimeframe] = useState<Timeframe>('');
  const { authenticated, login } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['events'],
    queryFn: () => fetchEvents()
  });

  const filtered = useMemo(() => {
    const events = data?.data ?? [];
    const search = searchTerm.trim().toLowerCase();
    return events.filter((event) => {
      if (search && !`${event.name} ${event.description} ${event.venue}`.toLowerCase().includes(search)) return false;
      if (priceRange && !matchesPrice(event.price, priceRange)) return false;
      if (timeframe && !matchesTimeframe(event.startTime, timeframe)) return false;
      return true;
    });
  }, [data?.data, priceRange, searchTerm, timeframe]);

  if (isLoading) return <LoadingState label="Loading events..." />;
  if (error) return <ErrorState message="Unable to load events right now." />;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Events"
        title="Discover what’s happening"
        description={`Showing ${filtered.length} events`}
        actions={
          <>
          {authenticated ? (
            <Button
              to="/events/create"
            >
              Create event
            </Button>
          ) : (
            <Button
              onClick={() => login()}
              variant="secondary"
            >
              Login to create
            </Button>
          )}
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
            placeholder="Search by name, venue..."
          />
          <select
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value as PriceFilter)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
          >
            <option value="">Any price</option>
            <option value="free">Free</option>
            <option value="low">Up to $25</option>
            <option value="medium">$25 - $100</option>
            <option value="high">Above $100</option>
          </select>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as Timeframe)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm outline-none focus:border-brand-400"
          >
            <option value="">Any date</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="this_week">This week</option>
            <option value="this_month">This month</option>
            <option value="next_month">Next month</option>
          </select>
          </>
        }
      />

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </PageContainer>
  );
};

const matchesPrice = (price: number, filter: PriceFilter) => {
  switch (filter) {
    case 'free':
      return price === 0;
    case 'low':
      return price > 0 && price <= 25;
    case 'medium':
      return price > 25 && price <= 100;
    case 'high':
      return price > 100;
    default:
      return true;
  }
};

const matchesTimeframe = (dateString: string, timeframe: Timeframe) => {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  switch (timeframe) {
    case 'today':
      return eventDay.getTime() === today.getTime();
    case 'tomorrow': {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return eventDay.getTime() === tomorrow.getTime();
    }
    case 'this_week': {
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return eventDay >= today && eventDay <= weekFromNow;
    }
    case 'this_month': {
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return eventDay >= today && eventDay <= endOfMonth;
    }
    case 'next_month': {
      const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      return eventDay >= startOfNextMonth && eventDay <= endOfNextMonth;
    }
    default:
      return true;
  }
};
