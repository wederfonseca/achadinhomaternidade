// assets/js/main.js
const WAIT_MS = 1200;
let locked = false;

/* ----------------- UTIL ----------------- */
function generateEventId() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
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

/* envia evento (CAPI) e redireciona após WAIT_MS */
async function sendEventThenRedirect(endpoint, payload, url) {
  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-capi-signature': 'v1'
      },
      body: payload,
      keepalive: true
    });
  } catch (e) {
    console.warn('[collect] send error', e);
  } finally {
    setTimeout(() => {
      window.location.href = url;
    }, WAIT_MS);
  }
}

/* ----------------- DOM READY ----------------- */
document.addEventListener('DOMContentLoaded', () => {

  const buttons = document.querySelectorAll('.btn-track');
  const loadingOverlay = document.getElementById('loading');

  // garante overlay escondido no começo
  if (loadingOverlay) loadingOverlay.classList.add('hidden');

  /* ---------- TRACKING / CLIQUE ---------- */
  buttons.forEach(btn => {
    btn.addEventListener('click', ev => {
      ev.preventDefault();

      const targetUrl = btn.href;
      const groupType = btn.dataset.group || 'geral';
      const endpoint = btn.dataset.collectEndpoint || '/collect';
      const sessionKey = `group_join_sent_${groupType}`;

      // mostra overlay imediatamente para feedback visual
      if (loadingOverlay) loadingOverlay.classList.remove('hidden');

      // se já enviamos nessa sessão, só redireciona (mantendo overlay)
      if (sessionStorage.getItem(sessionKey)) {
        setTimeout(() => { window.location.href = targetUrl; }, WAIT_MS);
        return;
      }

      // evita duplo envio
      if (locked) return;
      locked = true;

      // registra evento localmente
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

      // envia evento e redireciona
      sendEventThenRedirect(endpoint, payload, targetUrl);
    });
  });

  /* ---------- FLOATING CTA: robusto e estável ---------- */
  const mainCTA = document.querySelector('.main-cta');               // botão hero
  const finalCTA = document.querySelector('.final-cta, .urgency .cta'); // botão final (normaliza seletor)
  const floatingCTA = document.querySelector('.floating-cta');

  if (!floatingCTA) return;

  // set com elementos atualmente visíveis via IO
  const visibleTargets = new Set();

  // IntersectionObserver para mainCTA e finalCTA (mais tolerante em mobile)
  const ioOptions = {
    root: null,
    rootMargin: '0px 0px -45% 0px', // considera visível quando elemento entra na parte superior ~55% da viewport
    threshold: 0.01
  };

  function ioCallback(entries) {
    entries.forEach(entry => {
      const el = entry.target;
      if (entry.isIntersecting) visibleTargets.add(el);
      else visibleTargets.delete(el);
    });
    scheduleUpdate();
  }

  const observer = new IntersectionObserver(ioCallback, ioOptions);
  if (mainCTA) observer.observe(mainCTA);
  if (finalCTA) observer.observe(finalCTA);

  function isNearBottom(pixelsFromBottom = 100) {
    return (window.pageYOffset + window.innerHeight) >= (document.documentElement.scrollHeight - pixelsFromBottom);
  }

  function updateFloating() {
    // não mostrar no topo para evitar piscar com address bar mobile
    if (window.scrollY < 120) {
      floatingCTA.classList.remove('show');
      floatingCTA.setAttribute('aria-hidden', 'true');
      return;
    }

    const anyObservedVisible = visibleTargets.size > 0;
    const nearBottom = isNearBottom(100);

    if (anyObservedVisible || nearBottom) {
      floatingCTA.classList.remove('show');
      floatingCTA.setAttribute('aria-hidden', 'true');
    } else {
      floatingCTA.classList.add('show');
      floatingCTA.setAttribute('aria-hidden', 'false');
    }
  }

  // throttle via requestAnimationFrame
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

  // liga eventos de scroll/resize
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);

  // primeira verificação um pouco depois para evitar flicker inicial em mobile
  setTimeout(() => scheduleUpdate(), 140);

});