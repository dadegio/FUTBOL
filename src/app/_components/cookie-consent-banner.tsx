"use client";

import { useEffect, useMemo, useState } from "react";

type Consent = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
};

const STORAGE_KEY = "futbol-cookie-consent-v1";
const DEFAULT_CONSENT: Consent = {
  essential: true,
  analytics: false,
  marketing: false,
  updatedAt: "",
};

function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Consent>;
    return {
      essential: true,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return null;
  }
}

function saveConsent(consent: Consent) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent("futbol-cookie-consent-updated", { detail: consent }));
}

export function hasMarketingConsent() {
  return readConsent()?.marketing === true;
}

export default function CookieConsentBanner() {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [privacyHref, setPrivacyHref] = useState("/privacy");
  const [cookieHref, setCookieHref] = useState("/cookie");

  useEffect(() => {
    const current = readConsent();
    if (!current) {
      setVisible(true);
    } else {
      setAnalytics(current.analytics);
      setMarketing(current.marketing);
    }
    setReady(true);

    const openPreferences = () => {
      const latest = readConsent() ?? DEFAULT_CONSENT;
      setAnalytics(latest.analytics);
      setMarketing(latest.marketing);
      setCustomizing(true);
      setVisible(true);
    };

    const handleLeagueBranding = (event: Event) => {
      const detail = (event as CustomEvent<{ cookieBannerEnabled?: boolean | null; privacyPolicyUrl?: string | null; cookiePolicyUrl?: string | null }>).detail;
      if (detail?.privacyPolicyUrl) setPrivacyHref(detail.privacyPolicyUrl);
      if (detail?.cookiePolicyUrl) setCookieHref(detail.cookiePolicyUrl);
      if (detail && detail.cookieBannerEnabled === false) {
        setEnabled(false);
        setVisible(false);
      } else if (detail) {
        setEnabled(true);
      }
    };

    window.addEventListener("futbol-open-cookie-preferences", openPreferences);
    window.addEventListener("league-branding-updated", handleLeagueBranding);
    return () => {
      window.removeEventListener("futbol-open-cookie-preferences", openPreferences);
      window.removeEventListener("league-branding-updated", handleLeagueBranding);
    };
  }, []);

  const summary = useMemo(() => {
    if (analytics && marketing) return "Hai accettato statistiche e marketing.";
    if (analytics) return "Hai accettato solo statistiche.";
    if (marketing) return "Hai accettato solo marketing.";
    return "Sono attivi soltanto i cookie tecnici essenziali.";
  }, [analytics, marketing]);

  function closeWith(next: Pick<Consent, "analytics" | "marketing">) {
    const consent: Consent = {
      essential: true,
      analytics: next.analytics,
      marketing: next.marketing,
      updatedAt: new Date().toISOString(),
    };
    saveConsent(consent);
    setAnalytics(consent.analytics);
    setMarketing(consent.marketing);
    setVisible(false);
    setCustomizing(false);
  }

  if (!ready || !enabled || !visible) return null;

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-[90] px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="mx-auto max-w-3xl rounded-[24px] border border-white/15 bg-[#080d14]/95 p-4 text-white shadow-[0_18px_70px_rgba(0,0,0,.45)] backdrop-blur-xl sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200">
              Privacy e cookie
            </p>
            <h2 className="mt-1 text-lg font-black tracking-[-0.04em]">
              Decidi tu cosa attivare
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/68">
              Usiamo cookie tecnici per far funzionare login e preferenze. Statistiche e pubblicità vengono attivate solo con il tuo consenso.
              <a href={privacyHref} className="ml-1 font-bold text-cyan-200">Privacy</a>
              <span className="mx-1 text-white/35">·</span>
              <a href={cookieHref} className="font-bold text-cyan-200">Cookie</a>
            </p>
            <p className="mt-2 text-xs font-semibold text-white/50">{summary}</p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:w-48">
            <button
              type="button"
              onClick={() => closeWith({ analytics: false, marketing: false })}
              className="min-h-11 rounded-2xl border border-white/12 px-4 text-sm font-bold text-white/78"
            >
              Solo necessari
            </button>
            <button
              type="button"
              onClick={() => closeWith({ analytics: true, marketing: true })}
              className="min-h-11 rounded-2xl bg-white px-4 text-sm font-black text-black"
            >
              Accetta tutto
            </button>
          </div>
        </div>

        {customizing && (
          <div className="mt-4 grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <input type="checkbox" checked disabled className="mt-1" />
              <span>
                <span className="block text-sm font-black">Tecnici</span>
                <span className="mt-1 block text-xs text-white/55">Necessari per sessione, sicurezza e navigazione.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-black">Statistiche</span>
                <span className="mt-1 block text-xs text-white/55">Misurazione anonima dell'utilizzo, se configurata.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 sm:col-span-2">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-black">Marketing e pubblicità</span>
                <span className="mt-1 block text-xs text-white/55">Consente annunci e strumenti pubblicitari di terze parti, quando configurati.</span>
              </span>
            </label>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => setCustomizing((v) => !v)}
            className="text-xs font-bold text-cyan-200"
          >
            {customizing ? "Nascondi preferenze" : "Personalizza preferenze"}
          </button>
          <button
            type="button"
            onClick={() => closeWith({ analytics, marketing })}
            className="min-h-10 rounded-2xl border border-cyan-200/35 px-4 text-xs font-black text-cyan-100"
          >
            Salva preferenze
          </button>
        </div>
      </div>
    </div>
  );
}
