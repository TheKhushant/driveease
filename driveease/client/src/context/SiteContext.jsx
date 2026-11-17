import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { errorMessage, get } from '../services/api';
import { applyBrandColors } from '../utils/color';

const SiteContext = createContext(null);

function setMeta(name, content) {
  if (!content) return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Loads all public, admin-managed site content once and applies branding/SEO. */
export function SiteProvider({ children }) {
  const [site, setSite] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSite(await get('/public/site'));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!site) return;
    const { branding = {}, seo = {} } = site.settings;
    applyBrandColors(branding.primaryColor, branding.secondaryColor);
    document.title = seo.title || branding.companyName || document.title;
    setMeta('description', seo.description);
    setMeta('keywords', seo.keywords);
    const fav = document.getElementById('app-favicon');
    if (fav && (branding.favicon || branding.logo)) fav.href = branding.favicon || branding.logo;
  }, [site]);

  const value = useMemo(
    () => ({
      site,
      settings: site?.settings,
      company: site?.settings?.branding?.companyName || 'DriveEase',
      loading,
      error,
      reload: load,
    }),
    [site, loading, error, load],
  );
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export const useSite = () => useContext(SiteContext);
