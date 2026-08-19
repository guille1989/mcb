"use client";

import { useEffect } from "react";
import { CursorLayer } from "@/components/layout/CursorLayer";
import { HeroSection } from "@/components/sections/HeroSection";
import { MarqueeSection } from "@/components/sections/MarqueeSection";

// Simplified landing for now — the header (NavSection) and the sections below the
// marquee (Benefits, Products, Formula, Testimonials, Cta, Footer) are still in
// src/components/sections, just not rendered here. Re-add their imports and JSX
// below to bring them back.

export default function Home() {
  useEffect(() => {
    const cursor = document.getElementById("cursor");
    const follower = document.getElementById("follower");

    if (!cursor || !follower) return;

    let mx = 0;
    let my = 0;
    let fx = 0;
    let fy = 0;
    let rafId = 0;
    let isHovering = false;

    const onMouseMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      cursor.style.transform = `translate(${mx - 6}px, ${my - 6}px) scale(${isHovering ? 2 : 1})`;
    };

    const animateFollower = () => {
      fx += (mx - fx - 20) * 0.12;
      fy += (my - fy - 20) * 0.12;
      follower.style.transform = `translate(${fx}px, ${fy}px)`;
      rafId = requestAnimationFrame(animateFollower);
    };

    const enterHandlers: Array<{ el: Element; enter: () => void; leave: () => void }> = [];
    document.querySelectorAll("button, a, .product-item, .benefit-card").forEach((el) => {
      const enter = () => {
        isHovering = true;
        follower.classList.add("cursor-hover");
        follower.style.width = "60px";
        follower.style.height = "60px";
      };
      const leave = () => {
        isHovering = false;
        follower.classList.remove("cursor-hover");
        follower.style.width = "40px";
        follower.style.height = "40px";
      };
      el.addEventListener("mouseenter", enter);
      el.addEventListener("mouseleave", leave);
      enterHandlers.push({ el, enter, leave });
    });

    const revealEls = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    revealEls.forEach((el) => observer.observe(el));
    document.addEventListener("mousemove", onMouseMove);
    rafId = requestAnimationFrame(animateFollower);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", onMouseMove);
      observer.disconnect();
      enterHandlers.forEach(({ el, enter, leave }) => {
        el.removeEventListener("mouseenter", enter);
        el.removeEventListener("mouseleave", leave);
      });
    };
  }, []);

  return (
    <>
      <CursorLayer />
      <HeroSection />
      <MarqueeSection />
    </>
  );
}
