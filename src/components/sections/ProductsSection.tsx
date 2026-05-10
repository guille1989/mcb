"use client";

import Image from "next/image";
import Link from "next/link";

export function ProductsSection() {
  return (
    <section className="products" id="products">
      <div className="products-header reveal">
        <div>
          <div className="section-label">La colección</div>
          <h2 className="section-title" style={{ marginBottom: 0 }}>ELIGE TU<br /><span style={{ color: "var(--yellow)" }}>ARMA</span></h2>
        </div>
        <Link href="/checkout" className="btn-ghost">Ver todos →</Link>
      </div>

      <div className="products-showcase reveal">
        <Image
          src="/assets/img/products/mcb_review.png"
          alt="MCB Productos"
          fill
          sizes="100vw"
          style={{ objectFit: "contain" }}
          priority
        />
        <Link href="/checkout" className="products-showcase-cta">
          Quiero mi dosis <span>→</span>
        </Link>
      </div>
    </section>
  );
}
