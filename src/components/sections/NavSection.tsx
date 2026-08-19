"use client";

import Link from "next/link";
import { useState } from "react";

export function NavSection() {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      <nav>
        <div className="nav-logo">THE MOTHER COFFEE BABY</div>
        <ul className="nav-links nav-desktop-links">
          <li><a href="#products">Productos</a></li>
          <li><a href="#formula">La Fórmula</a></li>
          <li><a href="#story">Historia</a></li>
          <li><a href="https://www.instagram.com/themothercoffebaby" target="_blank" rel="noopener noreferrer">Instagram</a></li>
        </ul>
        <Link href="/checkout" className="nav-cta">Comprar ahora</Link>
        <button
          className={`nav-hamburger${open ? " open" : ""}`}
          onClick={() => setOpen(!open)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      <div id="mobile-navigation" className={`nav-mobile-overlay${open ? " open" : ""}`} aria-hidden={!open}>
        <ul className="nav-links">
          <li><a href="#products" onClick={close}>Productos</a></li>
          <li><a href="#formula" onClick={close}>La Fórmula</a></li>
          <li><a href="#story" onClick={close}>Historia</a></li>
          <li><a href="https://www.instagram.com/themothercoffebaby" target="_blank" rel="noopener noreferrer" onClick={close}>Instagram</a></li>
        </ul>
        <Link href="/checkout" className="btn-primary" onClick={close}>Comprar ahora →</Link>
      </div>
    </>
  );
}
