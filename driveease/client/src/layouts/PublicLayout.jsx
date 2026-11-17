import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Car, Clock, Facebook, Instagram, Linkedin, Mail, MapPin, Menu, MessageCircle, Phone, Twitter, X, Youtube } from 'lucide-react';
import { useSite } from '../context/SiteContext';
import { ErrorState, PageLoader } from '../components/ui/Feedback';
import { SmartImage } from '../components/ui/Misc';
import { Button } from '../components/ui/Button';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/cars', label: 'Cars' },
  { to: '/book', label: 'Book a ride' },
  { to: '/track', label: 'Track booking' },
  { to: '/contact', label: 'Contact' },
];

export const waLink = (num, text = '') => {
  const digits = String(num || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return null;
  const n = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};

function Logo({ branding, company, light }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      {branding?.logo ? (
        <SmartImage src={branding.logo} alt={company} className="h-9 w-auto max-w-[140px] object-contain" fallbackIcon={Car} iconClass="h-5 w-5" />
      ) : (
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-white shadow-sm shadow-primary/40">
          <Car className="h-5 w-5" />
        </span>
      )}
      <span className={`font-display text-lg font-semibold ${light ? 'text-white' : 'text-ink'}`}>{company}</span>
    </Link>
  );
}

function Navbar() {
  const { settings, company } = useSite();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const phone = settings.contact?.phone;

  return (
    <header className={`sticky top-0 z-40 border-b transition ${scrolled ? 'border-slate-200 bg-white/90 backdrop-blur' : 'border-transparent bg-white'}`}>
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Logo branding={settings.branding} company={company} />
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'text-primary' : 'text-slate-600 hover:text-ink'}`}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {phone && (
            <a href={`tel:${phone}`} className="hidden items-center gap-2 text-sm font-semibold text-slate-700 hover:text-primary md:inline-flex">
              <Phone className="h-4 w-4" /> {phone}
            </a>
          )}
          <Button to="/book" size="sm" className="hidden sm:inline-flex">
            Book now
          </Button>
          <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden" aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-slate-100 bg-white lg:hidden">
          <nav className="container-x flex flex-col py-3">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `rounded-lg px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-primary-light text-primary' : 'text-slate-700'}`}>
                {n.label}
              </NavLink>
            ))}
            {phone && (
              <a href={`tel:${phone}`} className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700">
                <Phone className="h-4 w-4" /> Call {phone}
              </a>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

const SOCIAL_ICONS = { facebook: Facebook, instagram: Instagram, twitter: Twitter, youtube: Youtube, linkedin: Linkedin };

function Footer() {
  const { settings, company, site } = useSite();
  const { contact = {}, social = {}, footer = {}, branding = {}, hasLegal = {} } = settings;
  const popular = site.cities.filter((c) => c.isPopular).slice(0, 6);
  return (
    <footer className="mt-20 bg-ink text-slate-400">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo branding={branding} company={company} light />
          {footer.text && <p className="text-sm leading-relaxed">{footer.text}</p>}
          <div className="flex gap-2">
            {Object.entries(SOCIAL_ICONS).map(([k, Icon]) =>
              social[k] ? (
                <a key={k} href={social[k]} target="_blank" rel="noreferrer noopener" className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-slate-300 hover:bg-primary hover:text-white" aria-label={k}>
                  <Icon className="h-4 w-4" />
                </a>
              ) : null,
            )}
          </div>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-semibold text-white">Quick links</h4>
          <ul className="space-y-2 text-sm">
            {NAV.map((n) => (
              <li key={n.to}><Link to={n.to} className="hover:text-white">{n.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-semibold text-white">Popular cities</h4>
          <ul className="space-y-2 text-sm">
            {popular.map((c) => (
              <li key={c._id}><Link to={`/book?bookingType=outstation&dropCity=${c._id}`} className="hover:text-white">Cabs to {c.name}</Link></li>
            ))}
            {!popular.length && <li>Coming soon</li>}
          </ul>
        </div>
        <div>
          <h4 className="mb-4 text-sm font-semibold text-white">Contact</h4>
          <ul className="space-y-3 text-sm">
            {contact.phone && <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0" /><a href={`tel:${contact.phone}`} className="hover:text-white">{contact.phone}</a></li>}
            {contact.email && <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0" /><a href={`mailto:${contact.email}`} className="hover:text-white">{contact.email}</a></li>}
            {contact.address && <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span>{contact.address}</span></li>}
            {contact.workingHours && <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0" /><span>{contact.workingHours}</span></li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>{footer.copyright || `© ${new Date().getFullYear()} ${company}. All rights reserved.`}</p>
          <div className="flex gap-4">
            {hasLegal.terms && <Link to="/terms" className="hover:text-white">Terms</Link>}
            {hasLegal.privacy && <Link to="/privacy" className="hover:text-white">Privacy</Link>}
            {hasLegal.cancellationPolicy && <Link to="/cancellation-policy" className="hover:text-white">Cancellation policy</Link>}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function PublicLayout() {
  const ctx = useSite();
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);

  if (ctx.loading && !ctx.site) return <PageLoader />;
  if (ctx.error) {
    return (
      <div className="grid min-h-screen place-items-center">
        <ErrorState message={ctx.error} onRetry={ctx.reload} />
      </div>
    );
  }
  const wa = waLink(ctx.settings.contact?.whatsappNumber, `Hi ${ctx.company}, I'd like to enquire about a booking.`);
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lift transition hover:scale-105" aria-label="Chat on WhatsApp">
          <MessageCircle className="h-7 w-7" />
        </a>
      )}
    </div>
  );
}
