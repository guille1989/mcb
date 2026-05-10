export function BenefitsSection() {
  return (
    <section className="benefits" id="story">
      <div className="section-label">Lo que te da</div>
      <h2 className="section-title reveal">NO ES CAFÉ.<br />ES UN<br /><span style={{ color: "var(--yellow)" }}>ARMA.</span></h2>
      <div className="benefits-grid">
        <div className="benefit-card reveal"><span className="benefit-icon">⚡</span><span className="benefit-num">01</span><div className="benefit-title">ENERGÍA EXPLOSIVA</div><p className="benefit-desc">Cafeína de liberación gradual. Sin picos, sin bajones. Energía limpia que dura horas donde más la necesitas.</p></div>
        <div className="benefit-card reveal" style={{ transitionDelay: "0.1s" }}><span className="benefit-icon">🧠</span><span className="benefit-num">02</span><div className="benefit-title">FOCO MÁXIMO</div><p className="benefit-desc">La combinación de cafeína y antioxidantes naturales activa tu cerebro en modo overdrive. Cada taza, cada misión.</p></div>
        <div className="benefit-card reveal" style={{ transitionDelay: "0.2s" }}><span className="benefit-icon">💪</span><span className="benefit-num">03</span><div className="benefit-title">RENDIMIENTO BRUTAL</div><p className="benefit-desc">Diseñado junto a atletas de élite colombianos. Para entrenar más duro, recuperar más rápido, rendir más lejos.</p></div>
      </div>
    </section>
  );
}
