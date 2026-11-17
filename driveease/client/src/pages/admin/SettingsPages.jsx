/**
 * Website Content, Contact Information and Website Settings — all backed by the
 * centralised /admin/settings API.
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Save, X } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { errorMessage, put } from '../../services/api';
import { useSite } from '../../context/SiteContext';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Form';
import { SectionForm } from '../../components/admin/SectionForm';
import { ErrorState, PageLoader } from '../../components/ui/Feedback';
import { PageHeader, Tabs } from '../../components/ui/Misc';
import { ICON_NAMES } from '../../utils/icons';

const iconOptions = ICON_NAMES.map((n) => ({ value: n, label: n }));

const CONTENT_TABS = [
  {
    value: 'branding',
    label: 'Branding',
    description: 'Company name, logo, favicon and brand colours used across the site.',
    fields: [
      { name: 'companyName', label: 'Company name', required: true },
      { name: 'tagline', label: 'Tagline' },
      { name: 'logo', label: 'Logo', type: 'image', folder: 'branding', aspect: 'aspect-[3/1]' },
      { name: 'favicon', label: 'Favicon (square PNG/ICO)', type: 'image', folder: 'branding', aspect: 'aspect-square' },
      { name: 'primaryColor', label: 'Primary colour', type: 'color', pattern: { value: /^#[0-9a-fA-F]{6}$/, message: 'Use #RRGGBB' } },
      { name: 'secondaryColor', label: 'Secondary colour', type: 'color', pattern: { value: /^#[0-9a-fA-F]{6}$/, message: 'Use #RRGGBB' } },
    ],
  },
  {
    value: 'hero',
    label: 'Homepage hero',
    description: 'The first section of the homepage, shown next to the booking form.',
    fields: [
      { name: 'heading', label: 'Heading', span: 2 },
      { name: 'subheading', label: 'Small heading above title' },
      { name: 'ctaText', label: 'Button text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'bannerImages', label: 'Banner images (first image is used as background)', type: 'images', folder: 'banners' },
    ],
  },
  {
    value: 'about',
    label: 'About',
    fields: [
      { name: 'title', label: 'Title', span: 2 },
      { name: 'content', label: 'Content', type: 'textarea', rows: 6 },
      { name: 'image', label: 'Image', type: 'image', folder: 'content', span: 2 },
      {
        name: 'stats',
        label: 'Highlights',
        type: 'rows',
        rowCols: 'sm:grid-cols-2',
        addLabel: 'Add highlight',
        fields: [
          { name: 'value', label: 'Value', placeholder: '5,000+' },
          { name: 'label', label: 'Label', placeholder: 'Happy customers' },
        ],
      },
    ],
  },
  {
    value: 'services',
    label: 'Services',
    listKey: true,
    fields: [
      {
        name: 'items',
        label: 'Services',
        type: 'rows',
        rowCols: 'sm:grid-cols-2 lg:grid-cols-4',
        addLabel: 'Add service',
        fields: [
          { name: 'title', label: 'Title', required: true },
          { name: 'description', label: 'Description' },
          { name: 'icon', label: 'Icon', type: 'select', options: iconOptions, default: 'Sparkles' },
          { name: 'isActive', label: 'Visible', type: 'checkbox', default: true },
        ],
      },
    ],
  },
  {
    value: 'whyChooseUs',
    label: 'Why choose us',
    listKey: true,
    fields: [
      {
        name: 'items',
        label: 'Reasons',
        type: 'rows',
        rowCols: 'sm:grid-cols-2 lg:grid-cols-4',
        addLabel: 'Add reason',
        fields: [
          { name: 'title', label: 'Title', required: true },
          { name: 'description', label: 'Description' },
          { name: 'icon', label: 'Icon', type: 'select', options: iconOptions, default: 'ShieldCheck' },
          { name: 'isActive', label: 'Visible', type: 'checkbox', default: true },
        ],
      },
    ],
  },
  {
    value: 'faqs',
    label: 'FAQ',
    listKey: true,
    fields: [
      {
        name: 'items',
        label: 'Questions',
        type: 'rows',
        rowCols: 'sm:grid-cols-[1fr_2fr_auto]',
        addLabel: 'Add question',
        fields: [
          { name: 'question', label: 'Question', required: true },
          { name: 'answer', label: 'Answer', type: 'textarea', rows: 2, required: true },
          { name: 'isActive', label: 'Visible', type: 'checkbox', default: true },
        ],
      },
    ],
  },
  {
    value: 'legal',
    label: 'Terms & privacy',
    description: 'Plain text; blank lines start new paragraphs.',
    fields: [
      { name: 'terms', label: 'Terms & conditions', type: 'textarea', rows: 10 },
      { name: 'privacy', label: 'Privacy policy', type: 'textarea', rows: 10 },
      { name: 'cancellationPolicy', label: 'Cancellation policy', type: 'textarea', rows: 5 },
    ],
  },
  {
    value: 'seo',
    label: 'SEO',
    fields: [
      { name: 'title', label: 'SEO title', span: 2, hint: 'Shown in the browser tab and search results (≤ 60 characters recommended)' },
      { name: 'description', label: 'SEO description', type: 'textarea', hint: '≤ 160 characters recommended' },
      { name: 'keywords', label: 'Keywords (comma separated)', span: 2 },
      { name: 'ogImage', label: 'Social share image', type: 'image', folder: 'branding' },
    ],
  },
  {
    value: 'footer',
    label: 'Footer',
    fields: [
      { name: 'text', label: 'Footer text', type: 'textarea' },
      { name: 'copyright', label: 'Copyright line', span: 2, hint: 'Leave empty for "© {year} {company}"' },
    ],
  },
];

function useSettings() {
  const { data, loading, error, reload, setData } = useFetch('/admin/settings');
  return { settings: data, loading, error, reload, setSettings: setData };
}

export function WebsiteContentPage() {
  const [tab, setTab] = useState('branding');
  const { settings, loading, error, reload, setSettings } = useSettings();
  if (loading && !settings) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const t = CONTENT_TABS.find((x) => x.value === tab);
  return (
    <div>
      <PageHeader title="Website Content" description="Everything customers see on the website. Changes go live immediately after saving." />
      <Tabs tabs={CONTENT_TABS} value={tab} onChange={setTab} />
      <SectionForm key={tab} settings={settings} section={t.value} fields={t.fields} listKey={t.listKey} title={t.label} description={t.description} onSaved={setSettings} />
    </div>
  );
}

export function ContactInfoPage() {
  const { settings, loading, error, reload, setSettings } = useSettings();
  if (loading && !settings) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <div className="space-y-6">
      <PageHeader title="Contact Information" description="Shown in the header, footer and contact page. The WhatsApp number receives booking notifications." />
      <SectionForm
        settings={settings}
        section="contact"
        onSaved={setSettings}
        title="Contact details"
        fields={[
          { name: 'phone', label: 'Phone number', type: 'tel' },
          { name: 'alternatePhone', label: 'Alternate phone', type: 'tel' },
          {
            name: 'whatsappNumber',
            label: 'WhatsApp number for bookings',
            type: 'tel',
            hint: 'Include country code, e.g. 919876543210. A 10-digit number is treated as Indian (+91).',
          },
          { name: 'email', label: 'Email', type: 'email' },
          { name: 'workingHours', label: 'Working hours', placeholder: 'Open 24 × 7' },
          { name: 'address', label: 'Address', type: 'textarea' },
          { name: 'mapEmbedUrl', label: 'Google Maps embed URL', span: 2, hint: 'Google Maps → Share → Embed a map → copy the src URL (https://www.google.com/maps/embed?...)' },
        ]}
      />
      <SectionForm
        settings={settings}
        section="social"
        onSaved={setSettings}
        title="Social media links"
        fields={['facebook', 'instagram', 'twitter', 'youtube', 'linkedin'].map((n) => ({ name: n, label: n[0].toUpperCase() + n.slice(1), type: 'url', placeholder: 'https://' }))}
      />
    </div>
  );
}

export function WebsiteSettingsPage() {
  const { settings, loading, error, reload, setSettings } = useSettings();
  if (loading && !settings) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <div className="space-y-6">
      <PageHeader title="Website Settings" description="Control what appears on the website and how bookings are accepted." />
      <SectionForm
        settings={settings}
        section="display"
        onSaved={setSettings}
        title="Car selection & homepage sections"
        fields={[
          { name: 'carSelectionEnabled', label: 'Enable car selection', description: 'Off: customers pick only a category; individual cars are hidden.', type: 'checkbox', default: true, span: 2 },
          {
            name: 'carDisplayMode',
            label: 'Car display mode',
            type: 'select',
            span: 2,
            options: [
              { value: 'categories_first', label: 'Show categories first, then cars in the chosen category' },
              { value: 'all_cars', label: 'Show all cars directly with search & filters' },
            ],
          },
          { name: 'showCategories', label: 'Homepage: car categories', type: 'checkbox', default: true },
          { name: 'showCars', label: 'Homepage: available cars', type: 'checkbox', default: true },
          { name: 'showPopularDestinations', label: 'Homepage: popular destinations', type: 'checkbox', default: true },
          { name: 'showServices', label: 'Homepage: services', type: 'checkbox', default: true },
          { name: 'showWhyChooseUs', label: 'Homepage: why choose us', type: 'checkbox', default: true },
          { name: 'showAbout', label: 'Homepage: about', type: 'checkbox', default: true },
          { name: 'showTestimonials', label: 'Homepage: testimonials', type: 'checkbox', default: true },
          { name: 'showFaq', label: 'Homepage: FAQ', type: 'checkbox', default: true },
          { name: 'showFareBreakdown', label: 'Show detailed fare breakdown to customers', type: 'checkbox', default: true, span: 2 },
        ]}
      />
      <SectionForm
        settings={settings}
        section="booking"
        onSaved={setSettings}
        title="Booking rules"
        description="Holidays, blocked dates and slots are managed in the Availability Calendar."
        fields={[
          { name: 'enabled', label: 'Accept online booking requests', type: 'checkbox', default: true },
          { name: 'localEnabled', label: 'Local bookings', type: 'checkbox', default: true },
          { name: 'outstationEnabled', label: 'Outstation bookings', type: 'checkbox', default: true },
          { name: 'requireCarSelection', label: 'Require customers to select a specific car', type: 'checkbox' },
          { name: 'pendingBlocksVehicle', label: 'Pending requests block the selected car', description: 'Off (default): only approved/confirmed bookings block a car.', type: 'checkbox', span: 2 },
          { name: 'operatingStart', label: 'Pickups from', type: 'time' },
          { name: 'operatingEnd', label: 'Pickups until', type: 'time' },
          { name: 'closedWeekdays', label: 'Closed on (weekly)', type: 'days' },
          { name: 'minAdvanceHours', label: 'Minimum notice (hours)', type: 'number', min: 0 },
          { name: 'maxAdvanceDays', label: 'Book up to (days ahead)', type: 'number', min: 1 },
          { name: 'maxTripDays', label: 'Maximum trip length (days)', type: 'number', min: 1 },
          { name: 'bookingRefPrefix', label: 'Booking reference prefix', hint: 'e.g. DE → DE2611180001' },
          { name: 'confirmationMessage', label: 'Message shown after booking', type: 'textarea' },
        ]}
      />
      <PaymentSettings settings={settings} onSaved={setSettings} />
    </div>
  );
}

/** Offline payment methods (array of strings) + UPI ID. */
function PaymentSettings({ settings, onSaved }) {
  const site = useSite();
  const [methods, setMethods] = useState(settings.paymentMethods || ['Cash', 'UPI']);
  const [upiId, setUpiId] = useState(settings.upiId || '');
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const add = () => {
    const v = draft.trim();
    if (v && !methods.some((m) => m.toLowerCase() === v.toLowerCase())) setMethods([...methods, v]);
    setDraft('');
  };
  const save = async () => {
    setSaving(true);
    try {
      const updated = await put('/admin/settings', { paymentMethods: methods, upiId });
      toast.success('Payment settings saved');
      onSaved(updated);
      site?.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-5">
      <h3 className="text-base font-semibold">Offline payment methods</h3>
      <p className="mb-4 mt-0.5 text-sm text-slate-500">Payments are collected by the driver or office — no payment gateway. These methods appear when recording payments.</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {methods.map((m) => (
          <span key={m} className="chip bg-slate-100 py-1 text-slate-700">
            {m}
            <button type="button" onClick={() => setMethods(methods.filter((x) => x !== m))} className="ml-1 text-slate-400 hover:text-rose-600" aria-label={`Remove ${m}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Add method">
          <div className="flex gap-2">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="e.g. Bank transfer" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
            <Button variant="outline" icon={Plus} onClick={add}>Add</Button>
          </div>
        </Field>
        <Field label="UPI ID (shown to customers after booking)">
          <Input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="business@upi" />
        </Field>
      </div>
      <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
        <Button icon={Save} loading={saving} disabled={!methods.length} onClick={save}>Save</Button>
      </div>
    </div>
  );
}
