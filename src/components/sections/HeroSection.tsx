import Image from "next/image";

export function HeroSection() {
  return (
    <section className="hero">
      <div className="hero-bg" />
      <div className="hero-grid" />

      <div className="hero-left">
        <div className="hero-tag">⚡ Café colombiano de especialidad</div>
        <h1 className="hero-headline">
          <span>CAFÉ</span>
          <span className="accent" data-text="BRUTAL">BRUTAL</span>
          <span className="stroke">SIN LÍMITES</span>
        </h1>
        <p className="hero-sub">
          Cafeína pura extraída de los granos más potentes de Colombia.
          Diseñada para llevar tus entrenos y tu día a otro nivel.
          READY para todo.
        </p>
        <div className="hero-actions">
          <button className="btn-primary">Quiero mi dosis →</button>
          <button className="btn-ghost">Ver la fórmula</button>
        </div>
        <div className="hero-stats">
          <div className="stat-item"><span className="stat-num">3G</span><span className="stat-label">Cafeína pura</span></div>
          <div className="stat-item"><span className="stat-num">0</span><span className="stat-label">Sin crash</span></div>
          <div className="stat-item"><span className="stat-num">100%</span><span className="stat-label">Colombia</span></div>
        </div>
      </div>

      <div className="hero-right">
        <div className="product-stage">
          <div className="ring" />
          <div className="ring ring-2" />
          <div className="product-card">
            <div className="power-badge">POWER</div>
            <div className="skull-container">
              <Image className="skull-svg" src="/assets/img/mcbMain.png" alt="The Mother Coffee Baby" width={286} height={286} priority />
            </div>
          </div>
          <div className="product-pills">
            <span className="pill">3g cafeína</span>
            <span className="pill">energía real</span>
            <span className="pill">sin crash</span>
          </div>
        </div>
      </div>
    </section>
  );
}
