const WAIT_MS = 800;
let locked = false;

function generateEventId(){
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'evt_' + Date.now();
}

async function sendEventThenRedirect(endpoint, payload, url){
  try{
    await fetch(endpoint,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-capi-signature':'v1'
      },
      body:payload,
      keepalive:true
    });
  }catch(e){}

  setTimeout(()=>{ window.location.href=url }, WAIT_MS);
}

document.addEventListener('DOMContentLoaded',()=>{
  const buttons=document.querySelectorAll('.btn-track');
  const loading=document.getElementById('loading');

  buttons.forEach(btn=>{
    btn.addEventListener('click',ev=>{
      ev.preventDefault();
      if(locked) return;
      locked=true;

      if(loading) loading.classList.remove('hidden');

      const payload=JSON.stringify({
        event_name:'Lead',
        event_id:generateEventId(),
        event_source_url:location.href,
        custom_data:{
          brand:'Achadinho do Dia',
          group:btn.dataset.group
        }
      });

      sendEventThenRedirect(
        btn.dataset.collectEndpoint,
        payload,
        btn.href
      );
    });
  });
});