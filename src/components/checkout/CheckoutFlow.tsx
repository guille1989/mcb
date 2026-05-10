"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useCallback, useEffect } from "react";

// ─── Catalog ─────────────────────────────────────────────────────────────────
const PRODUCTS = [
  { id: 1, name: "MCB BOLSA",     subtitle: "1000g",  desc: "Café molido de origen colombiano",    price: 18.99, image: "/assets/img/products/mcb_bolsa_1000.png" },
  { id: 2, name: "MCB PERSONAL",  subtitle: "10 und", desc: "Monodosis · café de especialidad",    price: 12.99, image: "/assets/img/products/mcb_personal_10.png" },
  { id: 3, name: "MCB LÍQUIDO",   subtitle: "250ml",  desc: "Concentrado líquido · Producto de Colombia", price: 14.99, image: "/assets/img/products/mcb_liquido_250.png" },
  { id: 4, name: "MCB LÍQUIDO",   subtitle: "500ml",  desc: "Concentrado líquido · Producto de Colombia", price: 24.99, image: "/assets/img/products/mcb_liquido_500.png" },
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────
type Product = typeof PRODUCTS[number];
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
function ProgressBar({ step }: { step: 1 | 2 }) {
  return (
    <div className="co-progress">
      <div className={`co-prog-step${step >= 1 ? " co-prog-step--on" : ""}`}>
        <div className="co-prog-dot">
          {step >= 1 ? <Bolt size={11} color="#0a0a0a" /> : <span>1</span>}
        </div>
        <span className="co-prog-label">Elige tu arma</span>
      </div>
      <div className="co-prog-line">
        <div className="co-prog-line-fill" style={{ width: step === 2 ? "100%" : "0%" }} />
      </div>
      <div className={`co-prog-step${step >= 2 ? " co-prog-step--on" : ""}`}>
        <div className="co-prog-dot">
          {step >= 2 ? <Bolt size={11} color="#0a0a0a" /> : <span>2</span>}
        </div>
        <span className="co-prog-label">Envío</span>
      </div>
    </div>
  );
}

// ─── Qty Stepper ──────────────────────────────────────────────────────────────
function QtyStepper({ qty, onDec, onInc }: { qty: number; onDec: () => void; onInc: () => void }) {
  return (
    <div className="co-stepper">
      <button className="co-stepper-btn" onClick={onDec} aria-label="Restar">−</button>
      <span className="co-stepper-num">{qty}</span>
      <button className="co-stepper-btn co-stepper-btn--inc" onClick={onInc} aria-label="Sumar">+</button>
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
  const getQty = (id: number) => cart.find((c) => c.productId === id)?.qty ?? 0;

  const updateQty = useCallback((product: Product, delta: number) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (!existing) {
        if (delta < 1) return prev;
        return [...prev, { productId: product.id, name: product.name, subtitle: product.subtitle, price: product.price, qty: 1, image: product.image }];
      }
      const newQty = existing.qty + delta;
      if (newQty <= 0) return prev.filter((c) => c.productId !== product.id);
      return prev.map((c) => c.productId === product.id ? { ...c, qty: newQty } : c);
    });
  }, [setCart]);

  const totalItems = cart.reduce((s, c) => s + c.qty, 0);
  const totalPrice = cart.reduce((s, c) => s + c.price * c.qty, 0);

  return (
    <div className="co-step1">
      <div className="co-s1-header">
        <div className="co-s1-title-row">
          <Bolt size={32} />
          <h1 className="co-title">ELIGE TU ARMA</h1>
          <Bolt size={32} />
        </div>
        <p className="co-s1-sub">Selecciona tus productos y cantidades</p>
      </div>

      <div className="co-products-grid">
        {PRODUCTS.map((product) => {
          const qty = getQty(product.id);
          const selected = qty > 0;
          return (
            <div key={product.id} className={`co-card${selected ? " co-card--on" : ""}`}>
              <div className="co-card-img">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 600px) 50vw, 25vw"
                  style={{ objectFit: "contain" }}
                />
                {selected && (
                  <div className="co-card-badge">
                    <SkullIcon size={12} /><span>{qty}</span>
                  </div>
                )}
              </div>
              <div className="co-card-body">
                <div>
                  <div className="co-card-name">{product.name}</div>
                  <div className="co-card-sub">{product.subtitle}</div>
                  <div className="co-card-desc">{product.desc}</div>
                </div>
                <div className="co-card-footer">
                  <span className="co-card-price">€{product.price.toFixed(2)}</span>
                  <QtyStepper qty={qty} onDec={() => updateQty(product, -1)} onInc={() => updateQty(product, 1)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`co-cart-bar${totalItems === 0 ? " co-cart-bar--empty" : ""}`}>
        <div className="co-cart-info">
          <SkullIcon size={32} />
          <div>
            <div className="co-cart-count">{totalItems} {totalItems === 1 ? "producto" : "productos"}</div>
            <div className="co-cart-total">€{totalPrice.toFixed(2)}</div>
          </div>
        </div>
        <button className="co-cta-btn" onClick={onNext} disabled={totalItems === 0}>
          Continuar <Bolt size={16} color="#0a0a0a" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────
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

function StepShipping({ cart, setCart, shipping, setShipping, onBack }: {
  cart: CartItem[]; setCart: React.Dispatch<React.SetStateAction<CartItem[]>>; shipping: ShippingData; setShipping: React.Dispatch<React.SetStateAction<ShippingData>>; onBack: () => void;
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
    const order = { cart, shipping };
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
  const [step, setStep] = useState<1 | 2>(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shipping, setShipping] = useState<ShippingData>(SHIPPING_EMPTY);

  useEffect(() => {
    if (step === 2 && cart.length === 0) setStep(1);
  }, [cart, step]);

  return (
    <div className="co-root">
      <div className="co-topbar">
        <Link href="/" className="co-home-btn">← Volver</Link>
        <ProgressBar step={step} />
        <div className="co-topbar-spacer" />
      </div>
      <div key={step} className="co-content">
        {step === 1 && <StepProducts cart={cart} setCart={setCart} onNext={() => setStep(2)} />}
        {step === 2 && <StepShipping cart={cart} setCart={setCart} shipping={shipping} setShipping={setShipping} onBack={() => setStep(1)} />}
      </div>
    </div>
  );
}
