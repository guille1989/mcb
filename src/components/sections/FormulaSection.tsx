export function FormulaSection() {
  return (
    <section className="formula" id="formula">
      <div className="formula-visual reveal">
        <div className="formula-circle fc-main"><div className="fc-main-text">THE<br />MOTHER<br />FORMULA</div></div>
        <div className="formula-circle fc-orbit">
          <div className="fc-node fc-node-1"><span>☕</span>CAFÉ</div>
          <div className="fc-node fc-node-2"><span>⚡</span>ENERGÍA</div>
          <div className="fc-node fc-node-3"><span>🧬</span>PUREZA</div>
          <div className="fc-node fc-node-4"><span>🌿</span>NATURAL</div>
        </div>
      </div>
      <div className="formula-right reveal" style={{ transitionDelay: "0.2s" }}>
        <div className="section-label">La ciencia detrás</div>
        <h2 className="section-title">LA FÓRMULA<br /><span style={{ color: "var(--yellow)" }}>PERFECTA</span></h2>
        <div className="formula-items">
          <div className="formula-item"><div className="fi-num">01</div><div className="fi-info"><div className="fi-title">CAFEÍNA ANHIDRA</div><div className="fi-desc">Forma purificada de cafeína con absorción máxima y efecto preciso.</div></div><div className="fi-badge">3g / dosis</div></div>
          <div className="formula-item"><div className="fi-num">02</div><div className="fi-info"><div className="fi-title">ANTIOXIDANTES</div><div className="fi-desc">Polifenoles del grano colombiano que protegen y potencian.</div></div><div className="fi-badge">Natural</div></div>
          <div className="formula-item"><div className="fi-num">03</div><div className="fi-info"><div className="fi-title">SIN AZÚCAR</div><div className="fi-desc">Energía pura. Sin crash. Sin compromisos. Como debe ser.</div></div><div className="fi-badge">0g azúcar</div></div>
          <div className="formula-item"><div className="fi-num">04</div><div className="fi-info"><div className="fi-title">ORIGEN ÚNICO</div><div className="fi-desc">Granos seleccionados de fincas de altitud superior a 1.800 msnm.</div></div><div className="fi-badge">Colombia</div></div>
        </div>
      </div>
    </section>
  );
}
