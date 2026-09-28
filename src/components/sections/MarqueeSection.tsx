"use client";

import { useLocale } from "@/lib/i18n/LocaleContext";

export function MarqueeSection() {
  const { t } = useLocale();
  const doubled = [...t.marquee.items, ...t.marquee.items];
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
