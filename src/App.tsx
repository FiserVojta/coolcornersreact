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
import { Profile } from './pages/profile/Profile';
import { MyTravelsList } from './pages/travels/MyTravelsList';
import { TravelDetail } from './pages/travels/TravelDetail';
import { TravelForm } from './pages/travels/TravelForm';
import { SharedTravel } from './pages/travels/SharedTravel';
import { TravelPhotoPage } from './pages/travels/TravelPhotoPage';
import { ProtectedRoute } from './auth/ProtectedRoute';

function App() {
  return (
    <div className="min-h-screen text-ink-strong">
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
        <Route path="/travels/share/:token" element={<SharedTravel />} />
        <Route path="/travels/share/:token/photos/:photoId" element={<TravelPhotoPage />} />
        <Route
          path="/travels"
          element={
            <ProtectedRoute>
              <MyTravelsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/travels/create"
          element={
            <ProtectedRoute>
              <TravelForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/travels/:id"
          element={
            <ProtectedRoute>
              <TravelDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/travels/:id/edit"
          element={
            <ProtectedRoute>
              <TravelForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/travels/:id/photos/:photoId"
          element={
            <ProtectedRoute>
              <TravelPhotoPage />
            </ProtectedRoute>
          }
        />
        <Route path="/users" element={<UsersList />} />
        <Route path="/users/:id" element={<UserDetail />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

const NotFound = () => (
  <main className="mx-auto flex max-w-4xl flex-col items-start gap-4 px-4 py-16">
    <h1 className="font-display text-3xl font-semibold text-ink-strong">Page not found</h1>
    <p className="font-label text-ink-muted">Try navigating to Places to start exploring.</p>
  </main>
);

export default App;
