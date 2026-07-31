/* MultyComm — site interactions. No dependencies, no build step. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var smooth  = 'scrollBehavior' in document.documentElement.style;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- sticky header + scroll progress ---------- */
  var head = $('.site-head');
  var rail = $('.scroll-rail i');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (head) head.classList.toggle('is-stuck', y > 8);
    if (rail) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      rail.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- products journey rail ---------- */
  var productLinks = $$('.product-rail a[href^="#"]');
  if (productLinks.length && 'IntersectionObserver' in window) {
    var productMap = {};
    productLinks.forEach(function (link) {
      var target = $(link.getAttribute('href'));
      if (target) productMap[target.id] = link;
    });
    var productSpy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || !productMap[entry.target.id]) return;
        productLinks.forEach(function (link) { link.removeAttribute('aria-current'); });
        var active = productMap[entry.target.id];
        active.setAttribute('aria-current', 'true');
        if (window.innerWidth < 900) {
          active.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
        }
      });
    }, { rootMargin: '-28% 0px -58% 0px', threshold: 0 });
    Object.keys(productMap).forEach(function (id) { productSpy.observe($('#' + id)); });
  }

  /* ---------- mobile drawer ---------- */
  var burger = $('.burger');
  var drawer = $('.drawer');

  function setDrawer(open) {
    if (!drawer || !burger) return;
    drawer.setAttribute('data-open', open ? 'true' : 'false');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) { var f = $('.drawer__close', drawer); if (f) f.focus(); }
  }
  if (burger) burger.addEventListener('click', function () {
    setDrawer(drawer.getAttribute('data-open') !== 'true');
  });
  if (drawer) {
    drawer.addEventListener('click', function (e) {
      if (e.target === drawer || e.target.closest('.drawer__close') || e.target.closest('a')) setDrawer(false);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer && drawer.getAttribute('data-open') === 'true') {
      setDrawer(false);
      burger.focus();
    }
  });

  /* ---------- reveal on scroll ---------- */
  var targets = $$('[data-reveal]');
  if (!('IntersectionObserver' in window) || reduced) {
    targets.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    targets.forEach(function (el) {
      // stagger siblings inside the same grid for a cascade rather than a slab
      var group = el.parentElement;
      if (group && !group.dataset.staggered) {
        group.dataset.staggered = '1';
        $$('[data-reveal]', group).forEach(function (kid, i) {
          if (kid.parentElement === group && !kid.style.getPropertyValue('--d')) {
            kid.style.setProperty('--d', Math.min(i, 6) * 70 + 'ms');
          }
        });
      }
      io.observe(el);
    });
  }

  /* ---------- count-up numbers ---------- */
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function countUp(el) {
    var target = parseFloat(el.dataset.count);
    var decimals = (el.dataset.count.split('.')[1] || '').length;
    var suffix = el.dataset.suffix || '';
    var prefix = el.dataset.prefix || '';
    var dur = 1500;
    var t0 = null;

    function frame(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var v = target * easeOut(p);
      el.textContent = prefix + v.toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = prefix + target.toFixed(decimals) + suffix;
    }
    requestAnimationFrame(frame);
  }

  var counters = $$('[data-count]');
  if (counters.length) {
    if (reduced || !('IntersectionObserver' in window)) {
      counters.forEach(function (el) {
        el.textContent = (el.dataset.prefix || '') + el.dataset.count + (el.dataset.suffix || '');
      });
    } else {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          countUp(en.target);
          cio.unobserve(en.target);
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { el.textContent = (el.dataset.prefix || '') + '0' + (el.dataset.suffix || ''); cio.observe(el); });
    }
  }

  /* ---------- collapsible spec panels ---------- */
  $$('.panel__head').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  });

  /* ---------- pricing "show all features" ---------- */
  $$('.tier__more').forEach(function (btn) {
    var tier = btn.closest('.tier');
    var hidden = $$('li[data-extra]', tier).length;
    if (!hidden) { btn.remove(); return; }
    btn.textContent = 'Show all ' + ($$('li', tier).length) + ' features';
    btn.addEventListener('click', function () {
      var open = tier.classList.toggle('is-open');
      btn.textContent = open ? 'Show fewer features' : 'Show all ' + ($$('li', tier).length) + ' features';
    });
  });

  /* ---------- hero console: rotate the active thread ---------- */
  var threads = $$('.console .thread');
  if (threads.length > 1 && !reduced) {
    var idx = threads.findIndex(function (t) { return t.classList.contains('is-active'); });
    if (idx < 0) idx = 0;
    setInterval(function () {
      threads[idx].classList.remove('is-active');
      idx = (idx + 1) % threads.length;
      threads[idx].classList.add('is-active');
    }, 2600);
  }

  /* ---------- screenshot carousel ----------
     The track is a scroll-snap row, so swipe and native scrolling already work.
     This adds arrows, dots, the caption/counter sync and a gentle autoplay. */
  $$('[data-shots]').forEach(function (root) {
    var track = $('[data-shots-track]', root);
    if (!track) return;
    var slides = $$('.shot', track);
    if (slides.length < 2) return;

    var dotsWrap = $('[data-shots-dots]', root);
    var capT  = $('[data-shots-title]', root);
    var capN  = $('[data-shots-note]', root);
    var idxEl = $('[data-shots-index]', root);
    var totEl = $('[data-shots-total]', root);
    var delay = parseInt(root.dataset.shots, 10) || 6500;
    var timer = null;
    var i = 0;

    root.style.setProperty('--shot-dur', delay + 'ms');
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    if (totEl) totEl.textContent = pad(slides.length);

    var dots = slides.map(function (slide, n) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'shots__dot';
      b.setAttribute('aria-label', 'Screen ' + (n + 1) + ' of ' + slides.length + ': ' + (slide.dataset.title || ''));
      b.addEventListener('click', function () { go(n); restart(); });
      if (dotsWrap) dotsWrap.appendChild(b);
      return b;
    });

    function paint(n) {
      i = n;
      dots.forEach(function (d, k) {
        d.classList.toggle('is-on', k === n);
        if (k === n) d.setAttribute('aria-current', 'true');
        else d.removeAttribute('aria-current');
      });
      var s = slides[n];
      if (capT) capT.textContent = s.dataset.title || '';
      if (capN) capN.textContent = s.dataset.note || '';
      if (idxEl) idxEl.textContent = pad(n + 1);
    }

    // while a programmatic scroll is in flight the intermediate scroll events
    // are ours, not the reader's — ignore them so the caption doesn't flicker
    // through every slide it passes on the way to the one that was asked for
    var lock = false;
    var lockT = null;

    function go(n) {
      n = ((n % slides.length) + slides.length) % slides.length;
      var x = slides[n].offsetLeft - slides[0].offsetLeft;
      lock = true;
      clearTimeout(lockT);
      lockT = setTimeout(function () { lock = false; }, 900);
      if (smooth && !reduced) track.scrollTo({ left: x, behavior: 'smooth' });
      else track.scrollLeft = x;
      paint(n);
    }

    function play() {
      if (reduced || timer) return;
      root.setAttribute('data-playing', 'true');
      timer = setInterval(function () { go(i + 1); }, delay);
    }
    function pause() {
      clearInterval(timer);
      timer = null;
      root.setAttribute('data-playing', 'false');
    }
    // restart so the dot's fill animation lines up with the new interval
    function restart() { if (timer) { pause(); play(); } }

    $$('[data-shots-prev]', root).forEach(function (b) {
      b.addEventListener('click', function () { go(i - 1); restart(); });
    });
    $$('[data-shots-next]', root).forEach(function (b) {
      b.addEventListener('click', function () { go(i + 1); restart(); });
    });

    track.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      go(i + (e.key === 'ArrowRight' ? 1 : -1));
      restart();
    });

    // follow a swipe or a trackpad scroll back into the caption and dots
    var scrolling = false;
    track.addEventListener('scroll', function () {
      if (scrolling) return;
      scrolling = true;
      requestAnimationFrame(function () {
        scrolling = false;
        var n = Math.round(track.scrollLeft / track.clientWidth);
        if (lock) { if (n === i) { lock = false; clearTimeout(lockT); } return; }
        if (n !== i && slides[n]) paint(n);
      });
    }, { passive: true });

    root.addEventListener('pointerenter', pause);
    root.addEventListener('pointerleave', play);
    root.addEventListener('focusin', pause);
    root.addEventListener('focusout', function (e) {
      if (!root.contains(e.relatedTarget)) play();
    });

    paint(0);

    if ('IntersectionObserver' in window) {
      var loaded = false;
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) { pause(); return; }
          // off-screen slides never intersect the viewport horizontally, so
          // promote them once the carousel itself is in view
          if (!loaded) {
            loaded = true;
            $$('img[loading="lazy"]', track).forEach(function (img) { img.loading = 'eager'; });
          }
          play();
        });
      }, { threshold: 0.35 }).observe(root);
    } else {
      play();
    }
  });

  /* ---------- marquee: duplicate the track so the loop is seamless ---------- */
  $$('.marquee__track').forEach(function (track) {
    track.innerHTML += track.innerHTML;
  });

  /* ---------- forms: validate locally, then explain there is no backend ---------- */
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  function markBad(field, bad) {
    if (field) field.classList.toggle('is-bad', bad);
    return !bad;
  }

  $$('form[data-validate]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;

      $$('[required]', form).forEach(function (input) {
        var field = input.closest('.field');
        var val = (input.value || '').trim();
        var bad = !val || (input.type === 'email' && !emailOk(val));
        if (!markBad(field, bad)) ok = false;
      });

      if (!ok) {
        var first = $('.field.is-bad input, .field.is-bad textarea, .field.is-bad select', form);
        if (first) first.focus();
        return;
      }
      form.classList.add('is-sent');
      var btn = $('button[type="submit"]', form);
      if (btn) { btn.disabled = true; btn.textContent = 'Message captured'; }
      var ok2 = $('.form__ok', form);
      if (ok2) ok2.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    });

    $$('input, textarea, select', form).forEach(function (input) {
      input.addEventListener('input', function () {
        var field = input.closest('.field');
        if (field && field.classList.contains('is-bad')) {
          var val = (input.value || '').trim();
          if (val && (input.type !== 'email' || emailOk(val))) field.classList.remove('is-bad');
        }
      });
    });
  });

  /* ---------- newsletter strip ---------- */
  $$('.sub').forEach(function (sub) {
    var input = $('input', sub);
    var msg = sub.parentElement.querySelector('.sub__msg');
    sub.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!msg) return;
      var v = (input.value || '').trim();
      if (!emailOk(v)) {
        msg.style.color = '#FFA5A5';
        msg.textContent = 'Enter a valid email address.';
        input.focus();
        return;
      }
      msg.style.color = '#6BE3B4';
      msg.textContent = 'Thanks — ' + v + ' is on the list.';
      input.value = '';
    });
  });

  /* ---------- year stamp ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ==========================================================================
     chat widget
     Stands in for the Wix Chat iframe the live site embeds. Same anatomy —
     launcher, greeting, quick replies, lead form, WhatsApp hand-off — but it
     talks to nobody: replies are canned and the form is never transmitted.
     ========================================================================== */
  var chat = $('#chat');
  if (chat) {
    var panel   = $('.chat__panel', chat);
    var launch  = $('.chat__launch', chat);
    var closeEl = $('.chat__close', chat);
    var body    = $('#chat-body');
    var chips   = $('#chat-chips');
    var lead    = $('#chat-lead');
    var badge   = $('#chat-badge');

    var stamp = $('[data-now]', chat);
    if (stamp) {
      stamp.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    var REPLIES = {
      pricing:  'There are six bundles — Cloud PBX Connect, Outbound Voice Dialer, Unified Dual Voice CX, Social Media Connect, Web Video Connect and AI Connect. They’re quoted per deployment, since seat count and channel mix change the number. The pricing page lists what’s in each one.',
      whatsapp: 'Bulk WhatsApp runs through the campaign manager with the WhatsApp Business API, a template creator and scheduled broadcasts — and no markup on standard WhatsApp pricing. You can use your own account.',
      carrier:  'The carrier platform is multi-tenant and geo-redundant, with an in-built SBC, prepaid billing BSS, integrated SMS-C, SS7 / ISDN-PRI / analog interworking and white-labelling. 99.999% availability.',
      support:  'Support runs 24×7 across Tier 1–3 from two international locations, by email, chat, phone or the collaboration platform. Anything major still open after 120 minutes goes to the TAC3 team.'
    };
    var LINKS = {
      pricing: 'pricing.html', whatsapp: 'products.html',
      carrier: 'products.html', support: 'services.html'
    };

    // keep new nodes above the lead form while it exists; append once it's gone.
    // keepScroll leaves the viewport where it is, for trailing bits like the
    // follow-up CTA that shouldn't yank the reply off screen.
    function place(el, keepScroll) {
      if (lead && lead.isConnected) body.insertBefore(el, lead);
      else body.appendChild(el);
      if (!keepScroll) {
        // land on the new message, not the bottom of the panel — a long reply
        // would otherwise scroll straight past to the lead form below it
        body.scrollTop = Math.max(0, el.offsetTop - body.offsetTop - 12);
      }
      return el;
    }

    function addMsg(text, mine) {
      var el = document.createElement('div');
      el.className = 'msg' + (mine ? ' msg--me' : '');
      if (!mine) {
        el.innerHTML = '<span class="chat__avatar"><img src="assets/img/logo.svg" alt="" width="17" height="17"></span>';
      }
      var p = document.createElement('p');
      p.textContent = text;
      el.appendChild(p);
      return place(el);
    }

    function addTyping() {
      var el = document.createElement('div');
      el.className = 'msg msg--typing';
      el.innerHTML = '<span class="chat__avatar"><img src="assets/img/logo.svg" alt="" width="17" height="17"></span>' +
                     '<p><i></i><i></i><i></i></p>';
      return place(el);
    }

    function setOpen(open) {
      chat.setAttribute('data-open', open ? 'true' : 'false');
      launch.setAttribute('aria-expanded', open ? 'true' : 'false');
      panel.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (open) {
        if (badge) badge.hidden = true;
        try { sessionStorage.setItem('mc-chat-seen', '1'); } catch (e) {}
        // open on the greeting, not scrolled past it
        setTimeout(function () { closeEl.focus(); body.scrollTop = 0; }, 60);
      } else {
        launch.focus();
      }
    }

    launch.addEventListener('click', function () { setOpen(true); });
    closeEl.addEventListener('click', function () { setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && chat.getAttribute('data-open') === 'true') setOpen(false);
    });

    // nudge badge on the first visit of a session
    try {
      if (!sessionStorage.getItem('mc-chat-seen') && badge) {
        setTimeout(function () { badge.hidden = false; }, 6000);
      }
    } catch (e) {}

    if (chips) {
      chips.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-topic]');
        if (!btn) return;
        var topic = btn.dataset.topic;
        addMsg(btn.textContent.trim(), true);
        chips.remove();
        var typing = addTyping();
        setTimeout(function () {
          typing.remove();
          addMsg(REPLIES[topic], false);
          var more = document.createElement('div');
          more.className = 'chat__chips';
          more.innerHTML = '<a class="btn btn--primary btn--sm" href="' + LINKS[topic] + '">Open the page</a>';
          place(more, true);
        }, reduced ? 60 : 1100);
      });
    }

    if (lead) {
      lead.addEventListener('submit', function (e) {
        e.preventDefault();
        var ok = true;
        $$('[required]', lead).forEach(function (input) {
          var field = input.closest('.field');
          var val = (input.value || '').trim();
          var bad = !val || (input.type === 'email' && !emailOk(val));
          if (field) field.classList.toggle('is-bad', bad);
          if (bad) ok = false;
        });
        if (!ok) { var f = $('.field.is-bad input, .field.is-bad textarea', lead); if (f) f.focus(); return; }

        var name = ($('#chat-name').value || '').trim();
        addMsg(($('#chat-msg').value || '').trim(), true);
        lead.remove();
        var typing = addTyping();
        setTimeout(function () {
          typing.remove();
          addMsg('Thanks ' + name + ' — noted. This rebuild has no server, so nothing was actually sent; ' +
                 'email info@multycomm.com and the team will pick it up.', false);
        }, reduced ? 60 : 1100);
      });

      $$('input, textarea', lead).forEach(function (input) {
        input.addEventListener('input', function () {
          var field = input.closest('.field');
          if (field && field.classList.contains('is-bad')) {
            var val = (input.value || '').trim();
            if (val && (input.type !== 'email' || emailOk(val))) field.classList.remove('is-bad');
          }
        });
      });
    }
  }
})();
