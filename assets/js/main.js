const WAIT_MS = 1000;
let locked = false;

/* UTIL */
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

document.addEventListener('DOMContentLoaded', () => {

  const buttons = document.querySelectorAll('.btn-track');
  const loadingOverlay = document.getElementById('loading');

  if (loadingOverlay) loadingOverlay.classList.add('hidden');

  /* TRACKING */
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

  /* FLOATING CTA — suave e robusto */
  const mainCTA = document.querySelector('.main-cta');
  const finalCTA = document.querySelector('.urgency .cta');
  const floatingCTA = document.querySelector('.floating-cta');

  if (!floatingCTA) return;

  function elementIsVisible(el){
    if(!el) return false;
    const rect = el.getBoundingClientRect();
    // Considera visível se estiver na área central da viewport (mais robusto que 0px)
    return rect.top < window.innerHeight * 0.7 && rect.bottom > window.innerHeight * 0.3;
  }

  function updateFloating(){
    const mainVisible = elementIsVisible(mainCTA);
    const finalVisible = elementIsVisible(finalCTA);

    if(mainVisible || finalVisible){
      floatingCTA.classList.remove('show');
      floatingCTA.setAttribute('aria-hidden', 'true');
    } else {
      floatingCTA.classList.add('show');
      floatingCTA.setAttribute('aria-hidden', 'false');
    }
  }

  // Roda a primeira verificação ligeiramente depois para evitar flicker
  setTimeout(updateFloating, 80);

  window.addEventListener('scroll', updateFloating, { passive:true });
  window.addEventListener('resize', updateFloating);
});