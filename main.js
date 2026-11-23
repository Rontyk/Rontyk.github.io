// Живые превью демо: уменьшаем сайт шириной 1280px до размера окошка
(function () {
  function fit() {
    document.querySelectorAll('.frame').forEach(function (f) {
      var ifr = f.querySelector('iframe');
      if (ifr) ifr.style.transform = 'scale(' + f.clientWidth / 1280 + ')';
    });
  }
  fit();
  window.addEventListener('resize', fit);
})();

// Часы в шапке и год в подвале
(function () {
  var clock = document.getElementById('clock');
  function tick() {
    try {
      clock.textContent = new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty'
      }).format(new Date());
    } catch (e) { clock.textContent = ''; }
  }
  tick();
  setInterval(tick, 30000);
  document.getElementById('yr').textContent = new Date().getFullYear();
})();

(function () {
  if (!window.gsap || !window.ScrollTrigger) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);
  // На айфоне адресная строка прячется и меняет высоту окна во время скролла.
  // Без этого ScrollTrigger пересчитывал позиции посреди прокрутки, и блоки съезжали
  ScrollTrigger.config({ ignoreMobileResize: true });

  var rand = gsap.utils.random;
  var vw = function () { return window.innerWidth; };
  var vh = function () { return window.innerHeight; };

  // Делим строки заголовка на буквы, наклейки внутри строки не трогаем
  document.querySelectorAll('.shatter .line').forEach(function (line) {
    Array.from(line.childNodes).forEach(function (node) {
      if (node.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      node.textContent.split(' ').forEach(function (word, wi) {
        // между словами обычный пробел: на телефоне строка переносится по словам, а не посреди слова
        if (wi > 0) frag.appendChild(document.createTextNode(' '));
        if (!word) return;
        var w = document.createElement('span');
        w.className = 'word';
        word.split('').forEach(function (c) {
          var s = document.createElement('span');
          s.className = 'ch';
          s.setAttribute('aria-hidden', 'true');
          s.textContent = c;
          w.appendChild(s);
        });
        frag.appendChild(w);
      });
      line.replaceChild(frag, node);
    });
  });

  // 1. Заголовок разлетается при скролле вниз и собирается обратно при скролле вверх
  var hero = gsap.timeline({
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom bottom',   // .hero-stage закреплен через CSS sticky
      scrub: 0.7,
      invalidateOnRefresh: true
    }
  });
  hero
    .to('.shatter .ch', {
      x: function () { return rand(-0.7, 0.7) * vw(); },
      y: function () { return rand(-0.9, 0.9) * vh(); },
      rotation: function () { return rand(-220, 220); },
      scale: function () { return rand(0.2, 1.8); },
      opacity: 0,
      ease: 'power2.in',
      stagger: { each: 0.006, from: 'random' }
    }, 0)
    .to('.s1', { x: () => -0.4 * vw(), y: () => -0.6 * vh(), rotation: -120, ease: 'power2.in' }, 0)
    .to('.s2', { x: () => 0.3 * vw(), y: () => -0.5 * vh(), rotation: 260, scale: 2, ease: 'power2.in' }, 0.05)
    .to('.s3', { x: () => 0.4 * vw(), y: () => 0.5 * vh(), rotation: 90, ease: 'power2.in' }, 0.05)
    .to('.hero-tag, .scroll-hint', { opacity: 0, y: -30, duration: 0.3 }, 0)
    .fromTo('.hero-after', { opacity: 0, scale: 0.6, rotation: -6 }, { opacity: 1, scale: 1, rotation: 0, ease: 'back.out(1.6)', duration: 0.6 }, 0.55);

  // Наклейки чуть следуют за мышкой
  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('mousemove', function (e) {
      var dx = e.clientX / vw() - 0.5;
      var dy = e.clientY / vh() - 0.5;
      gsap.to('.hero-stage .shatter', { x: dx * -20, y: dy * -14, duration: 1, ease: 'power3.out' });
    });
  }

  // 2. Бегущая строка: направление и скорость зависят от скролла
  var loop = gsap.to('.marquee-track', { xPercent: -50, ease: 'none', duration: 22, repeat: -1 });
  var dir = 1;
  ScrollTrigger.create({
    onUpdate: function (self) {
      dir = self.direction;
      var boost = gsap.utils.clamp(1, 6, Math.abs(self.getVelocity()) / 300);
      gsap.to(loop, { timeScale: dir * boost, duration: 0.2, overwrite: true });
      gsap.to(loop, { timeScale: dir, duration: 1.2, delay: 0.25, ease: 'power2.out' });
    }
  });

  // 3. Карточки прайса: предыдущая уходит назад, когда сверху ложится следующая
  // Считаем по живым позициям на экране: ScrollTrigger неверно меряет sticky-элементы,
  // из-за этого карточки темнели раньше, чем на них ложилась следующая.
  var cards = gsap.utils.toArray('.card');
  var shades = cards.map(function (card) {
    var s = document.createElement('span');
    s.className = 'card-shade';
    card.appendChild(s);
    return s;
  });
  function stackCards() {
    for (var i = 0; i < cards.length - 1; i++) {
      var card = cards[i];
      var stickTop = parseFloat(getComputedStyle(card).top) || 0;
      var nextStickTop = parseFloat(getComputedStyle(cards[i + 1]).top) || 0;
      var from = stickTop + card.offsetHeight;          // следующая только коснулась низа текущей
      var to = nextStickTop;                             // следующая полностью легла сверху
      var nextTop = cards[i + 1].getBoundingClientRect().top;
      var p = gsap.utils.clamp(0, 1, (from - nextTop) / (from - to));
      gsap.set(card, { scale: 1 - 0.08 * p, rotation: (i % 2 ? 2.5 : -2.5) * p });
      gsap.set(shades[i], { opacity: 0.45 * p });
    }
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { stackCards(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', stackCards);
  stackCards();

  // 4. Работы: на компьютере лента едет вбок, пока скроллишь вниз.
  // Блок закреплен через CSS sticky, а секция вытягивается на длину ленты.
  // На телефоне ленту листают пальцем (см. style.css), здесь ничего не делаем
  var work = document.querySelector('.work');
  var workPin = document.querySelector('.work-pin');
  var track = document.querySelector('.work-track');
  var dist = function () { return Math.max(0, track.scrollWidth - vw()); };
  gsap.matchMedia().add('(min-width: 761px)', function () {
    function sizeWork() { work.style.height = (workPin.offsetHeight + dist()) + 'px'; }
    sizeWork();
    ScrollTrigger.addEventListener('refreshInit', sizeWork);
    gsap.to(track, {
      x: function () { return -dist(); },
      ease: 'none',
      scrollTrigger: {
        trigger: work,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
        invalidateOnRefresh: true
      }
    });
    return function () {
      ScrollTrigger.removeEventListener('refreshInit', sizeWork);
      work.style.height = '';
    };
  });

  // 5. Шаги выезжают по одному и уезжают обратно при скролле вверх.
  // Только на компьютере: во встроенном браузере Threads и Instagram на айфоне
  // скролл-анимации не срабатывали, и текст оставался невидимым
  var desktop = window.matchMedia('(min-width: 761px) and (pointer: fine)').matches;
  if (desktop) {
  gsap.utils.toArray('.steps li').forEach(function (li, i) {
    gsap.from(li, {
      x: i % 2 ? 120 : -120,
      opacity: 0,
      ease: 'power2.out',
      scrollTrigger: { trigger: li, start: 'top 95%', end: 'top 60%', scrub: 0.5 }
    });
  });
  gsap.utils.toArray('.sec-head h2').forEach(function (h) {
    gsap.from(h, {
      yPercent: 60, skewY: 6, opacity: 0,
      scrollTrigger: { trigger: h, start: 'top 95%', end: 'top 65%', scrub: 0.5 }
    });
  });
  }

  // 6. «Напиши мне» въезжает с двух сторон
  gsap.from('.cb-row:first-child', { xPercent: -40, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'top 20%', scrub: 0.5 } });
  gsap.from('.cb-row:last-child', { xPercent: 40, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'top 20%', scrub: 0.5 } });

  // Шрифты и картинки догружаются позже и меняют высоту блоков: пересчитываем позиции
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
})();
