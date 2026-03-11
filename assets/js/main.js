// assets/js/main.js
const WAIT_MS = 1000;
let locked = false;

/* ================= UTIL (mantido) ================= */
function generateEventId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2);
}

function readCookie(name) {
  const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
  return m ? decodeURIComponent(m.pop()) : null;
}

function getExternalId() {
  const fbp = readCookie('_fbp');
  if (fbp) return fbp;
  return btoa(navigator.userAgent + Intl.DateTimeFormat().resolvedOptions().timeZone);
}

async function sendEventThenRedirect(endpoint, payload, url) {
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json','x-capi-signature': 'v1'},
      body: payload,
      keepalive: true
    });
  } catch (e) {
    console.warn('[collect] send error', e);
  }
  setTimeout(() => { window.location.href = url; }, WAIT_MS);
}

/* ================= DOM READY ================= */
document.addEventListener('DOMContentLoaded', () => {

  const buttons = document.querySelectorAll('.btn-track');
  const loadingOverlay = document.getElementById('loading');

  // garante que o overlay comece escondido
  if (loadingOverlay) loadingOverlay.classList.add('hidden');

  /* =============== TRACKING (igual ao original) =============== */
  buttons.forEach(btn => {
    btn.addEventListener('click', ev => {
      ev.preventDefault();
      if (locked) return;
      locked = true;

      const targetUrl = btn.href;
      const groupType = btn.dataset.group || 'geral';
      const endpoint = btn.dataset.collectEndpoint || '/collect';
      const sessionKey = `group_join_sent_${groupType}`;

      if (sessionStorage.getItem(sessionKey)) {
        window.location.href = targetUrl;
        return;
      }

      if (loadingOverlay) loadingOverlay.classList.remove('hidden');

      const eventId = generateEventId();
      sessionStorage.setItem(sessionKey, eventId);

      const payload = JSON.stringify({
        event_name: 'GroupJoinIntent',
        event_id: eventId,
        event_source_url: window.location.href,
        fbp: readCookie('_fbp'),
        fbc: readCookie('_fbc'),
        external_id: getExternalId(),
        custom_data: {
          destination: 'whatsapp_group',
          brand: 'Achadinho do Dia',
          group: groupType
        }
      });

      sendEventThenRedirect(endpoint, payload, targetUrl);
    });
  });

  /* =============== FLOATING CTA — robusto e suave =============== */

  const mainCTA = document.querySelector('.main-cta');             // botão hero
  const finalCTA = document.querySelector('.urgency .cta');        // botão no final/urgency
  const floatingCTA = document.querySelector('.floating-cta');     // botão flutuante

  if (!floatingCTA) return; // nada a fazer

  // Set usado para controlar quais alvos foram detectados como "visíveis" pelo IO
  const visibleTargets = new Set();

  // IntersectionObserver options:
  // rootMargin com bottom negativo faz com que o elemento seja considerado intersecting
  // antes de chegar ao fundo da viewport (mais tolerante em mobile).
  const ioOptions = {
    root: null,
    rootMargin: '0px 0px -40% 0px', // considere visível quando entrar na parte superior ~60% da viewport
    threshold: 0.01
  };

  function ioCallback(entries) {
    entries.forEach(entry => {
      const el = entry.target;
      if (entry.isIntersecting) visibleTargets.add(el);
      else visibleTargets.delete(el);
    });
    scheduleUpdate(); // programar atualização visual
  }

  const observer = new IntersectionObserver(ioCallback, ioOptions);
  if (mainCTA) observer.observe(mainCTA);
  if (finalCTA) observer.observe(finalCTA);

  // Detecta se o usuário chegou muito perto do fim da página (tipo "scroll bottom")
  function isNearBottom(pixelsFromBottom = 80) {
    // usar pageYOffset e body.scrollHeight para ser mais robusto em mobile
    return (window.pageYOffset + window.innerHeight) >= (document.documentElement.scrollHeight - pixelsFromBottom);
  }

  // Atualiza visibilidade do floating CTA com regras:
  // - esconde se mainCTA OU finalCTA estiverem "visíveis" (IO)
  // - esconde se estiver VERY near bottom
  // - mostra caso contrário
  function updateFloating() {
    if (!floatingCTA) return;

    const anyObservedVisible = visibleTargets.size > 0;
    const nearBottom = isNearBottom(80); // ajuste fino: 80px do fim

    if (anyObservedVisible || nearBottom) {
      // esconder suavemente
      floatingCTA.classList.remove('show');
      floatingCTA.setAttribute('aria-hidden', 'true');
    } else {
      // mostrar suavemente
      floatingCTA.classList.add('show');
      floatingCTA.setAttribute('aria-hidden', 'false');
    }
  }

  // Throttle com requestAnimationFrame para scroll/resize — evita execuções pesadas
  let ticking = false;
  function scheduleUpdate() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        updateFloating();
        ticking = false;
      });
    }
  }

  // Também ligamos scroll/resize para lidar com mudanças na altura da viewport (browsers mobile)
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);

  // Roda a primeira vez um pouco depois da pintura pra evitar flicker inicial
  setTimeout(() => {
    scheduleUpdate();
  }, 120);

});