export function ProductsSection() {
  return (
    <section className="products" id="products">
      <div className="products-header reveal">
        <div>
          <div className="section-label">La colección</div>
          <h2 className="section-title" style={{ marginBottom: 0 }}>ELIGE TU<br /><span style={{ color: "var(--yellow)" }}>ARMA</span></h2>
        </div>
        <button className="btn-ghost">Ver todos →</button>
      </div>

      <div className="products-grid">
        <div className="product-item reveal"><div className="product-img-wrap"><span className="product-label">BESTSELLER</span><div className="product-img-inner product-bg-1" /></div><div className="product-name">THE ORIGINAL</div><div className="product-info"><span className="product-origin">Colombia · Huila</span><span className="product-price">€24</span></div></div>
        <div className="product-item reveal" style={{ transitionDelay: "0.15s" }}><div className="product-img-wrap"><span className="product-label">NUEVO</span><div className="product-img-inner product-bg-2" /></div><div className="product-name">COLD BREW PRO</div><div className="product-info"><span className="product-origin">Colombia · Nariño</span><span className="product-price">€28</span></div></div>
        <div className="product-item reveal" style={{ transitionDelay: "0.3s" }}><div className="product-img-wrap"><span className="product-label">EDICIÓN LIMITADA</span><div className="product-img-inner product-bg-3" /></div><div className="product-name">NIGHT SHIFT</div><div className="product-info"><span className="product-origin">Colombia · Cauca</span><span className="product-price">€32</span></div></div>
      </div>
    </section>
  );
}
