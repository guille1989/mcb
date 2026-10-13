"use client";

import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useContext, useMemo, useSyncExternalStore, createContext, Fragment } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/lib/i18n/LocaleContext";
import type { Dictionary } from "@/lib/i18n/dictionaries";

declare global {
  interface Window {
    WidgetCheckout?: new (config: Record<string, unknown>) => {
      open: (callback: (result: { transaction: { id: string; status: string } }) => void) => void;
    };
  }
}

// ─── Catalog ─────────────────────────────────────────────────────────────────
const SACHET_OPTIONS = [
  { id: 1, qty: 10, price: 25.0, tagKey: "trial" },
  { id: 2, qty: 15, price: 37.5, tagKey: null },
  { id: 3, qty: 20, price: 50.0, tagKey: "popular" },
  { id: 4, qty: 30, price: 75.0, tagKey: "max" },
] as const;

const ORIGINS = [
  { id: "huila", name: "HUILA", color: "#FFD000", altitude: "1.800 m", process: "LAVADO", notes: "CARAMELO · CÍTRICO", sca: "86+ SCA", image: "/assets/img/products/sachetDoble.png" },
  { id: "tolima", name: "TOLIMA", color: "#FF1F8E", altitude: "1.950 m", process: "HONEY", notes: "CEREZA · CACAO", sca: "87+ SCA", image: undefined },
  { id: "cauca", name: "CAUCA", color: "#FAFAFA", altitude: "1.750 m", process: "NATURAL", notes: "PANELA · FRUTOS ROJOS", sca: "85+ SCA", image: undefined },
] as const;

const PHONE_COUNTRIES = [
  { iso: "CO", name: "Colombia", nameEn: "Colombia", code: "+57" },
  { iso: "MX", name: "México", nameEn: "Mexico", code: "+52" },
  { iso: "AR", name: "Argentina", nameEn: "Argentina", code: "+54" },
  { iso: "CL", name: "Chile", nameEn: "Chile", code: "+56" },
  { iso: "PE", name: "Perú", nameEn: "Peru", code: "+51" },
  { iso: "EC", name: "Ecuador", nameEn: "Ecuador", code: "+593" },
  { iso: "VE", name: "Venezuela", nameEn: "Venezuela", code: "+58" },
  { iso: "UY", name: "Uruguay", nameEn: "Uruguay", code: "+598" },
  { iso: "PY", name: "Paraguay", nameEn: "Paraguay", code: "+595" },
  { iso: "BO", name: "Bolivia", nameEn: "Bolivia", code: "+591" },
  { iso: "PA", name: "Panamá", nameEn: "Panama", code: "+507" },
  { iso: "CR", name: "Costa Rica", nameEn: "Costa Rica", code: "+506" },
  { iso: "GT", name: "Guatemala", nameEn: "Guatemala", code: "+502" },
  { iso: "SV", name: "El Salvador", nameEn: "El Salvador", code: "+503" },
  { iso: "HN", name: "Honduras", nameEn: "Honduras", code: "+504" },
  { iso: "NI", name: "Nicaragua", nameEn: "Nicaragua", code: "+505" },
  { iso: "DO", name: "República Dominicana", nameEn: "Dominican Republic", code: "+1" },
  { iso: "PR", name: "Puerto Rico", nameEn: "Puerto Rico", code: "+1" },
  { iso: "US", name: "Estados Unidos", nameEn: "United States", code: "+1" },
  { iso: "CA", name: "Canadá", nameEn: "Canada", code: "+1" },
  { iso: "ES", name: "España", nameEn: "Spain", code: "+34" },
  { iso: "PT", name: "Portugal", nameEn: "Portugal", code: "+351" },
  { iso: "FR", name: "Francia", nameEn: "France", code: "+33" },
  { iso: "DE", name: "Alemania", nameEn: "Germany", code: "+49" },
  { iso: "IT", name: "Italia", nameEn: "Italy", code: "+39" },
  { iso: "GB", name: "Reino Unido", nameEn: "United Kingdom", code: "+44" },
  { iso: "BR", name: "Brasil", nameEn: "Brazil", code: "+55" },
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────
type SachetOption = typeof SACHET_OPTIONS[number];
type OriginId = typeof ORIGINS[number]["id"];
type OriginCounts = Record<OriginId, number>;
const ORIGIN_COUNTS_EMPTY: OriginCounts = { huila: 0, tolima: 0, cauca: 0 };
type CartItem = { productId: number; name: string; subtitle: string; price: number; qty: number; image: string };
type ShippingData = { name: string; phone: string; phoneIso: string; email: string; country: string; department: string; city: string; address: string; apt: string; postalCode: string; notes: string };
type Errors = Partial<Record<keyof ShippingData, string>>;

const SHIPPING_EMPTY: ShippingData = { name: "", phone: "", phoneIso: "", email: "", country: "", department: "", city: "", address: "", apt: "", postalCode: "", notes: "" };

// An approved payment redirects to its own URL (/checkout/gracias) so Google Ads can count
// the conversion by URL. The order details ride along in sessionStorage, never in the URL.
const CONFIRMATION_PATH = "/checkout/gracias";
const CONFIRMED_ORDER_KEY = "mcb_confirmed_order";
type ConfirmedOrder = { reference: string; email: string };

// Used until /api/exchange-rate answers with the day's EUR → COP rate, or if it fails.
const FALLBACK_EUR_TO_COP = 3600;
const EurToCopContext = createContext(FALLBACK_EUR_TO_COP);

function useEurToCopRate() {
  const [rate, setRate] = useState(FALLBACK_EUR_TO_COP);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/exchange-rate")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && typeof data?.rate === "number") setRate(data.rate);
      })
      .catch(() => {}); // keep the fallback rate on any network error
    return () => {
      cancelled = true;
    };
  }, []);

  return rate;
}

function PriceTag({ eur }: { eur: number }) {
  const rate = useContext(EurToCopContext);
  const cop = Math.round(eur * rate).toLocaleString("es-CO");
  return (
    <>
      €{eur.toFixed(2)} <span className="co-price-cop">(≈ ${cop} COP)</span>
    </>
  );
}

// ─── Icons ───────────────────────────────────────────────────────────────────
function Bolt({ size = 20, color = "#F5C400" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={color} />
    </svg>
  );
}

function SkullIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <ellipse cx="16" cy="13" rx="11" ry="10" fill="#E8175D" />
      <circle cx="11.5" cy="12" r="2.8" fill="#0a0a0a" />
      <circle cx="20.5" cy="12" r="2.8" fill="#0a0a0a" />
      <path d="M11 21h10v3.5A5 5 0 0116 29a5 5 0 01-5-4.5V21z" fill="#E8175D" />
      <rect x="12" y="22" width="2.5" height="5" rx="0.8" fill="#0a0a0a" />
      <rect x="17.5" y="22" width="2.5" height="5" rx="0.8" fill="#0a0a0a" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="#F5C400" strokeWidth="1.5" />
      <path d="M7 11V7a5 5 0 0110 0v4" stroke="#F5C400" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1.5" fill="#F5C400" />
    </svg>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
// "Elige tu café" is skipped for now (only Huila is offered), so the bar only shows 2 stops;
// step 3 (shipping) is mapped to display position 2 here.
function ProgressBar({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useLocale();
  const displayStep = step === 1 ? 1 : 2;
  const progressLabels = [t.checkout.progress.dose, t.checkout.progress.shipping];
  return (
    <div className="co-progress">
      {progressLabels.map((label, i) => {
        const n = i + 1;
        return (
          <Fragment key={n}>
            {i > 0 && (
              <div className="co-prog-line">
                <div className="co-prog-line-fill" style={{ width: displayStep >= n ? "100%" : "0%" }} />
              </div>
            )}
            <div className={`co-prog-step${displayStep >= n ? " co-prog-step--on" : ""}`}>
              <div className="co-prog-dot">
                {displayStep >= n ? <Bolt size={11} color="#0a0a0a" /> : <span>{n}</span>}
              </div>
              <span className="co-prog-label">{label}</span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

// ─── Order Summary (shared) ───────────────────────────────────────────────────
function OrderSummary({ cart, setCart }: { cart: CartItem[]; setCart: React.Dispatch<React.SetStateAction<CartItem[]>> }) {
  const { t } = useLocale();
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const change = (id: number, delta: number) =>
    setCart((prev) => {
      const item = prev.find((c) => c.productId === id)!;
      const next = item.qty + delta;
      if (next <= 0) return prev.filter((c) => c.productId !== id);
      return prev.map((c) => c.productId === id ? { ...c, qty: next } : c);
    });

  const remove = (id: number) =>
    setCart((prev) => prev.filter((c) => c.productId !== id));

  return (
    <div className="co-summary">
      <div className="co-summary-items">
        {cart.map((item) => (
          <div key={item.productId} className="co-summary-item">
            <div className="co-summary-item-img">
              <Image src={item.image} alt={item.name} fill style={{ objectFit: "contain" }} />
            </div>
            <div className="co-summary-item-info">
              <div className="co-summary-item-name">{item.name}</div>
              <div className="co-summary-item-sub">{item.subtitle}</div>
              <div className="co-summary-item-controls">
                <button className="co-sum-btn" onClick={() => change(item.productId, -1)} aria-label={t.checkout.shipping.decreaseAria}>−</button>
                <span className="co-sum-qty">{item.qty}</span>
                <button className="co-sum-btn co-sum-btn--inc" onClick={() => change(item.productId, 1)} aria-label={t.checkout.shipping.increaseAria}>+</button>
                <button className="co-sum-remove" onClick={() => remove(item.productId)} aria-label={t.checkout.shipping.removeAria}>✕</button>
              </div>
            </div>
            <div className="co-summary-item-price"><PriceTag eur={item.price * item.qty} /></div>
          </div>
        ))}
      </div>
      <div className="co-summary-total">
        <span>{t.checkout.shipping.total}</span>
        <span><PriceTag eur={total} /></span>
      </div>
    </div>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────
function StepProducts({ cart, setCart, onNext }: { cart: CartItem[]; setCart: React.Dispatch<React.SetStateAction<CartItem[]>>; onNext: () => void }) {
  const { t } = useLocale();
  const selectedId = cart[0]?.productId ?? null;
  const tagText: Record<string, string> = {
    trial: t.checkout.step1.tagTrial,
    popular: t.checkout.step1.tagPopular,
    max: t.checkout.step1.tagMax,
  };

  const select = useCallback((option: SachetOption) => {
    setCart([{
      productId: option.id,
      name: "MCB PERSONAL",
      subtitle: `${option.qty} sachets`,
      price: option.price,
      qty: 1,
      image: "/assets/img/products/mcb_personal_10.png",
    }]);
  }, [setCart]);

  return (
    <div className="co-step1 co-step1--single">
      <div className="co-single-left">
        <div className="co-s1-header">
          <div className="co-s1-title-row">
            <Bolt size={32} />
            <h1 className="co-title">{t.checkout.step1.title}</h1>
            <Bolt size={32} />
          </div>
          <p className="co-s1-sub">{t.checkout.step1.sub}</p>
        </div>

        <div className="co-sachet-grid">
          {SACHET_OPTIONS.map((option) => (
            <button
              key={option.id}
              className={`co-sachet-btn${selectedId === option.id ? " co-sachet-btn--on" : ""}`}
              onClick={() => select(option)}
            >
              {option.tagKey && <span className="co-sachet-tag">{tagText[option.tagKey]}</span>}
              <span className="co-sachet-num">{option.qty}</span>
              <span className="co-sachet-label">{t.checkout.step1.sachets}</span>
              <span className="co-sachet-price"><PriceTag eur={option.price} /></span>
            </button>
          ))}
        </div>

        <button className="co-cta-btn co-single-cta" onClick={onNext} disabled={selectedId === null}>
          {t.checkout.step1.continue} <Bolt size={16} color="#0a0a0a" />
        </button>
      </div>

      <div className="co-single-right">
        <Image
          src="/assets/img/products/sachetsIndi.png"
          alt="MCB Personal — sachets Huila"
          fill
          sizes="(max-width: 900px) 100vw, 50vw"
          style={{ objectFit: "contain", transform: "scale(1.3)" }}
          priority
        />
      </div>
    </div>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────
function StepOrigin({ totalSachets, counts, setCounts, onBack, onNext }: {
  totalSachets: number;
  counts: OriginCounts;
  setCounts: React.Dispatch<React.SetStateAction<OriginCounts>>;
  onBack: () => void;
  onNext: () => void;
}) {
  const used = ORIGINS.reduce((s, o) => s + counts[o.id], 0);
  const remaining = totalSachets - used;

  const bump = (id: OriginId, delta: number) => {
    if (delta > 0 && remaining <= 0) return;
    setCounts((prev) => ({ ...prev, [id]: Math.max(0, prev[id] + delta) }));
  };

  return (
    <div className="co-step1 co-step-origin">
      <div className="co-s1-header">
        <button className="co-back-btn co-origin-back" onClick={onBack}>← Volver</button>
        <div className="co-s1-title-row">
          <Bolt size={32} />
          <h1 className="co-title">ELIGE TU CAFÉ</h1>
          <Bolt size={32} />
        </div>
        <p className="co-s1-sub">
          {remaining > 0
            ? <>{remaining === 1 ? "Falta" : "Faltan"} <span className="co-origin-remaining">{remaining}</span> de {totalSachets} sachets</>
            : <span className="co-origin-remaining">¡Dosis completa! {totalSachets} sachets repartidos</span>}
        </p>
        <div className="co-coffee-progress">
          <div className="co-coffee-progress-fill" style={{ width: `${totalSachets ? (used / totalSachets) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="co-coffee-grid">
        {ORIGINS.map((origin) => {
          const count = counts[origin.id];
          const on = count > 0;
          return (
            <div
              key={origin.id}
              className={`co-coffee-card${on ? " co-coffee-card--on" : ""}`}
              style={on ? { borderColor: origin.color, boxShadow: `0 0 0 1px ${origin.color}55, 0 16px 40px -20px ${origin.color}88` } : undefined}
            >
              <div className="co-coffee-visual">
                {origin.image ? (
                  <Image src={origin.image} alt={origin.name} fill sizes="180px" style={{ objectFit: "contain", transform: "scale(1.5)" }} />
                ) : (
                  <div className="co-coffee-visual-placeholder" style={{ borderColor: origin.color }}>
                    <SkullIcon size={40} />
                    <span style={{ color: origin.color }}>{origin.sca}</span>
                  </div>
                )}
              </div>
              <h3 className="co-coffee-name" style={{ color: on ? origin.color : undefined }}>{origin.name}</h3>
              <div className="co-coffee-meta">{origin.altitude} · {origin.process}</div>
              <div className="co-coffee-stepper">
                <button className="co-coffee-step-btn" onClick={() => bump(origin.id, -1)} disabled={count === 0} aria-label={`Quitar ${origin.name}`}>−</button>
                <span className="co-coffee-step-num" style={{ color: on ? origin.color : undefined }}>{count}</span>
                <button
                  className="co-coffee-step-btn co-coffee-step-btn--inc"
                  onClick={() => bump(origin.id, 1)}
                  disabled={remaining <= 0}
                  style={{ borderColor: origin.color, color: origin.color }}
                  aria-label={`Agregar ${origin.name}`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="co-coffee-summary">
        {ORIGINS.map((origin) => (
          <span key={origin.id} className="co-coffee-summary-item">
            <span style={{ color: counts[origin.id] > 0 ? origin.color : undefined }}>{origin.name}</span> · {counts[origin.id]}
          </span>
        ))}
      </div>

      <button className="co-cta-btn co-single-cta" onClick={onNext} disabled={remaining !== 0}>
        Continuar <Bolt size={16} color="#0a0a0a" />
      </button>
    </div>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────
function validate(s: ShippingData, errors: Dictionary["checkout"]["errors"]): Errors {
  const e: Errors = {};
  if (!s.name.trim())       e.name       = errors.name;
  if (!s.phoneIso)          e.phone      = errors.phoneCountry;
  else if (!s.phone.trim()) e.phone      = errors.phoneRequired;
  if (!s.email.trim())      e.email      = errors.email;
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) e.email = errors.emailInvalid;
  if (!s.country.trim())    e.country    = errors.country;
  if (!s.department.trim()) e.department = errors.department;
  if (!s.city.trim())       e.city       = errors.city;
  if (!s.address.trim())    e.address    = errors.address;
  return e;
}

function Field({ label, name, value, onChange, error, type = "text", placeholder, optionalLabel, prefix }: {
  label: string; name: keyof ShippingData; value: string; onChange: (v: string) => void;
  error?: string; type?: string; placeholder?: string; optionalLabel?: string; prefix?: string;
}) {
  return (
    <div className="co-field">
      <label className="co-label">
        {label}{optionalLabel && <span className="co-optional"> {optionalLabel}</span>}
      </label>
      <div className={`co-input-wrap${error ? " co-input-wrap--err" : ""}`}>
        {prefix && <span className="co-prefix">{prefix}</span>}
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="co-input" />
      </div>
      {error && <span className="co-err-msg">{error}</span>}
    </div>
  );
}

// Prices are in euros but Wompi only charges in COP, so before it opens we spell out that
// the peso amount is just the euro price converted — not a different or extra charge.
function CurrencyNoticeModal({ eur, cop, rate, onConfirm, onCancel }: {
  eur: number; cop: number; rate: number; onConfirm: () => void; onCancel: () => void;
}) {
  const { t } = useLocale();
  const n = t.checkout.currencyNotice;
  const eurText = `€${eur.toFixed(2)}`;
  // Two decimals so the shown multiplication actually adds up to the charged pesos.
  const rateText = rate.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const copText = cop.toLocaleString("es-CO");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  // Portaled to <body>: .co-step2's entry animation leaves a transform on it, which would
  // pin this position:fixed overlay to the step instead of the viewport.
  return createPortal(
    <div className="co-modal-backdrop" onClick={onCancel}>
      <div className="co-modal" role="dialog" aria-modal="true" aria-labelledby="co-currency-title" onClick={(e) => e.stopPropagation()}>
        <div className="co-modal-title-row">
          <Bolt size={22} />
          <h2 id="co-currency-title" className="co-modal-title">{n.title}</h2>
        </div>
        <p className="co-modal-text">{n.explanation(eurText)}</p>
        <div className="co-modal-amounts">
          <div className="co-modal-row">
            <span>{n.priceLabel}</span>
            <span className="co-modal-eur">{eurText}</span>
          </div>
          <div className="co-modal-row">
            <span>{n.rateLabel}</span>
            <span className="co-modal-rate">1 € = ${rateText} COP</span>
          </div>
          <div className="co-modal-row co-modal-row--total">
            <span>{n.chargeLabel}</span>
            <span className="co-modal-cop">${copText} COP</span>
          </div>
          <div className="co-modal-formula">{eurText} × {rateText} = ${copText} COP</div>
        </div>
        <p className="co-modal-text">{n.sameAmount}</p>
        <p className="co-modal-note">{n.bankNote}</p>
        <div className="co-modal-actions">
          <button type="button" className="co-submit-btn" onClick={onConfirm} autoFocus>
            {n.confirm} <Bolt size={16} color="#0a0a0a" />
          </button>
          <button type="button" className="co-back-btn co-modal-cancel" onClick={onCancel}>{n.cancel}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function StepShipping({ cart, setCart, origins, shipping, setShipping, onBack }: {
  cart: CartItem[]; setCart: React.Dispatch<React.SetStateAction<CartItem[]>>; origins: OriginCounts; shipping: ShippingData; setShipping: React.Dispatch<React.SetStateAction<ShippingData>>; onBack: () => void;
}) {
  const [errors, setErrors] = useState<Errors>({});
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [widgetReady, setWidgetReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [wompiConfig, setWompiConfig] = useState<{ publicKey: string; sandbox: boolean } | null>(null);
  const eurToCopRate = useContext(EurToCopContext);
  const { t, locale } = useLocale();
  const router = useRouter();

  useEffect(() => {
    fetch("/api/wompi/config")
      .then((res) => res.json())
      .then((data) => {
        if (data?.publicKey) setWompiConfig({ publicKey: data.publicKey, sandbox: data.sandbox });
      })
      .catch(() => {});
  }, []);

  const set = (key: keyof ShippingData) => (val: string) =>
    setShipping((prev) => ({ ...prev, [key]: val }));

  // Submitting only validates and shows the currency notice; the payment itself starts
  // from the notice's confirm button (startPayment).
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(shipping, t.checkout.errors);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (!widgetReady || !window.WidgetCheckout || !wompiConfig) {
      setPayError(t.checkout.payment.widgetLoading);
      return;
    }

    setPayError(null);
    setNoticeOpen(true);
  };

  const startPayment = async () => {
    setNoticeOpen(false);
    if (!window.WidgetCheckout || !wompiConfig) {
      setPayError(t.checkout.payment.widgetLoading);
      return;
    }

    setPaying(true);
    try {
      const phoneCountry = PHONE_COUNTRIES.find((c) => c.iso === shipping.phoneIso);
      // Charged in whole pesos so it matches, to the peso, the COP figure in the notice.
      const amountInCents = totalCop * 100;
      const reference = `MCB-${Date.now()}`;

      const sigRes = await fetch("/api/wompi/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, amountInCents, currency: "COP" }),
      });
      if (!sigRes.ok) throw new Error(t.checkout.payment.signatureError);
      const { signature } = await sigRes.json();

      // Recorded as PENDING now, before the widget even opens, so the order isn't lost
      // if the customer closes the tab mid-payment — the webhook updates its status later.
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          doseQty,
          dosePriceEur: totalPrice,
          amountInCents,
          origins,
          shipping,
          locale,
        }),
      });
      if (!orderRes.ok) throw new Error(t.checkout.payment.orderError);

      const checkout = new window.WidgetCheckout({
        currency: "COP",
        amountInCents,
        reference,
        publicKey: wompiConfig.publicKey,
        signature: { integrity: signature },
        customerData: {
          email: shipping.email,
          fullName: shipping.name,
          phoneNumber: shipping.phone,
          phoneNumberPrefix: phoneCountry?.code ?? "+57",
        },
      });

      checkout.open(async (result) => {
        const status = result?.transaction?.status;
        const id = result?.transaction?.id;

        // Don't trust the widget callback alone — re-check server-side against Wompi.
        let confirmedStatus = status;
        if (id) {
          try {
            const statusRes = await fetch(`/api/wompi/status?id=${id}`);
            if (statusRes.ok) confirmedStatus = (await statusRes.json()).status;
          } catch {
            // fall back to the widget's own reported status
          }
        }

        if (confirmedStatus === "APPROVED") {
          const order = { cart, origins, shipping, wompiTransactionId: id };
          console.log("ORDER →", JSON.stringify(order, null, 2));
          const confirmed: ConfirmedOrder = { reference, email: shipping.email };
          try {
            window.sessionStorage.setItem(CONFIRMED_ORDER_KEY, JSON.stringify(confirmed));
          } catch {
            // sessionStorage unavailable — the confirmation page falls back to a generic message.
          }
          // `paying` stays on so the button can't be re-pressed while the route changes.
          router.replace(CONFIRMATION_PATH);
        } else {
          setPaying(false);
          setPayError(t.checkout.payment.notCompleted(confirmedStatus ?? t.checkout.payment.unknownStatus));
        }
      });
    } catch (err) {
      setPaying(false);
      setPayError(err instanceof Error ? err.message : t.checkout.payment.genericError);
    }
  };

  const totalItems = cart.reduce((s, c) => s + c.qty, 0);
  const totalPrice = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const totalCop = Math.round(totalPrice * eurToCopRate);
  const doseQty = SACHET_OPTIONS.find((o) => o.id === cart[0]?.productId)?.qty ?? 0;

  return (
    <div className="co-step2">
      <Script src="https://checkout.wompi.co/widget.js" strategy="afterInteractive" onLoad={() => setWidgetReady(true)} />
      <div className="co-s2-header">
        <button className="co-back-btn" onClick={onBack}>{t.checkout.home}</button>
        <div className="co-s2-title-row">
          <SkullIcon size={28} />
          <h1 className="co-title">{t.checkout.shipping.title}</h1>
        </div>

        {/* Mobile summary accordion */}
        <div className="co-summary-mobile">
          <button className="co-summary-toggle" onClick={() => setSummaryOpen(!summaryOpen)}>
            <span className="co-summary-toggle-left">
              <SkullIcon size={16} />
              {t.checkout.shipping.yourOrder} — {totalItems} {totalItems === 1 ? t.checkout.shipping.item : t.checkout.shipping.items}
            </span>
            <span className="co-summary-toggle-right">
              <PriceTag eur={totalPrice} /> <span className="co-chevron">{summaryOpen ? "▲" : "▼"}</span>
            </span>
          </button>
          {summaryOpen && (
            <div className="co-summary-mobile-body">
              <OrderSummary cart={cart} setCart={setCart} />
            </div>
          )}
        </div>
      </div>

      <div className="co-s2-body">
        <form className="co-form" onSubmit={handleSubmit} noValidate>
          {/* Contact */}
          <div className="co-form-section">
            <div className="co-section-label"><Bolt size={15} /> {t.checkout.shipping.contactSection}</div>
            <div className="co-fields-grid">
              <Field label={t.checkout.shipping.fullName} name="name" value={shipping.name} onChange={set("name")} error={errors.name} placeholder={t.checkout.shipping.fullNamePh} />
              <div className="co-field">
                <label className="co-label">{t.checkout.shipping.phone}</label>
                <div className={`co-input-wrap${errors.phone ? " co-input-wrap--err" : ""}`}>
                  <select
                    className="co-phone-select"
                    value={shipping.phoneIso}
                    onChange={(e) => set("phoneIso")(e.target.value)}
                    aria-label={t.checkout.shipping.phoneCountryAria}
                  >
                    <option value="" disabled>{t.checkout.shipping.phoneCountryOption}</option>
                    {PHONE_COUNTRIES.map((c) => (
                      <option key={c.iso} value={c.iso}>{c.code} {locale === "en" ? c.nameEn : c.name}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={shipping.phone}
                    onChange={(e) => set("phone")(e.target.value)}
                    placeholder={t.checkout.shipping.phonePh}
                    className="co-input"
                  />
                </div>
                {errors.phone && <span className="co-err-msg">{errors.phone}</span>}
              </div>
              <Field label={t.checkout.shipping.email} name="email" value={shipping.email} onChange={set("email")} error={errors.email} placeholder={t.checkout.shipping.emailPh} type="email" />
            </div>
          </div>

          {/* Address */}
          <div className="co-form-section">
            <div className="co-section-label"><Bolt size={15} /> {t.checkout.shipping.addressSection}</div>
            <div className="co-fields-grid">
              <Field label={t.checkout.shipping.country} name="country" value={shipping.country} onChange={set("country")} error={errors.country} placeholder={t.checkout.shipping.countryPh} />
              <Field label={t.checkout.shipping.department} name="department" value={shipping.department} onChange={set("department")} error={errors.department} placeholder={t.checkout.shipping.departmentPh} />
              <Field label={t.checkout.shipping.city} name="city" value={shipping.city} onChange={set("city")} error={errors.city} placeholder={t.checkout.shipping.cityPh} />
              <Field label={t.checkout.shipping.address} name="address" value={shipping.address} onChange={set("address")} error={errors.address} placeholder={t.checkout.shipping.addressPh} />
              <Field label={t.checkout.shipping.apt} name="apt" value={shipping.apt} onChange={set("apt")} placeholder={t.checkout.shipping.aptPh} optionalLabel={t.checkout.shipping.optional} />
              <Field label={t.checkout.shipping.postalCode} name="postalCode" value={shipping.postalCode} onChange={set("postalCode")} placeholder={t.checkout.shipping.postalCodePh} optionalLabel={t.checkout.shipping.optional} />
            </div>
          </div>

          {/* Notes */}
          <div className="co-form-section">
            <div className="co-section-label"><Bolt size={15} /> {t.checkout.shipping.notesSection} <span className="co-optional">{t.checkout.shipping.optional}</span></div>
            <textarea
              className="co-textarea"
              value={shipping.notes}
              onChange={(e) => set("notes")(e.target.value)}
              placeholder={t.checkout.shipping.notesPh}
              rows={3}
            />
          </div>

          {/* Payment */}
          <div className="co-payment-ph">
            <LockIcon />
            <span>{t.checkout.shipping.paymentSecure}{wompiConfig?.sandbox ? t.checkout.shipping.paymentSandbox : ""}</span>
          </div>

          {/* An approved payment navigates to CONFIRMATION_PATH, so only errors are shown here. */}
          {payError && (
            <div className="co-pay-result co-pay-result--err">{payError}</div>
          )}

          <button type="submit" className="co-submit-btn" disabled={paying}>
            {paying ? t.checkout.shipping.processingPayment : <>{t.checkout.shipping.pay} <PriceTag eur={totalPrice} /></>} <Bolt size={18} color="#0a0a0a" />
          </button>
        </form>

        {/* Desktop sidebar */}
        <aside className="co-sidebar">
          <div className="co-sidebar-title">
            <SkullIcon size={20} /> {t.checkout.shipping.yourOrder}
          </div>
          <OrderSummary cart={cart} setCart={setCart} />
        </aside>
      </div>

      {noticeOpen && (
        <CurrencyNoticeModal
          eur={totalPrice}
          cop={totalCop}
          rate={eurToCopRate}
          onConfirm={startPayment}
          onCancel={() => setNoticeOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function CheckoutFlow() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [origins, setOrigins] = useState<OriginCounts>(ORIGIN_COUNTS_EMPTY);
  const [shipping, setShipping] = useState<ShippingData>(SHIPPING_EMPTY);
  const eurToCopRate = useEurToCopRate();
  const { t } = useLocale();

  const totalSachets = SACHET_OPTIONS.find((o) => o.id === cart[0]?.productId)?.qty ?? 0;

  useEffect(() => {
    if (step >= 2 && cart.length === 0) setStep(1);
  }, [cart, step]);

  // Selecting a different dose resets the origin mix so it can't exceed the new total.
  const setCartAndResetOrigins: React.Dispatch<React.SetStateAction<CartItem[]>> = (value) => {
    setOrigins(ORIGIN_COUNTS_EMPTY);
    setCart(value);
  };

  // Only one coffee type (Huila) is offered for now, so the origin-picker step (still
  // fully implemented below, just unused) is skipped: the whole dose goes to Huila
  // automatically and we jump straight to shipping.
  const skipToShipping = () => {
    setOrigins({ ...ORIGIN_COUNTS_EMPTY, huila: totalSachets });
    setStep(3);
  };

  return (
    <EurToCopContext.Provider value={eurToCopRate}>
      <div className="co-root">
        <div className="co-topbar">
          <Link href="/" className="co-home-btn">{t.checkout.home}</Link>
          <ProgressBar step={step} />
          <div className="co-topbar-spacer" />
        </div>
        <div key={step} className="co-content">
          {step === 1 && (
            <StepProducts
              cart={cart}
              setCart={setCartAndResetOrigins}
              onNext={skipToShipping}
            />
          )}
          {/* Origin picker (step 2) is skipped for now — only Huila is offered — but kept
              here, unreachable, so it's ready to switch back on once Tolima/Cauca are live. */}
          {false && step === 2 && (
            <StepOrigin
              totalSachets={totalSachets}
              counts={origins}
              setCounts={setOrigins}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <StepShipping cart={cart} setCart={setCart} origins={origins} shipping={shipping} setShipping={setShipping} onBack={() => setStep(1)} />
          )}
        </div>
      </div>
    </EurToCopContext.Provider>
  );
}


// ─── Confirmation (/checkout/gracias) ─────────────────────────────────────────
const subscribeNoop = () => () => {};

function readConfirmedOrder(): string | null {
  try {
    return window.sessionStorage.getItem(CONFIRMED_ORDER_KEY);
  } catch {
    return null;
  }
}

export function CheckoutConfirmation() {
  const { t } = useLocale();
  // null on the server and whenever nothing is stored (e.g. storage blocked) — the
  // email/reference lines are then just left out of the confirmation.
  const stored = useSyncExternalStore(subscribeNoop, readConfirmedOrder, () => null);
  const order = useMemo(() => {
    try {
      return stored ? (JSON.parse(stored) as ConfirmedOrder) : null;
    } catch {
      return null;
    }
  }, [stored]);

  return (
    <div className="co-root">
      <div className="co-topbar">
        <Link href="/" className="co-home-btn">{t.checkout.home}</Link>
        <ProgressBar step={3} />
        <div className="co-topbar-spacer" />
      </div>
      <div className="co-content">
        <div className="co-step2 co-confirmation">
          <Bolt size={40} />
          <h1 className="co-title">{t.checkout.confirmation.title}</h1>
          {order?.email && <p className="co-confirmation-sub">{t.checkout.confirmation.sub(order.email)}</p>}
          {order?.reference && <p className="co-confirmation-ref">{t.checkout.confirmation.reference} {order.reference}</p>}
          <p className="co-confirmation-contact">
            {t.checkout.confirmation.contact} <a href="mailto:orders@themothercoffebaby.com">orders@themothercoffebaby.com</a>
          </p>
          <Link href="/checkout" className="co-cta-btn">
            {t.checkout.confirmation.backToStore} <Bolt size={16} color="#0a0a0a" />
          </Link>
        </div>
      </div>
    </div>
  );
}
