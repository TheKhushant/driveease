import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import { PageLoader } from './components/ui/Feedback';
import HomePage from './pages/public/HomePage';
import { BookPage, CarsPage, ContactPage, LegalPage, NotFoundPage, TrackPage } from './pages/public/PublicPages';

// Admin bundle is loaded only when visiting /admin
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const LoginPage = lazy(() => import('./pages/admin/LoginPage'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const BookingsPage = lazy(() => import('./pages/admin/BookingsPage'));
const BookingDetailPage = lazy(() => import('./pages/admin/BookingDetailPage'));
const CustomersPage = lazy(() => import('./pages/admin/CustomersPage'));
const PaymentsPage = lazy(() => import('./pages/admin/PaymentsPage'));
const PricingPage = lazy(() => import('./pages/admin/PricingPage'));
const AvailabilityPage = lazy(() => import('./pages/admin/AvailabilityPage'));
const MediaPage = lazy(() => import('./pages/admin/MediaPage'));
const ProfilePage = lazy(() => import('./pages/admin/ProfilePage'));
const VehiclesPage = lazy(() => import('./pages/admin/FleetPages').then((m) => ({ default: m.VehiclesPage })));
const DriversPage = lazy(() => import('./pages/admin/FleetPages').then((m) => ({ default: m.DriversPage })));
const CategoriesPage = lazy(() => import('./pages/admin/CatalogPages').then((m) => ({ default: m.CategoriesPage })));
const CitiesPage = lazy(() => import('./pages/admin/CatalogPages').then((m) => ({ default: m.CitiesPage })));
const RoutesPage = lazy(() => import('./pages/admin/CatalogPages').then((m) => ({ default: m.RoutesPage })));
const PackagesPage = lazy(() => import('./pages/admin/CatalogPages').then((m) => ({ default: m.PackagesPage })));
const SeasonalPricingPage = lazy(() => import('./pages/admin/CatalogPages').then((m) => ({ default: m.SeasonalPricingPage })));
const TestimonialsPage = lazy(() => import('./pages/admin/CatalogPages').then((m) => ({ default: m.TestimonialsPage })));
const WebsiteContentPage = lazy(() => import('./pages/admin/SettingsPages').then((m) => ({ default: m.WebsiteContentPage })));
const ContactInfoPage = lazy(() => import('./pages/admin/SettingsPages').then((m) => ({ default: m.ContactInfoPage })));
const WebsiteSettingsPage = lazy(() => import('./pages/admin/SettingsPages').then((m) => ({ default: m.WebsiteSettingsPage })));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="book" element={<BookPage />} />
          <Route path="cars" element={<CarsPage />} />
          <Route path="track" element={<TrackPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="terms" element={<LegalPage type="terms" />} />
          <Route path="privacy" element={<LegalPage type="privacy" />} />
          <Route path="cancellation-policy" element={<LegalPage type="cancellation" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="admin/login" element={<LoginPage />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="bookings/:id" element={<BookingDetailPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="availability" element={<AvailabilityPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="cities" element={<CitiesPage />} />
          <Route path="routes" element={<RoutesPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="seasonal-pricing" element={<SeasonalPricingPage />} />
          <Route path="packages" element={<PackagesPage />} />
          <Route path="content" element={<WebsiteContentPage />} />
          <Route path="media" element={<MediaPage />} />
          <Route path="testimonials" element={<TestimonialsPage />} />
          <Route path="contact" element={<ContactInfoPage />} />
          <Route path="settings" element={<WebsiteSettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
