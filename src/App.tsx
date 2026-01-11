import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Home } from './pages/Home';
import { PlacesList } from './pages/places/PlacesList';
import { PlaceDetail } from './pages/places/PlaceDetail';
import { TripsList } from './pages/trips/TripsList';
import { TripDetail } from './pages/trips/TripDetail';
import { CotravelList } from './pages/cotravel/CotravelList';
import { CotravelDetail } from './pages/cotravel/CotravelDetail';
import { PlaceForm } from './pages/places/PlaceForm';
import { TripForm } from './pages/trips/TripForm';
import { CotravelForm } from './pages/cotravel/CotravelForm';
import { EventsList } from './pages/events/EventsList';
import { EventDetail } from './pages/events/EventDetail';
import { EventForm } from './pages/events/EventForm';
import { UsersList } from './pages/users/UsersList';
import { UserDetail } from './pages/users/UserDetail';
import { ProtectedRoute } from './auth/ProtectedRoute';

function App() {
  return (
    <div className="min-h-screen">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/places" element={<PlacesList />} />
        <Route path="/places/:id" element={<PlaceDetail />} />
        <Route
          path="/places/create"
          element={
            <ProtectedRoute>
              <PlaceForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/places/:id/edit"
          element={
            <ProtectedRoute>
              <PlaceForm />
            </ProtectedRoute>
          }
        />
        <Route path="/trips" element={<TripsList />} />
        <Route path="/trips/:id" element={<TripDetail />} />
        <Route
          path="/trips/create"
          element={
            <ProtectedRoute>
              <TripForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips/:id/edit"
          element={
            <ProtectedRoute>
              <TripForm />
            </ProtectedRoute>
          }
        />
        <Route path="/cotravel" element={<CotravelList />} />
        <Route path="/cotravel/:id" element={<CotravelDetail />} />
        <Route
          path="/cotravel/create"
          element={
            <ProtectedRoute>
              <CotravelForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cotravel/:id/edit"
          element={
            <ProtectedRoute>
              <CotravelForm />
            </ProtectedRoute>
          }
        />
        <Route path="/events" element={<EventsList />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route
          path="/events/create"
          element={
            <ProtectedRoute>
              <EventForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/edit"
          element={
            <ProtectedRoute>
              <EventForm />
            </ProtectedRoute>
          }
        />
        <Route path="/users" element={<UsersList />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

const NotFound = () => (
  <main className="mx-auto flex max-w-4xl flex-col items-start gap-4 px-4 py-16">
    <h1 className="text-3xl font-bold text-slate-900">Page not found</h1>
    <p className="text-slate-600">Try navigating to Places to start exploring.</p>
  </main>
);

export default App;
