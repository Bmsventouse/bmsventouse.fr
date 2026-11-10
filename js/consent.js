/* Consent Mode v2. Run synchronously, before any third-party measurement. */
(() => {
  'use strict';
  if (window.BMSAnalytics) return;
  const KEY = 'bms_cookie_consent';
  const DATE_KEY = 'bms_cookie_consent_date';
  const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  let choice = null;
  let started = false;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {
    analytics_storage: 'denied', ad_storage: 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied',
    functionality_storage: 'denied', security_storage: 'granted'
  });

  try {
    const saved = localStorage.getItem(KEY);
    const rawDate = localStorage.getItem(DATE_KEY);
    const date = Number(rawDate);
    if (['accepted', 'granted', 'denied'].includes(saved) &&
        (!rawDate || (Number.isFinite(date) && date > 0 && Date.now() >= date && Date.now() - date < MAX_AGE))) {
      choice = saved === 'accepted' ? 'granted' : saved;
      if (!rawDate) localStorage.setItem(DATE_KEY, String(Date.now()));
    }
  } catch (_) { /* No storage: deny until an explicit choice in this session. */ }

  const signal = () => window.gtag('consent', 'update', {
    analytics_storage: choice === 'granted' ? 'granted' : 'denied',
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'
  });

  // Never put free-text query strings, fragments or contact details in analytics.
  const cleanURL = value => {
    try {
      const url = new URL(value, location.origin);
      return url.origin + url.pathname;
    } catch (_) { return ''; }
  };
  const measurementURL = () => {
    const url = new URL(cleanURL(location.href));
    // Retain validated advertising click identifiers for attribution, not form data.
    const query = new URLSearchParams(location.search);
    ['gclid', 'dclid', 'gbraid', 'wbraid'].forEach(key => {
      const value = query.get(key);
      if (value && /^[A-Za-z0-9_-]{10,200}$/.test(value)) url.searchParams.set(key, value);
    });
    return url.href;
  };
  const load = (id, src) => {
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.async = true;
    if (window.trustedTypes && typeof window.trustedTypes.createPolicy === 'function') {
      window.BMSTrustedTypesPolicy = window.BMSTrustedTypesPolicy || window.trustedTypes.createPolicy('default', {
        createHTML: value => value,
        createScriptURL: value => {
          const url = new URL(value, location.origin);
          if (url.origin === location.origin || ['www.googletagmanager.com', 'www.clarity.ms'].includes(url.hostname)) return value;
          throw new TypeError('Unexpected script origin');
        }
      });
      script.src = window.BMSTrustedTypesPolicy.createScriptURL(src);
    } else script.src = src;
    document.head.appendChild(script);
  };
  const start = () => {
    if (choice !== 'granted' || started) return;
    started = true;
    window.gtag('js', new Date());
    window.gtag('config', 'G-V7QXQC5260', {
      page_location: measurementURL(), page_referrer: cleanURL(document.referrer),
      allow_google_signals: false, allow_ad_personalization_signals: false
    });
    load('bms-google-tag', 'https://www.googletagmanager.com/gtag/js?id=G-V7QXQC5260');
    // Preserve the existing container. Its published contents require account review.
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    load('bms-gtm', 'https://www.googletagmanager.com/gtm.js?id=GTM-KD4HDWX4');
    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
    window.clarity('consentv2', { analytics_Storage: 'granted', ad_Storage: 'denied' });
    load('bms-clarity', 'https://www.clarity.ms/tag/v0wk7109ix');
  };
  const clearMeasurementCookies = () => {
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      if (!/^(_ga($|_)|_gid$|_gat($|_)|_gcl_|_clck$|_clsk$)/.test(name)) return;
      const domains = [null, location.hostname, '.' + location.hostname];
      if (location.hostname.endsWith('.bmsventouse.fr')) domains.push('.bmsventouse.fr');
      domains.forEach(domain => {
        document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax' +
          (domain ? '; domain=' + domain : '');
      });
    });
  };
  const setConsent = granted => {
    const mustReload = started && granted !== true;
    choice = granted === true ? 'granted' : 'denied';
    try {
      localStorage.setItem(KEY, choice);
      localStorage.setItem(DATE_KEY, String(Date.now()));
    } catch (_) { /* The current-session choice still applies. */ }
    signal();
    if (choice === 'granted') start();
    else {
      if (typeof window.clarity === 'function') {
        window.clarity('consentv2', { analytics_Storage: 'denied', ad_Storage: 'denied' });
        window.clarity('stop');
      }
      clearMeasurementCookies();
      // Terminate already loaded GTM/Clarity code and timers on withdrawal.
      if (mustReload) location.reload();
    }
  };
  const names = new Set([
    'phone_click', 'email_click', 'whatsapp_click', 'lead_contact',
    'cta_contact_click', 'nfc_page_view', 'contact_card_download'
  ]);
  const track = (name, params = {}) => {
    if (choice !== 'granted' || !names.has(name)) return;
    const safe = {};
    if (['phone', 'email', 'whatsapp', 'contact_card'].includes(params.contact_method)) {
      safe.contact_method = params.contact_method;
    }
    if (['site', 'nfc', 'contact_direct'].includes(params.lead_origin)) safe.lead_origin = params.lead_origin;
    if (name === 'lead_contact') safe.lead_stage = 'contact_intent';
    // One GA4 dispatch; no second custom-event push for GTM to resend.
    window.gtag('event', name, safe);
  };
  window.BMSAnalytics = Object.freeze({
    allowed: () => choice === 'granted', hasChoice: () => choice !== null,
    setConsent, track
  });
  if (choice !== null) signal();
  if (choice === 'granted') start();
})();
