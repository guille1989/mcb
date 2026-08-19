"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useCallback, useEffect, Fragment } from "react";

// ─── Catalog ─────────────────────────────────────────────────────────────────
const SACHET_OPTIONS = [
  { id: 1, qty: 10, price: 10.0, tag: "PRUEBA" },
  { id: 2, qty: 15, price: 15.0, tag: null },
  { id: 3, qty: 20, price: 20.0, tag: "POPULAR" },
  { id: 4, qty: 30, price: 30.0, tag: "MÁXIMA" },
] as const;

const ORIGINS = [
  { id: "huila", name: "HUILA", color: "#FFD000", altitude: "1.800 m", process: "LAVADO", notes: "CARAMELO · CÍTRICO", sca: "86+ SCA", image: "/assets/img/products/sachetDoble.png" },
  { id: "tolima", name: "TOLIMA", color: "#FF1F8E", altitude: "1.950 m", process: "HONEY", notes: "CEREZA · CACAO", sca: "87+ SCA", image: undefined },
  { id: "cauca", name: "CAUCA", color: "#FAFAFA", altitude: "1.750 m", process: "NATURAL", notes: "PANELA · FRUTOS ROJOS", sca: "85+ SCA", image: undefined },
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────
type SachetOption = typeof SACHET_OPTIONS[number];
type OriginId = typeof ORIGINS[number]["id"];
type OriginCounts = Record<OriginId, number>;
const ORIGIN_COUNTS_EMPTY: OriginCounts = { huila: 0, tolima: 0, cauca: 0 };
type CartItem = { productId: number; name: string; subtitle: string; price: number; qty: number; image: string };
type ShippingData = { name: string; phone: string; email: string; country: string; department: string; city: string; address: string; apt: string; postalCode: string; notes: string };
type Errors = Partial<Record<keyof ShippingData, string>>;

const SHIPPING_EMPTY: ShippingData = { name: "", phone: "", email: "", country: "Colombia", department: "", city: "", address: "", apt: "", postalCode: "", notes: "" };

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
const PROGRESS_LABELS = ["Elige tu dosis", "Elige tu café", "Envío"];

function ProgressBar({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="co-progress">
      {PROGRESS_LABELS.map((label, i) => {
        const n = i + 1;
        return (
          <Fragment key={n}>
            {i > 0 && (
              <div className="co-prog-line">
                <div className="co-prog-line-fill" style={{ width: step >= n ? "100%" : "0%" }} />
              </div>
            )}
            <div className={`co-prog-step${step >= n ? " co-prog-step--on" : ""}`}>
              <div className="co-prog-dot">
                {step >= n ? <Bolt size={11} color="#0a0a0a" /> : <span>{n}</span>}
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
                <button className="co-sum-btn" onClick={() => change(item.productId, -1)} aria-label="Restar">−</button>
                <span className="co-sum-qty">{item.qty}</span>
                <button className="co-sum-btn co-sum-btn--inc" onClick={() => change(item.productId, 1)} aria-label="Sumar">+</button>
                <button className="co-sum-remove" onClick={() => remove(item.productId)} aria-label="Eliminar">✕</button>
              </div>
            </div>
            <div className="co-summary-item-price">€{(item.price * item.qty).toFixed(2)}</div>
          </div>
        ))}
      </div>
      <div className="co-summary-total">
        <span>Total</span>
        <span>€{total.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────
function StepProducts({ cart, setCart, onNext }: { cart: CartItem[]; setCart: React.Dispatch<React.SetStateAction<CartItem[]>>; onNext: () => void }) {
  const selectedId = cart[0]?.productId ?? null;

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
            <h1 className="co-title">ELIGE TU DOSIS</h1>
            <Bolt size={32} />
          </div>
          <p className="co-s1-sub">MCB Personal · Monodosis de café de especialidad</p>
        </div>

        <div className="co-sachet-grid">
          {SACHET_OPTIONS.map((option) => (
            <button
              key={option.id}
              className={`co-sachet-btn${selectedId === option.id ? " co-sachet-btn--on" : ""}`}
              onClick={() => select(option)}
            >
              {option.tag && <span className="co-sachet-tag">{option.tag}</span>}
              <span className="co-sachet-num">{option.qty}</span>
              <span className="co-sachet-label">sachets</span>
              <span className="co-sachet-price">€{option.price.toFixed(2)}</span>
            </button>
          ))}
        </div>

        <button className="co-cta-btn co-single-cta" onClick={onNext} disabled={selectedId === null}>
          Continuar <Bolt size={16} color="#0a0a0a" />
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
function validate(s: ShippingData): Errors {
  const e: Errors = {};
  if (!s.name.trim())       e.name       = "El nombre es requerido";
  if (!s.phone.trim())      e.phone      = "El teléfono es requerido";
  if (!s.email.trim())      e.email      = "El email es requerido";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) e.email = "Email inválido";
  if (!s.country.trim())    e.country    = "El país es requerido";
  if (!s.department.trim()) e.department = "El departamento es requerido";
  if (!s.city.trim())       e.city       = "La ciudad es requerida";
  if (!s.address.trim())    e.address    = "La dirección es requerida";
  return e;
}

function Field({ label, name, value, onChange, error, type = "text", placeholder, optional, prefix }: {
  label: string; name: keyof ShippingData; value: string; onChange: (v: string) => void;
  error?: string; type?: string; placeholder?: string; optional?: boolean; prefix?: string;
}) {
  return (
    <div className="co-field">
      <label className="co-label">
        {label}{optional && <span className="co-optional"> (opcional)</span>}
      </label>
      <div className={`co-input-wrap${error ? " co-input-wrap--err" : ""}`}>
        {prefix && <span className="co-prefix">{prefix}</span>}
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="co-input" />
      </div>
      {error && <span className="co-err-msg">{error}</span>}
    </div>
  );
}

function StepShipping({ cart, setCart, origins, shipping, setShipping, onBack }: {
  cart: CartItem[]; setCart: React.Dispatch<React.SetStateAction<CartItem[]>>; origins: OriginCounts; shipping: ShippingData; setShipping: React.Dispatch<React.SetStateAction<ShippingData>>; onBack: () => void;
}) {
  const [errors, setErrors] = useState<Errors>({});
  const [summaryOpen, setSummaryOpen] = useState(false);

  const set = (key: keyof ShippingData) => (val: string) =>
    setShipping((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(shipping);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const order = { cart, origins, shipping };
    console.log("ORDER →", JSON.stringify(order, null, 2));
    alert("¡Pedido registrado! Revisa la consola (F12) para ver los detalles.");
  };

  const totalItems = cart.reduce((s, c) => s + c.qty, 0);
  const totalPrice = cart.reduce((s, c) => s + c.price * c.qty, 0);

  return (
    <div className="co-step2">
      <div className="co-s2-header">
        <button className="co-back-btn" onClick={onBack}>← Volver</button>
        <div className="co-s2-title-row">
          <SkullIcon size={28} />
          <h1 className="co-title">¿A DÓNDE TE LO MANDAMOS?</h1>
        </div>

        {/* Mobile summary accordion */}
        <div className="co-summary-mobile">
          <button className="co-summary-toggle" onClick={() => setSummaryOpen(!summaryOpen)}>
            <span className="co-summary-toggle-left">
              <SkullIcon size={16} />
              Tu pedido — {totalItems} {totalItems === 1 ? "producto" : "productos"}
            </span>
            <span className="co-summary-toggle-right">
              €{totalPrice.toFixed(2)} <span className="co-chevron">{summaryOpen ? "▲" : "▼"}</span>
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
            <div className="co-section-label"><Bolt size={15} /> Datos de contacto</div>
            <div className="co-fields-grid">
              <Field label="Nombre completo" name="name" value={shipping.name} onChange={set("name")} error={errors.name} placeholder="Tu nombre completo" />
              <Field label="Teléfono" name="phone" value={shipping.phone} onChange={set("phone")} error={errors.phone} placeholder="300 123 4567" prefix="+57" type="tel" />
              <Field label="Email" name="email" value={shipping.email} onChange={set("email")} error={errors.email} placeholder="tu@email.com" type="email" />
            </div>
          </div>

          {/* Address */}
          <div className="co-form-section">
            <div className="co-section-label"><Bolt size={15} /> Dirección de envío</div>
            <div className="co-fields-grid">
              <Field label="País" name="country" value={shipping.country} onChange={set("country")} error={errors.country} placeholder="Colombia" />
              <Field label="Departamento" name="department" value={shipping.department} onChange={set("department")} error={errors.department} placeholder="Bogotá D.C." />
              <Field label="Ciudad" name="city" value={shipping.city} onChange={set("city")} error={errors.city} placeholder="Tu ciudad" />
              <Field label="Dirección" name="address" value={shipping.address} onChange={set("address")} error={errors.address} placeholder="Calle 123 #45-67" />
              <Field label="Apartamento / Complemento" name="apt" value={shipping.apt} onChange={set("apt")} placeholder="Apto 301, Torre B…" optional />
              <Field label="Código postal" name="postalCode" value={shipping.postalCode} onChange={set("postalCode")} placeholder="110111" optional />
            </div>
          </div>

          {/* Notes */}
          <div className="co-form-section">
            <div className="co-section-label"><Bolt size={15} /> Notas del pedido <span className="co-optional">(opcional)</span></div>
            <textarea
              className="co-textarea"
              value={shipping.notes}
              onChange={(e) => set("notes")(e.target.value)}
              placeholder="Instrucciones de entrega, referencias del lugar…"
              rows={3}
            />
          </div>

          {/* Payment placeholder */}
          <div className="co-payment-ph">
            <LockIcon />
            <span>Método de pago — próximamente</span>
          </div>

          <button type="submit" className="co-submit-btn">
            Revisar pedido <Bolt size={18} color="#0a0a0a" />
          </button>
        </form>

        {/* Desktop sidebar */}
        <aside className="co-sidebar">
          <div className="co-sidebar-title">
            <SkullIcon size={20} /> Tu pedido
          </div>
          <OrderSummary cart={cart} setCart={setCart} />
        </aside>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function CheckoutFlow() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [origins, setOrigins] = useState<OriginCounts>(ORIGIN_COUNTS_EMPTY);
  const [shipping, setShipping] = useState<ShippingData>(SHIPPING_EMPTY);

  const totalSachets = SACHET_OPTIONS.find((o) => o.id === cart[0]?.productId)?.qty ?? 0;
  const originsUsed = ORIGINS.reduce((s, o) => s + origins[o.id], 0);

  useEffect(() => {
    if (step >= 2 && cart.length === 0) setStep(1);
    else if (step === 3 && originsUsed !== totalSachets) setStep(2);
  }, [cart, step, originsUsed, totalSachets]);

  // Selecting a different dose resets the origin mix so it can't exceed the new total.
  const setCartAndResetOrigins: React.Dispatch<React.SetStateAction<CartItem[]>> = (value) => {
    setOrigins(ORIGIN_COUNTS_EMPTY);
    setCart(value);
  };

  return (
    <div className="co-root">
      <div className="co-topbar">
        <Link href="/" className="co-home-btn">← Volver</Link>
        <ProgressBar step={step} />
        <div className="co-topbar-spacer" />
      </div>
      <div key={step} className="co-content">
        {step === 1 && (
          <StepProducts
            cart={cart}
            setCart={setCartAndResetOrigins}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepOrigin
            totalSachets={totalSachets}
            counts={origins}
            setCounts={setOrigins}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <StepShipping cart={cart} setCart={setCart} origins={origins} shipping={shipping} setShipping={setShipping} onBack={() => setStep(2)} />
        )}
      </div>
    </div>
  );
}

