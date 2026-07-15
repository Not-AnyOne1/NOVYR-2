/* ============================================================
   NOVYR — script.js
   GSAP + ScrollTrigger + Lenis choreography, cart, checkout.
   Everything degrades gracefully: if GSAP/Lenis fail to load
   or prefers-reduced-motion is set, content is fully readable.
============================================================ */
(() => {
  "use strict";

  /* ---------- Config ---------- */
  const WHATSAPP_NUMBER = "[WHATSAPP NUMBER]"; // e.g. "212600000000"
  const ORDER_ENDPOINT = "/api/orders";        // placeholder POST endpoint
  const EASE_SIG = "cubic-bezier(0.16, 1, 0.3, 1)";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
  const hasLenis = typeof Lenis !== "undefined";
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  // Motion is on only when GSAP loaded AND user allows it.
  const motion = hasGsap && !reducedMotion;

  if (!hasGsap) document.documentElement.classList.add("no-gsap");
  if (reducedMotion) document.documentElement.classList.add("no-motion");

  if (motion) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: "power3.out", duration: 0.75 });
    // GSAP name for the signature entrance curve
    if (gsap.registerEase) {
      // CustomEase isn't loaded; approximate cubic-bezier(0.16,1,0.3,1) = "expo.out"-like.
    }
  }
  // Signature ease used across all major reveals (close match to 0.16,1,0.3,1)
  const SIG = "expo.out";

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ============================================================
     LENIS SMOOTH SCROLL
  ============================================================ */
  let lenis = null;
  if (hasLenis && !reducedMotion) {
    lenis = new Lenis({ lerp: 0.075, duration: 1.2 });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    if (motion) lenis.on("scroll", () => ScrollTrigger.update());
  }

  const scrollToTarget = (target, immediate = false) => {
    if (lenis) lenis.scrollTo(target, immediate ? { immediate: true } : { duration: 1.2 });
    else {
      const el = typeof target === "string" ? $(target) : null;
      if (el) el.scrollIntoView();
      else window.scrollTo(0, typeof target === "number" ? target : 0);
    }
  };

  const stopScroll = () => lenis && lenis.stop();
  const startScroll = () => lenis && lenis.start();

  /* ============================================================
     TEXT SPLITTING — chars & words inside overflow masks
  ============================================================ */
  const splitChars = (el) => {
    const text = el.textContent;
    el.textContent = "";
    el.setAttribute("aria-label", text);
    const frag = document.createDocumentFragment();
    for (const ch of text) {
      if (ch === " ") { frag.appendChild(document.createTextNode(" ")); continue; }
      const mask = document.createElement("span");
      mask.className = "char-mask";
      mask.setAttribute("aria-hidden", "true");
      const c = document.createElement("span");
      c.className = "char";
      c.textContent = ch;
      mask.appendChild(c);
      frag.appendChild(mask);
    }
    el.appendChild(frag);
    return $$(".char", el);
  };

  const splitWords = (el) => {
    const text = el.textContent;
    el.textContent = "";
    el.setAttribute("aria-label", text);
    const frag = document.createDocumentFragment();
    text.split(" ").forEach((w, i, arr) => {
      const mask = document.createElement("span");
      mask.className = "word-mask";
      mask.setAttribute("aria-hidden", "true");
      const word = document.createElement("span");
      word.className = "word";
      word.textContent = w;
      mask.appendChild(word);
      frag.appendChild(mask);
      if (i < arr.length - 1) frag.appendChild(document.createTextNode(" "));
    });
    el.appendChild(frag);
    return $$(".word", el);
  };

  /* ============================================================
     LOADER → ENTRY SCREEN → HERO ENTRANCE
  ============================================================ */
  const loader = $("#loader");
  const entry = $("#entry");
  const seen = sessionStorage.getItem("novyr-entered");

  // Hero entrance pieces (prepared before any timeline runs)
  let heroEyebrowChars = [], heroTitleWords = [];
  const heroTitle = $("#heroTitle");
  const heroEyebrow = $("#heroEyebrow");

  if (motion) {
    heroEyebrowChars = splitChars(heroEyebrow);
    heroTitleWords = splitWords(heroTitle);
  }

  const glitchWord = (el) => {
    if (!el) return;
    el.classList.add("is-glitch");
    setTimeout(() => el.classList.remove("is-glitch"), 80);
  };

  const heroEntrance = () => {
    if (!motion) return;
    const tl = gsap.timeline();
    tl.to(heroEyebrowChars, { y: 0, duration: 0.75, ease: SIG, stagger: 0.025 })
      .to(heroTitleWords, {
        y: 0, duration: 0.9, ease: SIG, stagger: 0.08,
        onComplete: () => glitchWord(heroTitleWords[heroTitleWords.length - 1])
      }, "-=0.5")
      .to("#heroRule", { width: 80, duration: 0.6, ease: SIG }, "-=0.5")
      .to("#heroSub", { opacity: 1, duration: 0.75 }, "-=0.35")
      .to("#heroCtas", { opacity: 1, y: 0, duration: 0.75 }, "-=0.5")
      .to("#heroImgMask", { clipPath: "inset(0% 0 0 0)", duration: 1.1, ease: SIG }, 0.15)
      .to("#heroImg", { scale: 1, duration: 1.1, ease: SIG }, 0.15);
  };

  const runEntryScreen = () => {
    if (!entry) return;
    const line = $(".entry__line", entry);
    const cta = $(".entry__cta", entry);

    if (motion) {
      gsap.timeline({ delay: 0.1 })
        .to(line, { width: 60, duration: 0.6, ease: SIG })
        .to(cta, { opacity: 1, duration: 0.5 }, "-=0.1");
    } else {
      line.style.width = "60px";
      cta.style.opacity = "1";
    }

    let entered = false;
    const enter = () => {
      if (entered) return;
      entered = true;
      sessionStorage.setItem("novyr-entered", "1");
      if (motion) {
        const tl = gsap.timeline({ onComplete: () => { entry.classList.add("is-done"); startScroll(); } });
        tl.to(".entry__content", { opacity: 0, duration: 0.25 })
          .to(".entry__half--top", { yPercent: -101, duration: 0.5, ease: "power2.inOut" }, 0.1)
          .to(".entry__half--bottom", { yPercent: 101, duration: 0.5, ease: "power2.inOut" }, 0.15);
        heroEntrance(); // overlaps the split
      } else {
        entry.classList.add("is-done");
        startScroll();
      }
    };
    entry.addEventListener("click", enter);
    entry.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") enter(); });
    entry.setAttribute("tabindex", "0");
  };

  const runLoader = () => {
    if (!loader) return;
    if (!motion) { loader.classList.add("is-done"); return; }
    const counter = $("#loaderCounter");
    const logo = $(".loader__logo", loader);
    const wipe = $(".loader__wipe", loader);
    const count = { v: 0 };

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.to(loader, {
          opacity: 0, duration: 0.4, onComplete: () => {
            loader.classList.add("is-done");
            runEntryScreen();
          }
        });
      }
    });
    // white wipe left→right revealing the logotype
    tl.to(wipe, { scaleX: 1, duration: 0.4, ease: "power2.inOut" })
      .set(logo, { clipPath: "inset(0 0% 0 0)" })
      .to(wipe, { scaleX: 0, transformOrigin: "right", duration: 0.4, ease: "power2.inOut" })
      .to(count, {
        v: 100, duration: 0.9, ease: "power1.inOut",
        onUpdate: () => { counter.textContent = String(Math.round(count.v)).padStart(3, "0"); }
      }, 0);
  };

  // Boot sequence
  if (reducedMotion) {
    // CSS already hides loader + entry; nothing to run.
    if (loader) loader.classList.add("is-done");
    if (entry) entry.classList.add("is-done");
  } else if (seen) {
    // Session already entered: skip both, fire hero entrance directly.
    if (loader) loader.classList.add("is-done");
    if (entry) entry.classList.add("is-done");
    heroEntrance();
    if (!motion) revealHeroFallback();
  } else {
    stopScroll(); // lock scroll behind the entry screen
    runLoader();
    if (!motion) { runEntryScreen(); }
  }

  function revealHeroFallback() {
    // no-GSAP path: make hero content visible (CSS handles most of it)
    ["#heroSub", "#heroCtas"].forEach((s) => { const el = $(s); if (el) el.style.opacity = "1"; });
  }
  if (!hasGsap) revealHeroFallback();

  /* ============================================================
     PAGE TRANSITION WIPE (internal anchors)
  ============================================================ */
  const wipeEl = $("#wipe");
  let wiping = false;

  const wipeTo = (hash) => {
    const target = $(hash);
    if (!target) return;
    if (!motion || wiping) {
      scrollToTarget(hash);
      return;
    }
    wiping = true;
    const tl = gsap.timeline({ onComplete: () => { wiping = false; } });
    tl.set(wipeEl, { transformOrigin: "right" })
      .to(wipeEl, { scaleX: 1, duration: 0.5, ease: "power2.inOut" })
      .add(() => scrollToTarget(hash, true))
      .set(wipeEl, { transformOrigin: "left" }, "+=0.05")
      .to(wipeEl, { scaleX: 0, duration: 0.5, ease: "power2.inOut" });
  };

  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-wipe]");
    if (!a) return;
    const hash = a.getAttribute("href");
    if (!hash || !hash.startsWith("#")) return;
    e.preventDefault();
    closeMobileMenu();
    wipeTo(hash);
  });

  /* ============================================================
     NAVBAR — hide/show, theme switch, glitch, active link
  ============================================================ */
  const nav = $("#nav");
  let lastY = 0;

  const onScrollY = (y) => {
    // hide on scroll down / reveal on scroll up
    if (y > lastY && y > 120) nav.classList.add("is-hidden");
    else nav.classList.remove("is-hidden");
    lastY = y;

    // scroll progress bar
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    $("#scrollProgress").style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    // floating buttons + hero scroll hint
    $("#floatWa").classList.toggle("is-visible", y > 400);
    $("#floatTop").classList.toggle("is-visible", y > 800);
    const hint = $("#heroScroll");
    if (hint) hint.classList.toggle("is-hidden", y > 200);
  };

  if (lenis) lenis.on("scroll", ({ scroll }) => onScrollY(scroll));
  else window.addEventListener("scroll", () => onScrollY(window.scrollY), { passive: true });

  // Theme switch: watch each section's bg via IntersectionObserver.
  // The band right under the navbar decides the theme.
  const themedSections = $$("[data-bg]");
  const themeObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) nav.dataset.navTheme = en.target.dataset.bg;
    });
  }, { rootMargin: "-64px 0px -85% 0px", threshold: 0 });
  themedSections.forEach((s) => themeObserver.observe(s));

  // Wordmark glitch on hover (1 frame, 80ms)
  const logo = $(".nav__logo");
  logo.addEventListener("mouseenter", () => {
    logo.classList.add("is-glitch");
    setTimeout(() => logo.classList.remove("is-glitch"), 80);
  });

  // Active link tracking
  const sectionForLink = { "#hero": "hero", "#packs": "packs", "#lookbook": "lookbook", "#reviews": "reviews", "#faq": "faq" };
  const activeObserver = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      $$(".nav__link").forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === `#${en.target.id}`));
    });
  }, { rootMargin: "-40% 0px -50% 0px" });
  Object.values(sectionForLink).forEach((id) => { const s = document.getElementById(id); if (s) activeObserver.observe(s); });

  /* ---------- Mobile menu ---------- */
  const burger = $("#burger");
  const mobileMenu = $("#mobileMenu");
  let menuChars = null;

  function closeMobileMenu() {
    mobileMenu.classList.remove("is-open");
    mobileMenu.setAttribute("aria-hidden", "true");
    burger.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    startScroll();
  }

  burger.addEventListener("click", () => {
    const open = !mobileMenu.classList.contains("is-open");
    if (open) {
      mobileMenu.classList.add("is-open");
      mobileMenu.setAttribute("aria-hidden", "false");
      burger.classList.add("is-open");
      burger.setAttribute("aria-expanded", "true");
      stopScroll();
      if (motion) {
        if (!menuChars) menuChars = $$(".mobile-menu__link").map((l) => splitChars(l));
        menuChars.forEach((chars, i) => {
          gsap.fromTo(chars, { y: "105%" }, { y: 0, duration: 0.7, ease: SIG, stagger: 0.02, delay: 0.15 + i * 0.06 });
        });
      }
    } else {
      closeMobileMenu();
    }
  });

  /* ============================================================
     MARQUEES — infinite, velocity-reactive, skew on speed
  ============================================================ */
  const marquees = $$("[data-marquee]");
  let scrollVelocity = 0;

  // track velocity from Lenis (or fallback delta)
  if (lenis) lenis.on("scroll", ({ velocity }) => { scrollVelocity = velocity; });
  else {
    let prevY = window.scrollY;
    window.addEventListener("scroll", () => { scrollVelocity = (window.scrollY - prevY) * 0.5; prevY = window.scrollY; }, { passive: true });
  }

  marquees.forEach((track) => {
    const dir = parseFloat(track.dataset.direction) || -1;
    const base = parseFloat(track.dataset.baseSpeed) || 1;
    const item = track.children[0];
    if (!item) return;

    // duplicate content until ≥ 2× viewport for a seamless loop
    const clone = () => track.appendChild(item.cloneNode(true));
    let guard = 0;
    while (track.scrollWidth < window.innerWidth * 2 && guard++ < 20) clone();
    clone(); // one extra for safety

    if (reducedMotion) return; // static marquee

    const half = () => track.scrollWidth / 2;
    let pos = 0;
    let paused = false;
    let skew = 0;

    // announce bar pauses on hover
    if (track.closest(".announce")) {
      track.parentElement.addEventListener("mouseenter", () => { paused = true; });
      track.parentElement.addEventListener("mouseleave", () => { paused = false; });
    }

    const useSkew = track.hasAttribute("data-skew");

    const tick = () => {
      if (!paused) {
        const boost = Math.min(Math.abs(scrollVelocity) * 0.12, 6);
        pos += dir * (base + boost);
        const h = half();
        if (pos <= -h) pos += h;
        if (pos > 0) pos -= h;
        let t = `translateX(${pos}px)`;
        if (useSkew) {
          const targetSkew = Math.max(-3, Math.min(3, scrollVelocity * 0.06));
          skew += (targetSkew - skew) * 0.08; // ease back on stop
          t += ` skewX(${skew}deg)`;
        }
        track.style.transform = t;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  // decay velocity so skew eases back when scrolling stops
  setInterval(() => { scrollVelocity *= 0.9; }, 50);

  /* ============================================================
     SCROLL REVEALS — [data-reveal] fade+rise, [data-chars] rise
  ============================================================ */
  if (motion) {
    $$("[data-reveal]").forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 30 }, {
        opacity: 1, y: 0, duration: 0.75,
        scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" }
      });
    });

    $$("[data-chars]").forEach((el) => {
      const chars = splitChars(el);
      gsap.to(chars, {
        y: 0, duration: 0.75, ease: SIG, stagger: 0.025,
        scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" }
      });
    });

    // Hero image parallax — drifts up at 0.6× scroll speed
    gsap.to("#heroImg", {
      yPercent: -12, ease: "none",
      scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true }
    });

    // Pack cards — staggered clip-path reveal
    ScrollTrigger.create({
      trigger: ".packs__grid",
      start: "top 80%",
      once: true,
      onEnter: () => {
        gsap.to("[data-pack-reveal]", {
          clipPath: "inset(0% 0 0 0)", duration: 1, ease: SIG, stagger: 0.06,
          // swap the inline clip for a class so the CSS initial state can't re-hide the cards
          onComplete() {
            $$("[data-pack-reveal]").forEach((c) => {
              c.classList.add("is-revealed");
              c.style.removeProperty("clip-path");
            });
          }
        });
      }
    });

    // Footer watermark parallax (scrub)
    gsap.fromTo("#footerWatermark", { y: 40 }, {
      y: 0, ease: "none",
      scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: true }
    });
  }

  /* ============================================================
     SIZE CHIPS + COLOR SWATCHES
  ============================================================ */
  $$(".pack-card").forEach((card) => {
    $$(".size-chip", card).forEach((chip) => {
      chip.addEventListener("click", () => {
        $$(".size-chip", card).forEach((c) => c.classList.remove("is-selected"));
        chip.classList.add("is-selected");
      });
    });
    $$(".swatch", card).forEach((sw) => {
      sw.addEventListener("click", () => {
        $$(".swatch", card).forEach((s) => s.classList.remove("is-selected"));
        sw.classList.add("is-selected");
      });
    });
  });

  /* ============================================================
     MODALS — size guide + legal (shared machinery)
  ============================================================ */
  const openModal = (modal, overlay) => {
    modal.classList.add("is-open");
    overlay.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    stopScroll();
    const closeBtn = $(".modal__close", modal);
    if (closeBtn) closeBtn.focus();
  };
  const closeModal = (modal, overlay) => {
    modal.classList.remove("is-open");
    overlay.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    startScroll();
  };

  const sizeModal = $("#sizeModal"), sizeOverlay = $("#sizeOverlay");
  $$("[data-size-guide]").forEach((b) => b.addEventListener("click", () => openModal(sizeModal, sizeOverlay)));
  $("[data-close-size]").addEventListener("click", () => closeModal(sizeModal, sizeOverlay));
  sizeOverlay.addEventListener("click", () => closeModal(sizeModal, sizeOverlay));

  const legalModal = $("#legalModal"), legalOverlay = $("#legalOverlay");
  const LEGAL = {
    privacy: { title: "PRIVACY POLICY", body: "We collect only what we need to deliver your order: name, phone, city, address. We never sell or share your data with third parties. Placeholder text — replace with your full privacy policy before launch." },
    refund: { title: "REFUND POLICY", body: "Free size exchange within 7 days if the tee is unworn and unwashed. Refunds are issued for defective items reported within 48h of delivery. Placeholder text — replace with your full refund policy before launch." },
    terms: { title: "TERMS OF SERVICE", body: "By ordering from NOVYR you agree to provide accurate delivery details and to be reachable by phone for order confirmation. All drops are limited and sold on a first-come, first-served basis. Placeholder text — replace with your full terms before launch." },
    shipping: { title: "SHIPPING POLICY", body: "Free delivery across Morocco. 24–48h for Casablanca, Rabat, Marrakech, Fès and Tanger; 2–4 days for other cities. Cash on delivery — pay the courier only after checking your order. Placeholder text — replace before launch." }
  };
  $$("[data-legal]").forEach((b) => b.addEventListener("click", () => {
    const doc = LEGAL[b.dataset.legal];
    $("#legalModalTitle").textContent = doc.title;
    $("#legalModalBody").innerHTML = `<p>${doc.body}</p>`;
    openModal(legalModal, legalOverlay);
  }));
  $("[data-close-legal]").addEventListener("click", () => closeModal(legalModal, legalOverlay));
  legalOverlay.addEventListener("click", () => closeModal(legalModal, legalOverlay));

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (sizeModal.classList.contains("is-open")) closeModal(sizeModal, sizeOverlay);
    if (legalModal.classList.contains("is-open")) closeModal(legalModal, legalOverlay);
    if (cartEl.classList.contains("is-open")) closeCart();
    if (mobileMenu.classList.contains("is-open")) closeMobileMenu();
  });

  /* ============================================================
     LOOKBOOK CAROUSEL — drag + inertia + rubber-band + arrows
  ============================================================ */
  const carousel = $("#lookCarousel");
  (() => {
    let isDown = false, startX = 0, startScrollLeft = 0, vel = 0, lastX = 0, rafId = null;

    const maxScroll = () => carousel.scrollWidth - carousel.clientWidth;

    const momentum = () => {
      if (Math.abs(vel) < 0.3) return;
      carousel.scrollLeft -= vel;
      vel *= 0.94;
      // rubber-band at edges
      if (carousel.scrollLeft <= 0 || carousel.scrollLeft >= maxScroll()) vel *= 0.6;
      rafId = requestAnimationFrame(momentum);
    };

    carousel.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") return; // native touch scroll handles it
      isDown = true;
      carousel.classList.add("is-dragging");
      startX = lastX = e.clientX;
      startScrollLeft = carousel.scrollLeft;
      cancelAnimationFrame(rafId);
      carousel.setPointerCapture(e.pointerId);
    });
    carousel.addEventListener("pointermove", (e) => {
      if (!isDown) return;
      vel = e.clientX - lastX;
      lastX = e.clientX;
      let next = startScrollLeft - (e.clientX - startX);
      // rubber-band resistance beyond edges
      if (next < 0) next *= 0.35;
      if (next > maxScroll()) next = maxScroll() + (next - maxScroll()) * 0.35;
      carousel.scrollLeft = next;
    });
    const release = () => {
      if (!isDown) return;
      isDown = false;
      carousel.classList.remove("is-dragging");
      rafId = requestAnimationFrame(momentum);
    };
    carousel.addEventListener("pointerup", release);
    carousel.addEventListener("pointercancel", release);

    const step = () => {
      const slide = $(".lookbook__slide", carousel);
      return slide ? slide.offsetWidth + 24 : 320;
    };
    $("#lookPrev").addEventListener("click", () => carousel.scrollBy({ left: -step(), behavior: reducedMotion ? "auto" : "smooth" }));
    $("#lookNext").addEventListener("click", () => carousel.scrollBy({ left: step(), behavior: reducedMotion ? "auto" : "smooth" }));
    carousel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") carousel.scrollBy({ left: -step(), behavior: "smooth" });
      if (e.key === "ArrowRight") carousel.scrollBy({ left: step(), behavior: "smooth" });
    });
  })();

  /* ============================================================
     STATS COUNT-UP (once, on scroll into view)
  ============================================================ */
  const statEls = $$("[data-countup]");
  const runCountups = () => {
    statEls.forEach((el) => {
      const target = parseFloat(el.dataset.target);
      const decimals = parseInt(el.dataset.decimals || "0", 10);
      const prefix = el.dataset.prefix || "";
      const suffix = el.dataset.suffix || "";
      const fmt = (v) => prefix + (decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString("en-US")) + suffix;
      if (!motion) { el.textContent = fmt(target); return; }
      const obj = { v: 0 };
      gsap.to(obj, { v: target, duration: 1.6, ease: "power2.out", onUpdate: () => { el.textContent = fmt(obj.v); } });
    });
  };
  if (motion) {
    ScrollTrigger.create({ trigger: "#lookStats", start: "top 85%", once: true, onEnter: runCountups });
  } else {
    runCountups();
  }

  /* ============================================================
     REVIEWS SLIDER — auto-advance 6s, arrows, swipe, progress
  ============================================================ */
  (() => {
    const slides = $$("[data-review]");
    const progress = $("#revProgress");
    let index = 0, timer = null, progressTween = null;

    const startProgress = () => {
      if (reducedMotion) return;
      if (motion) {
        if (progressTween) progressTween.kill();
        gsap.set(progress, { scaleX: 0 });
        progressTween = gsap.to(progress, { scaleX: 1, duration: 6, ease: "none" });
      }
    };

    const goTo = (next, dir = 1) => {
      if (next === index) return;
      const current = slides[index];
      const target = slides[next];
      index = next;

      if (motion && !document.hidden) {
        // hard reset any in-flight transition so slides can never stack up
        gsap.killTweensOf(slides);
        slides.forEach((s) => { if (s !== target) { s.classList.remove("is-active"); gsap.set(s, { clearProps: "all" }); } });
        gsap.fromTo(current, { x: 0, opacity: 1 }, {
          x: -40 * dir, opacity: 0, duration: 0.5, ease: SIG,
          onComplete: () => gsap.set(current, { clearProps: "all" })
        });
        target.classList.add("is-active");
        gsap.fromTo(target, { x: 40 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: SIG });
      } else {
        slides.forEach((s) => s.classList.remove("is-active"));
        target.classList.add("is-active");
      }
      startProgress();
    };

    const next = () => goTo((index + 1) % slides.length, 1);
    const prev = () => goTo((index - 1 + slides.length) % slides.length, -1);

    const restartTimer = () => {
      clearInterval(timer);
      if (!reducedMotion) timer = setInterval(next, 6000);
    };

    $("#revNext").addEventListener("click", () => { next(); restartTimer(); });
    $("#revPrev").addEventListener("click", () => { prev(); restartTimer(); });

    // drag / swipe
    const vp = $("#reviewsViewport");
    let downX = null;
    vp.addEventListener("pointerdown", (e) => { downX = e.clientX; });
    vp.addEventListener("pointerup", (e) => {
      if (downX === null) return;
      const dx = e.clientX - downX;
      if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); restartTimer(); }
      downX = null;
    });

    // pause auto-advance while the tab is hidden (rAF is suspended there)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clearInterval(timer);
      else restartTimer();
    });

    startProgress();
    restartTimer();
  })();

  /* ============================================================
     FAQ ACCORDION — one open at a time, GSAP height
  ============================================================ */
  $$(".faq__item").forEach((item) => {
    const q = $(".faq__q", item);
    const a = $(".faq__a", item);

    q.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");

      // close all others
      $$(".faq__item.is-open").forEach((other) => {
        if (other === item) return;
        other.classList.remove("is-open");
        $(".faq__q", other).setAttribute("aria-expanded", "false");
        const oa = $(".faq__a", other);
        if (motion) gsap.to(oa, { height: 0, duration: 0.4, ease: SIG });
        else oa.style.height = "0px";
      });

      item.classList.toggle("is-open", !isOpen);
      q.setAttribute("aria-expanded", String(!isOpen));
      if (motion) {
        gsap.to(a, { height: isOpen ? 0 : "auto", duration: 0.45, ease: SIG });
      } else {
        a.style.height = isOpen ? "0px" : "auto";
      }
    });
  });

  /* ============================================================
     CART — state, drawer, fly-to-cart, checkout, WhatsApp
  ============================================================ */
  const cartEl = $("#cart");
  const cartOverlay = $("#cartOverlay");
  const cartItemsEl = $("#cartItems");
  const cartEmptyEl = $("#cartEmpty");
  const cartCountEl = $("#cartCount");
  const cartTotalEl = $("#cartTotal");
  const itemsView = $("#cartItemsView");
  const checkoutView = $("#cartCheckoutView");

  let cart = []; // { name, price, size, color, qty, img }

  const cartQty = () => cart.reduce((n, it) => n + it.qty, 0);
  const cartTotal = () => cart.reduce((n, it) => n + it.qty * it.price, 0);

  const renderCart = () => {
    cartCountEl.textContent = String(cartQty());
    cartTotalEl.textContent = String(cartTotal());
    cartEmptyEl.style.display = cart.length ? "none" : "block";
    $$(".cart-item", cartItemsEl).forEach((n) => n.remove());

    cart.forEach((it, i) => {
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <img class="cart-item__img" src="${it.img}" alt="">
        <div class="cart-item__info">
          <div class="cart-item__name">${it.name}</div>
          <div class="cart-item__variant">${it.size} · ${it.color}</div>
        </div>
        <div class="cart-item__qty">
          <button data-dec="${i}" aria-label="Decrease quantity">−</button>
          <span>${it.qty}</span>
          <button data-inc="${i}" aria-label="Increase quantity">+</button>
        </div>
        <span class="cart-item__price">${it.qty * it.price} MAD</span>`;
      cartItemsEl.appendChild(row);
    });
  };

  cartItemsEl.addEventListener("click", (e) => {
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    if (inc) { cart[+inc.dataset.inc].qty++; renderCart(); }
    if (dec) {
      const i = +dec.dataset.dec;
      cart[i].qty--;
      if (cart[i].qty <= 0) cart.splice(i, 1);
      renderCart();
    }
  });

  const showItemsView = () => {
    itemsView.classList.add("is-active");
    checkoutView.classList.remove("is-active");
  };
  const openCart = () => {
    showItemsView();
    cartEl.classList.add("is-open");
    cartOverlay.classList.add("is-open");
    cartEl.setAttribute("aria-hidden", "false");
    stopScroll();
  };
  const closeCart = () => {
    cartEl.classList.remove("is-open");
    cartOverlay.classList.remove("is-open");
    cartEl.setAttribute("aria-hidden", "true");
    $("#orderSuccess").classList.remove("is-open");
    startScroll();
  };

  $("#cartToggle").addEventListener("click", openCart);
  $("#cartClose").addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", closeCart);

  $("#cartProceed").addEventListener("click", () => {
    if (!cart.length) return;
    itemsView.classList.remove("is-active");
    checkoutView.classList.add("is-active");
  });

  /* ---- Add to cart (+ fly thumbnail, shake, count bounce) ---- */
  $$("[data-add-to-cart]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".pack-card");
      const size = $(".size-chip.is-selected", card)?.dataset.size || "M";
      const color = $(".swatch.is-selected", card)?.dataset.color || "Black";
      const name = card.dataset.name;
      const price = parseInt(card.dataset.price, 10);
      const img = $(".pack-card__img", card).src;

      const existing = cart.find((it) => it.name === name && it.size === size && it.color === color);
      if (existing) existing.qty++;
      else cart.push({ name, price, size, color, qty: 1, img });
      renderCart();

      // cart icon shake + counter bounce
      const cartBtn = $("#cartToggle");
      cartBtn.classList.remove("is-shaking");
      void cartBtn.offsetWidth; // restart animation
      cartBtn.classList.add("is-shaking");
      cartCountEl.classList.remove("is-bumping");
      void cartCountEl.offsetWidth;
      cartCountEl.classList.add("is-bumping");

      // fly-to-cart thumbnail with arc motion
      if (motion) {
        const from = $(".pack-card__media", card).getBoundingClientRect();
        const to = cartBtn.getBoundingClientRect();
        const thumb = document.createElement("img");
        thumb.src = img;
        thumb.className = "fly-thumb";
        thumb.style.left = `${from.left + from.width / 2 - 24}px`;
        thumb.style.top = `${from.top + from.height / 2 - 24}px`;
        document.body.appendChild(thumb);
        const dx = to.left + to.width / 2 - (from.left + from.width / 2);
        const dy = to.top + to.height / 2 - (from.top + from.height / 2);
        // arc: x linear, y with a lift (power curves differ per axis)
        gsap.to(thumb, { x: dx, duration: 0.5, ease: "power1.inOut" });
        gsap.to(thumb, { y: dy - 120, duration: 0.25, ease: "power2.out" });
        gsap.to(thumb, {
          y: dy, duration: 0.25, delay: 0.25, ease: "power2.in",
          onComplete: () => thumb.remove()
        });
        gsap.to(thumb, { scale: 0.2, opacity: 0.6, duration: 0.5, ease: "power1.in" });
      }
    });
  });

  /* ---- WhatsApp prefilled message ---- */
  const waMessage = () => {
    if (!cart.length) return "Hi NOVYR, I want to order from Drop 01.";
    const lines = cart.map((it) => `• ${it.name} — Size ${it.size}, ${it.color} × ${it.qty} = ${it.qty * it.price} MAD`);
    return `Hi NOVYR, I want to order:\n${lines.join("\n")}\nTOTAL: ${cartTotal()} MAD\nCash on delivery.`;
  };
  const updateWaLinks = () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage())}`;
    $("#cartWhatsApp").href = url;
    $("#checkoutWhatsApp").href = url;
  };
  ["#cartWhatsApp", "#checkoutWhatsApp"].forEach((sel) => {
    $(sel).addEventListener("click", updateWaLinks);
    $(sel).addEventListener("mouseenter", updateWaLinks);
    $(sel).addEventListener("focus", updateWaLinks);
  });

  /* ---- Checkout validation + submit ---- */
  const checkoutForm = $("#checkoutForm");
  const phoneOk = (v) => /^0[67]\d{8}$/.test(v.replace(/[\s-]/g, ""));

  checkoutForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fields = {
      coName: (v) => v.trim().length >= 3,
      coPhone: phoneOk,
      coCity: (v) => !!v,
      coAddress: (v) => v.trim().length >= 5
    };
    let valid = true;
    for (const [id, test] of Object.entries(fields)) {
      const input = $("#" + id);
      const ok = test(input.value);
      input.closest(".checkout__field").classList.toggle("has-error", !ok);
      if (!ok) valid = false;
    }
    if (!valid) return;

    const order = {
      customer: {
        fullName: $("#coName").value.trim(),
        phone: $("#coPhone").value.trim(),
        city: $("#coCity").value,
        address: $("#coAddress").value.trim()
      },
      items: cart.map(({ name, size, color, qty, price }) => ({ name, size, color, qty, price })),
      total: cartTotal(),
      currency: "MAD",
      payment: "cash-on-delivery",
      createdAt: new Date().toISOString()
    };

    // Front-end only: log + fire-and-forget POST to placeholder endpoint.
    console.log("NOVYR ORDER:", order);
    fetch(ORDER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order)
    }).catch(() => { /* placeholder endpoint — expected to fail locally */ });

    // success overlay with animated checkmark
    $("#orderSuccess").classList.add("is-open");
    $("#orderSuccess").setAttribute("aria-hidden", "false");
    cart = [];
    renderCart();
    checkoutForm.reset();
    setTimeout(() => { closeCart(); }, 3200);
  });

  /* ============================================================
     NEWSLETTER
  ============================================================ */
  $("#newsletterForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("#newsletterEmail");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      email.focus();
      return;
    }
    console.log("NOVYR NEWSLETTER SIGNUP:", email.value);
    $("#newsletterSuccess").classList.add("is-visible");
    email.value = "";
  });

  /* ============================================================
     FLOATING — back to top
  ============================================================ */
  $("#floatTop").addEventListener("click", () => scrollToTarget(0));

  /* ============================================================
     CUSTOM CURSOR (desktop only) + magnetic buttons
  ============================================================ */
  if (!isTouch && !reducedMotion) {
    document.body.classList.add("has-cursor");
    const dot = $("#cursorDot");
    const ring = $("#cursorRing");
    const label = $("#cursorLabel");
    let mx = innerWidth / 2, my = innerHeight / 2;
    let dx = mx, dy = my, rx = mx, ry = my;

    // position immediately so the cursor never flashes at the viewport origin
    dot.style.transform = ring.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;

    window.addEventListener("mousemove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });

    const cursorTick = () => {
      dx += (mx - dx) * 0.15;
      dy += (my - dy) * 0.15;
      rx += (mx - rx) * 0.06;
      ry += (my - ry) * 0.06;
      dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(cursorTick);
    };
    requestAnimationFrame(cursorTick);

    // hover states via event delegation
    document.addEventListener("mouseover", (e) => {
      const viewTarget = e.target.closest('[data-cursor="view"]');
      const dragTarget = e.target.closest('[data-cursor="drag"]');
      const linkTarget = e.target.closest("a, button");
      ring.classList.remove("is-hover", "is-label");
      label.textContent = "";
      if (viewTarget) { ring.classList.add("is-label"); label.textContent = "VIEW"; }
      else if (dragTarget) { ring.classList.add("is-label"); label.textContent = "DRAG"; }
      else if (linkTarget) { ring.classList.add("is-hover"); }
    });
  }

  /* ---- Magnetic buttons (±6px, elastic release) ---- */
  if (!isTouch && motion) {
    $$("[data-magnetic]").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * 12;  // ±6px
        const y = ((e.clientY - r.top) / r.height - 0.5) * 12;
        gsap.to(btn, { x, y, duration: 0.3, ease: "power2.out" });
      });
      btn.addEventListener("mouseleave", () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)" });
      });
    });
  }

  /* ============================================================
     INITIAL SCROLL POSITION — start at top on refresh
  ============================================================ */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

})();
