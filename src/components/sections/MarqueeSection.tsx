const items = [
  "Café Colombiano",
  "Energía Real",
  "Sin Crash",
  "3G Cafeína Pura",
  "100% Especialidad",
  "Born Brutal",
  "The Mother Coffee Baby",
];

export function MarqueeSection() {
  const doubled = [...items, ...items];
  return (
    <div className="marquee-section">
      <div className="marquee-track" id="marquee">
        {doubled.map((item, i) => (
          <div className="marquee-item" key={`${item}-${i}`}><div className="marquee-dot" />{item}</div>
        ))}
      </div>
    </div>
  );
}
