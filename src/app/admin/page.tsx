"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./admin.css";

type Order = {
  reference: string;
  status: string;
  wompi_transaction_id: string | null;
  dose_qty: number;
  dose_price_eur: number;
  amount_in_cents_cop: number;
  origin_huila: number;
  origin_tolima: number;
  origin_cauca: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_phone_country: string | null;
  shipping_country: string;
  shipping_department: string;
  shipping_city: string;
  shipping_address: string;
  shipping_apt: string | null;
  shipping_postal_code: string | null;
  notes: string | null;
  confirmation_email_sent: boolean;
  shipped: boolean;
  shipped_at: string | null;
  created_at: string;
  updated_at: string;
};

const POLL_MS = 5000;

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `hace ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

function statusLabel(status: string) {
  switch (status) {
    case "APPROVED":
      return { text: "APROBADO", cls: "admin-badge--ok" };
    case "PENDING":
      return { text: "PENDIENTE", cls: "admin-badge--pending" };
    case "DECLINED":
    case "ERROR":
    case "VOIDED":
      return { text: status, cls: "admin-badge--err" };
    default:
      return { text: status, cls: "admin-badge--pending" };
  }
}

function originLabel(o: Order) {
  const parts: string[] = [];
  if (o.origin_huila) parts.push(`Huila x${o.origin_huila}`);
  if (o.origin_tolima) parts.push(`Tolima x${o.origin_tolima}`);
  if (o.origin_cauca) parts.push(`Cauca x${o.origin_cauca}`);
  return parts.join(", ") || "—";
}

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const [fetchError, setFetchError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orders", { cache: "no-store" });
      if (res.status === 401) {
        setLoggedIn(false);
        setFetchError("");
        return;
      }
      if (!res.ok) {
        setFetchError("No se pudieron cargar los pedidos. Intenta de nuevo en un momento.");
        return;
      }
      const data = await res.json();
      setOrders(data.orders ?? []);
      setLastUpdated(new Date());
      setLoggedIn(true);
      setFetchError("");
    } catch {
      setFetchError("No se pudo conectar. Revisa tu conexión.");
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (loggedIn) {
      pollRef.current = setInterval(fetchOrders, POLL_MS);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [loggedIn, fetchOrders]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setLoginError("Contraseña incorrecta");
        return;
      }
      setPassword("");
      await fetchOrders();
    } catch {
      setLoginError("Ocurrió un error, intenta de nuevo.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setLoggedIn(false);
    setOrders([]);
  };

  const toggleShipped = async (reference: string, shipped: boolean) => {
    // Optimistic update — the polling loop will correct it if the request fails.
    setOrders((prev) =>
      prev.map((o) =>
        o.reference === reference
          ? { ...o, shipped, shipped_at: shipped ? new Date().toISOString() : null }
          : o
      )
    );
    setSelected((prev) =>
      prev && prev.reference === reference
        ? { ...prev, shipped, shipped_at: shipped ? new Date().toISOString() : null }
        : prev
    );
    try {
      const res = await fetch("/api/admin/orders/ship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, shipped }),
      });
      if (!res.ok) throw new Error();
    } catch {
      fetchOrders();
    }
  };

  if (loggedIn === null) {
    return (
      <div className="admin-shell admin-loading">
        {fetchError || "Cargando…"}
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="admin-shell admin-login-shell">
        <form className="admin-login-card" onSubmit={handleLogin}>
          <h1>MCB · PEDIDOS</h1>
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {loginError && <p className="admin-login-error">{loginError}</p>}
          <button type="submit" disabled={loggingIn || !password}>
            {loggingIn ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <h1>MCB · PEDIDOS</h1>
        <div className="admin-header-right">
          {lastUpdated && (
            <span className="admin-last-updated">
              Actualizado {relativeTime(lastUpdated.toISOString())}
            </span>
          )}
          <button className="admin-logout-btn" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </header>

      {orders.length === 0 ? (
        <p className="admin-empty">Todavía no hay pedidos.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Estado</th>
                <th>Cuándo</th>
                <th>Referencia</th>
                <th>Cliente</th>
                <th>Dosis</th>
                <th>Total</th>
                <th>Envío a</th>
                <th>Correo</th>
                <th>Enviado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const badge = statusLabel(o.status);
                return (
                  <tr key={o.reference} onClick={() => setSelected(o)} className="admin-row">
                    <td>
                      <span className={`admin-badge ${badge.cls}`}>{badge.text}</span>
                    </td>
                    <td className="admin-muted">{relativeTime(o.created_at)}</td>
                    <td className="admin-mono">{o.reference}</td>
                    <td>
                      {o.customer_name}
                      <br />
                      <span className="admin-muted">{o.customer_email}</span>
                    </td>
                    <td>{o.dose_qty} sachets</td>
                    <td>€{o.dose_price_eur.toFixed(2)}</td>
                    <td className="admin-muted">
                      {o.shipping_city}, {o.shipping_country}
                    </td>
                    <td>{o.confirmation_email_sent ? "✅" : "—"}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        className={`admin-ship-btn ${o.shipped ? "admin-ship-btn--done" : ""}`}
                        onClick={() => toggleShipped(o.reference, !o.shipped)}
                      >
                        {o.shipped ? "✅ Enviado" : "Marcar enviado"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="admin-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <button className="admin-modal-close" onClick={() => setSelected(null)}>
              ✕
            </button>
            <h2>{selected.reference}</h2>
            <p className={`admin-badge ${statusLabel(selected.status).cls}`}>
              {statusLabel(selected.status).text}
            </p>

            <h3>Cliente</h3>
            <p>{selected.customer_name}</p>
            <p>{selected.customer_email}</p>
            <p>
              {selected.customer_phone_country ? `${selected.customer_phone_country} ` : ""}
              {selected.customer_phone}
            </p>

            <h3>Pedido</h3>
            <p>
              {selected.dose_qty} sachets — €{selected.dose_price_eur.toFixed(2)} (
              {originLabel(selected)})
            </p>

            <h3>Envío</h3>
            <p>
              {selected.shipping_address}
              {selected.shipping_apt ? `, ${selected.shipping_apt}` : ""}
            </p>
            <p>
              {selected.shipping_city}, {selected.shipping_department}
            </p>
            <p>
              {selected.shipping_country}
              {selected.shipping_postal_code ? ` ${selected.shipping_postal_code}` : ""}
            </p>
            {selected.notes && (
              <>
                <h3>Notas</h3>
                <p>{selected.notes}</p>
              </>
            )}

            <h3>Pago</h3>
            <p className="admin-mono">{selected.wompi_transaction_id ?? "—"}</p>
            <p className="admin-muted">
              Creado {relativeTime(selected.created_at)} · Actualizado{" "}
              {relativeTime(selected.updated_at)}
            </p>

            <h3>Envío del pedido</h3>
            <button
              className={`admin-ship-btn ${selected.shipped ? "admin-ship-btn--done" : ""}`}
              onClick={() => toggleShipped(selected.reference, !selected.shipped)}
            >
              {selected.shipped ? "✅ Enviado" : "Marcar como enviado"}
            </button>
            {selected.shipped && selected.shipped_at && (
              <p className="admin-muted">Marcado {relativeTime(selected.shipped_at)}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
