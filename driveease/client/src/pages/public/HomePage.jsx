import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Mail, MapPin, MessageCircle, Phone, Quote, ShieldCheck, Star } from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useFetch } from '../../hooks/useFetch';
import { HeroBookingForm } from '../../components/public/HeroBookingForm';
import { CarCard, CategoryCard } from '../../components/public/CarCard';
import { SmartImage } from '../../components/ui/Misc';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Feedback';
import { getIcon } from '../../utils/icons';
import { formatDuration, formatINR } from '../../utils/format';
import { waLink } from '../../layouts/PublicLayout';

function SectionHead({ eyebrow, title, description, action }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
        <h2 className="section-title">{title}</h2>
        {description && <p className="mt-2 text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Hero() {
  const { settings } = useSite();
  const { hero = {}, about = {} } = settings;
  const banner = hero.bannerImages?.[0];
  return (
    <section className="relative overflow-hidden bg-ink">
      {banner ? (
        <img src={banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <div className="hero-pattern absolute inset-0" />
          <div className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-primary/50 blur-3xl" />
          <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-secondary/25 blur-3xl" />
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/80 to-ink/40" />
      <div className="container-x relative grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-24">
        <div className="animate-fade-up text-white">
          {hero.subheading && (
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/90 ring-1 ring-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              {hero.subheading}
            </p>
          )}
          <h1 className="font-display text-4xl font-semibold leading-[1.08] text-white sm:text-5xl lg:text-6xl">{hero.heading}</h1>
          {hero.description && <p className="mt-5 max-w-xl text-base text-slate-300 sm:text-lg">{hero.description}</p>}
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
            {(about.stats || []).slice(0, 3).map((s) => (
              <div key={s.label}>
                <p className="font-display text-2xl font-semibold text-white">{s.value}</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="animate-fade-up [animation-delay:120ms]">
          <HeroBookingForm />
        </div>
      </div>
    </section>
  );
}

function Categories() {
  const { site } = useSite();
  if (!site.categories.length) return null;
  return (
    <section className="container-x py-16">
      <SectionHead eyebrow="Fleet" title="Choose your ride" description="From compact hatchbacks to tempo travellers for the whole group." action={<Button variant="outline" to="/cars" icon={ArrowRight}>All cars</Button>} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {site.categories.map((c) => (
          <CategoryCard key={c._id} category={c} to={`/cars?category=${c._id}`} />
        ))}
      </div>
    </section>
  );
}

function Cars() {
  const { data, loading } = useFetch('/public/vehicles');
  if (!loading && (!data?.carSelectionEnabled || !data.items.length)) return null;
  return (
    <section className="bg-white py-16">
      <div className="container-x">
        <SectionHead eyebrow="Available cars" title="Well-maintained cars, verified drivers" action={<Button variant="outline" to="/cars" icon={ArrowRight}>View all</Button>} />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-80" />)
            : data.items.slice(0, 6).map((car) => (
                <CarCard key={car._id} car={car} actionLabel="Book" to={`/book?vehicle=${car._id}&category=${car.category?._id || ''}`} />
              ))}
        </div>
      </div>
    </section>
  );
}

function Destinations() {
  const { site } = useSite();
  const cities = site.cities.filter((c) => c.isPopular);
  if (!cities.length && !site.popularRoutes.length) return null;
  return (
    <section className="container-x py-16">
      <SectionHead eyebrow="Destinations" title="Popular destinations" description="Outstation cabs with transparent per-km pricing." />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cities.slice(0, 8).map((c) => (
          <Link key={c._id} to={`/book?bookingType=outstation&dropCity=${c._id}`} className="group relative block overflow-hidden rounded-2xl shadow-soft">
            <SmartImage src={c.image} alt={c.name} fallbackIcon={MapPin} className="aspect-[4/5] w-full transition duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <h3 className="font-display text-xl font-semibold text-white">{c.name}</h3>
              {c.description && <p className="mt-1 line-clamp-2 text-xs text-white/75">{c.description}</p>}
              {c.startingFare ? <p className="mt-2 text-sm font-semibold text-secondary">From {formatINR(c.startingFare)}</p> : null}
            </div>
          </Link>
        ))}
      </div>
      {site.popularRoutes.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {site.popularRoutes.map((r) => (
            <Link
              key={r._id}
              to={`/book?bookingType=outstation&pickupCity=${r.fromCity?._id}&dropCity=${r.toCity?._id}`}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:text-primary hover:ring-primary"
            >
              {r.fromCity?.name} → {r.toCity?.name} <span className="font-normal text-slate-400">· {r.distanceKm} km · {formatDuration(r.durationMinutes)}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function IconGrid({ items, eyebrow, title, dark }) {
  if (!items?.length) return null;
  return (
    <section className={dark ? 'bg-ink py-16 text-white' : 'container-x py-16'}>
      <div className={dark ? 'container-x' : ''}>
        <div className="mb-8 max-w-2xl">
          <p className="section-eyebrow">{eyebrow}</p>
          <h2 className={`section-title ${dark ? '!text-white' : ''}`}>{title}</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => {
            const Icon = getIcon(s.icon);
            return (
              <div key={s._id || s.title} className={`rounded-2xl p-6 transition ${dark ? 'bg-white/5 ring-1 ring-white/10 hover:bg-white/10' : 'card hover:shadow-lift'}`}>
                <div className={`mb-4 grid h-12 w-12 place-items-center rounded-xl ${dark ? 'bg-primary text-white' : 'bg-primary-light text-primary'}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className={`text-lg font-semibold ${dark ? '!text-white' : ''}`}>{s.title}</h3>
                {s.description && <p className={`mt-1.5 text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{s.description}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function About() {
  const { settings } = useSite();
  const a = settings.about || {};
  if (!a.title && !a.content) return null;
  return (
    <section className="container-x grid items-center gap-10 py-16 lg:grid-cols-2">
      <SmartImage src={a.image} alt={a.title} className="aspect-[4/3] w-full rounded-3xl shadow-lift" iconClass="h-16 w-16" />
      <div>
        <p className="section-eyebrow">About us</p>
        <h2 className="section-title">{a.title}</h2>
        <p className="mt-4 whitespace-pre-line text-slate-600">{a.content}</p>
        {a.stats?.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-4">
            {a.stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <p className="font-display text-2xl font-semibold text-primary">{s.value}</p>
                <p className="text-sm text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Testimonials() {
  const { site } = useSite();
  if (!site.testimonials.length) return null;
  return (
    <section className="bg-white py-16">
      <div className="container-x">
        <SectionHead eyebrow="Testimonials" title="What our customers say" />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {site.testimonials.map((t) => (
            <figure key={t._id} className="card relative p-6">
              <Quote className="absolute right-5 top-5 h-8 w-8 text-primary/10" />
              <div className="mb-3 flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < t.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed text-slate-600">“{t.message}”</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <SmartImage src={t.photo} alt={t.customerName} className="h-10 w-10 rounded-full" iconClass="h-4 w-4" />
                <div>
                  <p className="text-sm font-semibold text-ink">{t.customerName}</p>
                  <p className="text-xs text-slate-500">{[t.location, t.tripDetails].filter(Boolean).join(' · ')}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const { settings } = useSite();
  const [open, setOpen] = useState(0);
  if (!settings.faqs?.length) return null;
  return (
    <section className="container-x py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <p className="section-eyebrow">FAQ</p>
          <h2 className="section-title">Frequently asked questions</h2>
        </div>
        <div className="space-y-3">
          {settings.faqs.map((f, i) => (
            <div key={f._id || f.question} className="card overflow-hidden">
              <button type="button" onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-ink" aria-expanded={open === i}>
                {f.question}
                <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && <p className="whitespace-pre-line px-5 pb-5 text-sm text-slate-600">{f.answer}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactBand() {
  const { settings, company } = useSite();
  const c = settings.contact || {};
  const wa = waLink(c.whatsappNumber, `Hi ${company}, I'd like to book a cab.`);
  return (
    <section className="container-x">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-dark px-6 py-10 text-white sm:px-10">
        <div className="hero-pattern absolute inset-0 opacity-60" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="font-display text-2xl font-semibold text-white sm:text-3xl">Need a ride? We&apos;re a call away.</h2>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
              {c.phone && <span className="flex items-center gap-2"><Phone className="h-4 w-4" />{c.phone}</span>}
              {c.email && <span className="flex items-center gap-2"><Mail className="h-4 w-4" />{c.email}</span>}
              {c.address && <span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{c.address}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="lg" to="/book" icon={ShieldCheck}>Book online</Button>
            {wa && <Button variant="whatsapp" size="lg" href={wa} target="_blank" rel="noreferrer" icon={MessageCircle}>WhatsApp</Button>}
            {c.phone && <Button variant="outline" size="lg" href={`tel:${c.phone}`} icon={Phone}>Call</Button>}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { settings } = useSite();
  const d = settings.display || {};
  return (
    <>
      <Hero />
      {d.showCategories !== false && <Categories />}
      {d.showCars !== false && d.carSelectionEnabled !== false && <Cars />}
      {d.showPopularDestinations !== false && <Destinations />}
      {d.showServices !== false && <IconGrid items={settings.services} eyebrow="Services" title="Everything you need on the road" />}
      {d.showWhyChooseUs !== false && <IconGrid items={settings.whyChooseUs} eyebrow="Why choose us" title="Travel with confidence" dark />}
      {d.showAbout !== false && <About />}
      {d.showTestimonials !== false && <Testimonials />}
      {d.showFaq !== false && <Faq />}
      <ContactBand />
    </>
  );
}
