export function TestimonialsSection() {
  return (
    <section className="testimonials">
      <div className="section-label">Lo que dicen</div>
      <h2 className="section-title reveal">ELLOS YA<br />CRUZARON<br />EL LÍMITE</h2>
      <div className="testimonials-grid">
        <div className="testimonial-card reveal"><div className="t-stars">★★★★★</div><p className="t-text">&quot;Nunca pensé que un café me pudiera cambiar el entreno de esta forma. El enfoque es brutal. Sin nerviosismo, sin crash.&quot;</p><div className="t-author"><div className="t-avatar">CM</div><div><div className="t-name">Carlos M.</div><div className="t-role">Powerlifter · Madrid</div></div></div></div>
        <div className="testimonial-card reveal" style={{ transitionDelay: "0.1s" }}><div className="t-stars">★★★★★</div><p className="t-text">&quot;Trabajo 12 horas al día. Necesitaba algo que me mantuviera on point sin que me destruyera.&quot;</p><div className="t-author"><div className="t-avatar">LA</div><div><div className="t-name">Laura A.</div><div className="t-role">CEO · Barcelona</div></div></div></div>
        <div className="testimonial-card reveal" style={{ transitionDelay: "0.2s" }}><div className="t-stars">★★★★★</div><p className="t-text">&quot;El sabor es increíble y la energía real. No es ese rush artificial que se cae en 2 horas.&quot;</p><div className="t-author"><div className="t-avatar">JP</div><div><div className="t-name">Javier P.</div><div className="t-role">Trail Runner · Bogotá</div></div></div></div>
      </div>
    </section>
  );
}
