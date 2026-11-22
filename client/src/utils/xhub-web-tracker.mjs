// WA-001 — copy into each public website's frontend bundle.
// This client NEVER talks to X-HUB directly and NEVER holds a bearer token.
// Opt-in is the website's responsibility; this tracker also obeys GPC/DNT.
// No localStorage, cookie, fingerprinting, raw form text or cross-site IDs.
const ALLOWED=new Set([
  'page_view','content_view','search_used','filter_used',
  'map_place_view','map_directions_click','favorite_added',
  'contact_click','form_started','lead_submitted','outbound_click'
]);
const safeMetric=/^[\p{L}\p{N}_. -]+$/u;
const safeEntity=/^[A-Za-z0-9_-]{1,80}$/;
// Optional DNS attribution must not include localhost, IPs or long numeric IDs.
const safeReferrerHost=/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function createXHubWebTracker({
  endpoint='/api/xhub-analytics',hasConsent=()=>false,
  root=globalThis,send=root.fetch?.bind(root),
  // Site-specific sanitizer returns a public route CATEGORY, never a raw URL.
  getPath=(pathname)=>pathname
}={}){
  if(typeof endpoint!=='string'||!endpoint.startsWith('/')||
    endpoint.startsWith('//')||endpoint.includes('?')||
    typeof hasConsent!=='function'||typeof send!=='function'||
    typeof getPath!=='function')
    throw new TypeError('A same-origin endpoint, consent function and fetch are required');
  let sessionId=null;
  let attribution=null;
  let queue=[];
  let running=false;
  const randomId=()=>root.crypto?.randomUUID?.()||null;
  const consented=()=>hasConsent()===true&&
    root.navigator?.globalPrivacyControl!==true&&
    root.navigator?.doNotTrack!=='1'&&
    root.navigator?.msDoNotTrack!=='1'&&root.doNotTrack!=='1';
  function reset(){queue=[];sessionId=null;attribution=null;}
  const metric=(value,max)=>{
    if(typeof value!=='string')return undefined;
    const trimmed=value.trim();
    // Drop sensitive/oversized attribution entirely; never truncate PII.
    return trimmed&&trimmed.length<=max&&safeMetric.test(trimmed)&&
      !/\d{9,}/.test(trimmed)?trimmed:undefined;
  };
  function context(){
    const location=root.location;
    if(!location||typeof location.pathname!=='string')return null;
    let path;
    try{path=getPath(location.pathname);}catch{return null;}
    if(typeof path!=='string'||!path.startsWith('/')||path.length>180||
      path.startsWith('/admin')||/[?#@\u0000-\u001f]/.test(path))return null;
    const params=new URLSearchParams(location.search||'');
    let referrerHost;
    try{
      const host=new URL(root.document?.referrer||'').hostname.toLowerCase();
      if(safeReferrerHost.test(host)&&!/\d{9,}/.test(host))referrerHost=host;
    }catch{}
    return {
      path,
      utmSource:metric(params.get('utm_source'),60),
      utmMedium:metric(params.get('utm_medium'),60),
      utmCampaign:metric(params.get('utm_campaign'),80),
      referrerHost
    };
  }
  async function flush(){
    if(running||!queue.length)return {sent:0};
    if(!consented()){reset();return {sent:0};}
    running=true;
    const batch=queue.splice(0,20);
    try{
      const response=await send(endpoint,{
        method:'POST',headers:{'Content-Type':'application/json'},
        credentials:'omit',cache:'no-store',keepalive:true,
        body:JSON.stringify({schemaVersion:1,events:batch})
      });
      if(!response?.ok)throw Error('Site bridge unavailable');
      return {sent:batch.length};
    }catch{
      // No persistent offline tracking. Keep a bounded retry queue in memory;
      // if consent is withdrawn, discard it even after an in-flight response.
      if(consented())queue=[...batch,...queue].slice(0,40);
      else reset();
      return {sent:0};
    }finally{running=false;}
  }
  function track(name,{entityType,entityKey,engagementMs}={}){
    if(!consented()){reset();return false;}
    if(!ALLOWED.has(name))return false;
    const info=context();
    if(!info)return false;
    const eventId=randomId();
    if(!eventId)return false;
    if(!sessionId)sessionId=randomId();
    if(!sessionId)return false;
    // Preserve first-touch UTM in this in-memory SPA session; never persist
    // it across visits or different sites, and never include full query URL.
    if(!attribution)attribution={
      utmSource:info.utmSource,utmMedium:info.utmMedium,
      utmCampaign:info.utmCampaign
    };
    const event={eventId,sessionId,name,occurredAt:new Date().toISOString(),
      consent:true,...info,...attribution};
    if(['article','project','place','listing','service'].includes(entityType)&&
      typeof entityKey==='string'&&safeEntity.test(entityKey)&&
      !/\d{9,}/.test(entityKey)){
      event.entityType=entityType;
      event.entityKey=entityKey;
    }
    if(Number.isSafeInteger(engagementMs)&&engagementMs>=0&&
      engagementMs<=3600000)event.engagementMs=engagementMs;
    queue.push(event);
    if(queue.length>=10)void flush();
    return true;
  }
  return {track,flush,disable:reset,
    // For transparent UI diagnostics only; no visitor IDs or event text.
    pending:()=>queue.length};
}
