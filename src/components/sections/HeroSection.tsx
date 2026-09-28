"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleContext";

export function HeroSection() {
  const { t } = useLocale();

  return (
    <section className="hero">
      <div className="hero-bg" />
      <div className="hero-grid" />

      <div className="hero-left">
        <div className="hero-tag">{t.hero.tag}</div>
        <h1 className="hero-headline">
          <span>{t.hero.headlineWord}</span>
          <span className="accent" data-text={t.hero.headlineAccent}>{t.hero.headlineAccent}</span>
          <span className="stroke">{t.hero.headlineStroke}</span>
        </h1>
        <p className="hero-sub">{t.hero.sub}</p>
        <div className="hero-actions">
          <Link href="/checkout" className="btn-primary">{t.hero.cta}</Link>
        </div>
        <div className="hero-stats">
          <div className="stat-item"><span className="stat-num">PREMIUM</span><span className="stat-label">{t.hero.statPremiumLabel}</span></div>
          <div className="stat-item"><span className="stat-num">0</span><span className="stat-label">{t.hero.statCrashLabel}</span></div>
          <div className="stat-item"><span className="stat-num">100%</span><span className="stat-label">{t.hero.statColombiaLabel}</span></div>
        </div>
      </div>

      <div className="hero-right">
        <div className="product-stage">
          <div className="ring" />
          <div className="ring ring-2" />
          <div className="product-card">
            <div className="power-badge">POWER</div>
            <div className="skull-container">
              <Image className="skull-svg" src="/assets/img/mcb_flotante.png" alt="The Mother Coffee Baby" width={286} height={286} priority />
            </div>
          </div>
          <div className="product-pills">
            <span className="pill">{t.hero.pillCoffee}</span>
            <span className="pill">{t.hero.pillEnergy}</span>
            <span className="pill">{t.hero.pillCrash}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
