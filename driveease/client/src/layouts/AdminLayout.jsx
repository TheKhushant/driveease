import { useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BadgePercent,
  CalendarDays,
  CalendarRange,
  Car,
  ExternalLink,
  FileText,
  Images,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  MessageSquareQuote,
  Package,
  Phone,
  Route,
  Settings,
  SlidersHorizontal,
  UserCircle,
  Users,
  UserSquare2,
  Wallet,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import { PageLoader } from '../components/ui/Feedback';
import { SmartImage } from '../components/ui/Misc';

export const ADMIN_NAV = [
  { group: 'Overview', items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  {
    group: 'Operations',
    items: [
      { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
      { to: '/admin/customers', label: 'Customers', icon: Users },
      { to: '/admin/payments', label: 'Payments', icon: Wallet },
      { to: '/admin/availability', label: 'Availability Calendar', icon: CalendarRange },
    ],
  },
  {
    group: 'Fleet',
    items: [
      { to: '/admin/vehicles', label: 'Cars & Vehicles', icon: Car },
      { to: '/admin/categories', label: 'Car Categories', icon: LayoutGrid },
      { to: '/admin/drivers', label: 'Drivers', icon: UserSquare2 },
    ],
  },
  {
    group: 'Locations & Pricing',
    items: [
      { to: '/admin/cities', label: 'Cities', icon: MapPin },
      { to: '/admin/routes', label: 'Routes', icon: Route },
      { to: '/admin/pricing', label: 'Pricing Management', icon: SlidersHorizontal },
      { to: '/admin/seasonal-pricing', label: 'Seasonal Pricing', icon: BadgePercent },
      { to: '/admin/packages', label: 'Local Packages', icon: Package },
    ],
  },
  {
    group: 'Website',
    items: [
      { to: '/admin/content', label: 'Website Content', icon: FileText },
      { to: '/admin/media', label: 'Media & Images', icon: Images },
      { to: '/admin/testimonials', label: 'Testimonials', icon: MessageSquareQuote },
      { to: '/admin/contact', label: 'Contact Information', icon: Phone },
      { to: '/admin/settings', label: 'Website Settings', icon: Settings },
    ],
  },
  { group: 'Account', items: [{ to: '/admin/profile', label: 'Admin Profile', icon: UserCircle }] },
];

function Sidebar({ onNavigate, onLogout }) {
  const { settings, company } = useSite() || {};
  return (
    <div className="flex h-full flex-col bg-ink text-slate-300">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        {settings?.branding?.logo ? (
          <SmartImage src={settings.branding.logo} alt={company} className="h-8 w-8 rounded-lg bg-white object-contain" />
        ) : (
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white">
            <Car className="h-4 w-4" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold text-white">{company}</p>
          <p className="text-[11px] text-slate-400">Admin panel</p>
        </div>
      </div>
      <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {ADMIN_NAV.map((g) => (
          <div key={g.group}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{g.group}</p>
            <div className="space-y-0.5">
              {g.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
                      isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-rose-300 hover:bg-white/5">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { admin, checking, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  if (checking) return <PageLoader label="Checking session…" />;
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;

  const doLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <Sidebar onLogout={doLogout} />
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 animate-fade-up">
            <Sidebar onNavigate={() => setOpen(false)} onLogout={doLogout} />
          </div>
          <button type="button" onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <a href="/" target="_blank" rel="noreferrer" className="hidden items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary sm:inline-flex">
            View website <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <NavLink to="/admin/profile" className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-primary-light text-sm font-bold text-primary">{admin.name?.[0]?.toUpperCase()}</div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-semibold leading-tight text-ink">{admin.name}</p>
              <p className="text-[11px] capitalize leading-tight text-slate-500">{admin.role}</p>
            </div>
          </NavLink>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
