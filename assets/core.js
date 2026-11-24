/* =====================================================================
   Reincidência de Atendimento · núcleo compartilhado
   (demandas, BI e auditoria usam este arquivo)
   ===================================================================== */

/* ---------- parâmetros fixos (iguais para qualquer distribuidora) ---------- */
const TIPOS=[ // sev = prioridade (maior primeiro) · low = sempre no fim do grupo
  {k:'E24', v:'FALTA DE ENERGIA - ATÉ 24H',           g:'Falta energia · até 24h',  b:'24h', u:'ATÉ',  sh:'Até 24h',  bg:'#fde68a',fg:'#78350f',sev:1},
  {k:'E35', v:'FALTA DE ENERGIA - ENTRE 3 E 5 DIAS',  g:'Falta energia · 3–5 dias', b:'3–5', u:'DIAS', sh:'3–5 dias', bg:'#fbbf24',fg:'#422006',sev:2},
  {k:'E57', v:'FALTA DE ENERGIA - ENTRE 5 E 7 DIAS',  g:'Falta energia · 5–7 dias', b:'5–7', u:'DIAS', sh:'5–7 dias', bg:'#f97316',fg:'#ffffff',sev:3},
  {k:'E810',v:'FALTA DE ENERGIA - ENTRE 8 E 10 DIAS', g:'Falta energia · 8–10 dias',b:'8–10',u:'DIAS', sh:'8–10 dias',bg:'#dc2626',fg:'#ffffff',sev:4},
  {k:'E10', v:'FALTA DE ENERGIA - ACIMA DE 10 DIAS',  g:'Falta energia · +10 dias', b:'+10', u:'DIAS', sh:'+10 dias', bg:'#7f1d1d',fg:'#ffffff',sev:5},
  {k:'PLA', v:'PLA',                                   g:'PLA',                      b:'PLA', u:'OBRAS',sh:'PLA',      bg:'#0f766e',fg:'#ffffff',sev:1.5,resp:'OBRAS'},
  {k:'SGFI',v:'FALTA DE ENERGIA SGFI',                g:'Falta energia · SGFI',     b:'SGFI',u:'FALTA ENERGIA',sh:'SGFI',bg:'#8b5a2b',fg:'#ffffff',sev:0.5,low:1,resp:'RELACIONAMENTO'},
  {k:'COM', v:'SERVIÇO COMERCIAL FORA DO PRAZO',      g:'Serv. comercial fora prazo',b:'SERV.',u:'COMERCIAL',sh:'Comercial',bg:'#334155',fg:'#ffffff',sev:0,low:1},
];
const TK=k=>TIPOS.find(t=>t.k===k);
const CANAIS=['PRESENCIAL','DELFOS'];
const RESPS=['MANUTENÇÃO','STC','RELACIONAMENTO','OBRAS'];
const ST={
  PSR:{s:'Pendente sem retorno', k:'Sem retorno',  c:'#c62828',e:'🔴',o:0},
  PFP:{s:'Retorno fora do prazo',k:'Fora do prazo',c:'#7c3aed',e:'🟣',o:1},
  PCP:{s:'Pendente com prazo',   k:'Com prazo',    c:'#d97706',e:'🟡',o:2},
  RES:{s:'Resolvido',            k:'Resolvido',    c:'#15803d',e:'🟢',o:3},
};
const OPEN=['PSR','PFP','PCP'];
const FMT={'45':{l:'Vertical 4:5'},'11':{l:'Quadrado 1:1'},'auto':{l:'Cabe tudo'},'cus':{l:'Personalizado'}};
const WIN=3*3600e3;          // reenvio em menos de 3h = mesmo aviso
const NS='reinc_prod_';        // prefixo do armazenamento no navegador
const BASE=window.BASE||'';  // caminho até a raiz do site ('' ou '../')

/* ---------- configuração padrão (o config.json do repositório sobrescreve) ---------- */
const DEF_CFG={
  rev:0, distribuidora:'Piauí', contato:'lucas.cruz@equatorialenergia.com.br',
  regioes:[
    {id:'NORTE',nome:'Norte',regionais:['PARNAIBA']},
    {id:'SUL',nome:'Sul',regionais:['PICOS','FLORIANO']},
    {id:'METRO',nome:'Metropolitana',regionais:['METROPOLITANA']},
  ],
  auditoria:{s:'guwcJe05WjjP4CqrGT/Z9Q==',h:'eH1j6tl+QK47eh8yTBaLUOE9jBekaYEMuC/dAqXXLF4='},  // senha: Relacionamento123
  gh:{owner:'',repo:'',main:'main',branch:'dados',tok:null,salt:null}
};

/* ---------- utilitários ---------- */
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const isoDay=d=>{d=new Date(d);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)};
const todayISO=()=>isoDay(Date.now());
const br=iso=>iso?iso.split('-').reverse().join('/'):'';
const brShort=iso=>iso?br(iso).slice(0,5):'';
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const tipoInfo=v=>TIPOS.find(t=>t.v===v||t.k===v)||{k:'?',v,g:v||'—',b:'?',u:'',sh:v||'—',bg:'#9ca3af',fg:'#fff',sev:1};
const title=s=>{s=String(s||''); if(/^(STC|PLA|SGFI|II|IX)$/.test(s)) return s; return s.toLowerCase().replace(/(^|\s)(\S)/g,(m,a,b)=>a+b.toUpperCase()).replace(/\b(De|Do|Da|Dos|Das|E|D)\b/g,m=>m.toLowerCase()).replace(/\b(Ii|Ix)\b/g,m=>m.toUpperCase());};
const daysBetween=(a,b)=>Math.round((new Date(b+'T12:00')-new Date(a+'T12:00'))/864e5);
function toast(m,ms=2800){let t=$('toast'); if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t);} t.textContent=m;t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('on'),ms);}
const lsGet=(k,d)=>{try{const v=localStorage.getItem(NS+k);return v?JSON.parse(v):d}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(NS+k,JSON.stringify(v));return true}catch(e){return false}};
const lsDel=k=>{try{localStorage.removeItem(NS+k)}catch(e){}};
function download(name,data,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(data instanceof Blob?data:new Blob([data],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove();}
function csvText(cols,rows){const q=v=>{v=String(v??''); return /[";\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}; return '﻿'+cols.join(';')+'\n'+rows.map(r=>r.map(q).join(';')).join('\n')+'\n';}

/* ---------- criptografia (WebCrypto: PBKDF2 + AES-256-GCM) ---------- */
const enc=new TextEncoder(), dec=new TextDecoder();
const b64=buf=>{const u=new Uint8Array(buf);let s='';for(let i=0;i<u.length;i+=8192)s+=String.fromCharCode(...u.subarray(i,i+8192));return btoa(s);};
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function pbkdf2(pass,salt,it){const k=await crypto.subtle.importKey('raw',enc.encode(pass),'PBKDF2',false,['deriveBits']);
  return crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:it,hash:'SHA-256'},k,256);}
async function hashPass(pass,saltB64){const salt=saltB64?unb64(saltB64):crypto.getRandomValues(new Uint8Array(16));return {s:b64(salt),h:b64(await pbkdf2(pass,salt,150000))};}
async function aesKey(pass,saltB64,it){return crypto.subtle.importKey('raw',await pbkdf2(pass,unb64(saltB64),it),'AES-GCM',false,['encrypt','decrypt']);}
async function seal(key,text){const iv=crypto.getRandomValues(new Uint8Array(12));return {v:1,i:b64(iv),c:b64(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(text)))};}
async function unseal(key,box){return dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(box.i)},key,unb64(box.c)));}
async function encryptToken(token,kw){kw=nkw(kw);const salt=b64(crypto.getRandomValues(new Uint8Array(16))),it=400000;const box=await seal(await aesKey(kw,salt,it),token);return {s:salt,i:box.i,c:box.c,it};}

/* =====================================================================
   CONFIGURAÇÃO, MUNICÍPIOS E ESTADO
   ===================================================================== */
let CFG=null, MUN=[], TOKEN=null, DKEY=null, WHO='';
// MODO EXEMPLO: dados falsos guardados à parte, só neste navegador; nunca vão para o repositório
let SANDBOX=null;   // {reg, data}
let S={items:[],events:[],snaps:[],ui:{},dirty:false,lastPull:0};
const REG=id=>CFG.regioes.find(r=>r.id===id);
const ghOn=()=>!SANDBOX&&!!(CFG.gh.owner&&CFG.gh.repo&&TOKEN&&DKEY);
const ghConfigured=()=>!!(CFG.gh.owner&&CFG.gh.repo&&CFG.gh.tok);

async function loadCfg(){
  let remote=null; try{const r=await fetch(BASE+'config.json?t='+Date.now(),{cache:'no-store'}); if(r.ok) remote=await r.json();}catch(_){}
  const local=lsGet('cfg',null);
  const src=[remote,local].filter(Boolean).sort((a,b)=>(b.rev||0)-(a.rev||0))[0]||{};
  CFG={...JSON.parse(JSON.stringify(DEF_CFG)),...src};
  CFG.gh={...DEF_CFG.gh,...(src.gh||{})}; if(!src.regioes) CFG.regioes=JSON.parse(JSON.stringify(DEF_CFG.regioes));
  if(!src.auditoria) CFG.auditoria=DEF_CFG.auditoria;
  let txt=null; try{const r=await fetch(BASE+'municipios.csv?t='+Date.now(),{cache:'no-store'}); if(r.ok) txt=await r.text();}catch(_){}
  MUN=parseMun(txt||lsGet('mun','')||window.MUN_FALLBACK||'');
}
function parseMun(txt){ // MUNICIPIO;BASE;REGIONAL (cabeçalho opcional; aceita ; tab ou ,)
  const lines=String(txt).replace(/\r/g,'').replace(/^﻿/,'').split('\n').map(l=>l.trim()).filter(Boolean);
  const sp=l=>(l.includes('\t')?l.split('\t'):l.includes(';')?l.split(';'):l.split(',')).map(x=>x.trim().toUpperCase());
  let ix={m:0,b:1,rg:2}, rows=lines.map(sp);
  if(rows.length&&norm(rows[0][0]).startsWith('MUNIC')){const h=rows.shift().map(norm); ix={m:h.findIndex(c=>c.startsWith('MUNIC')),b:h.findIndex(c=>c==='BASE'),rg:h.findIndex(c=>c.startsWith('REGIONAL'))};}
  return rows.map(r=>({m:r[ix.m]||'',b:r[ix.b]||'',rg:r[ix.rg]||''})).filter(o=>o.m&&o.b&&o.rg)
    .map(o=>{const r=CFG.regioes.find(r=>r.regionais.some(x=>norm(x)===norm(o.rg))); return {...o,reg:r?r.id:''};});
}
const munCSV=list=>'MUNICIPIO;BASE;REGIONAL\n'+list.map(m=>[m.m,m.b,m.rg].join(';')).join('\n')+'\n';
// listas filtradas (superintendência, regional, base) — usadas nas listas suspensas
const munOf=(reg,f={})=>MUN.filter(m=>(!reg||m.reg===reg)&&(!f.rg||norm(m.rg)===norm(f.rg))&&(!f.b||norm(m.b)===norm(f.b)));
const uniq=a=>[...new Set(a)].sort((x,y)=>x.localeCompare(y,'pt'));
const regionaisOf=(reg,f={})=>uniq(munOf(reg,f).map(m=>m.rg));
const basesOf=(reg,f={})=>uniq(munOf(reg,f).map(m=>m.b));
const findMun=(name,reg)=>{const n=norm(name); return MUN.find(m=>norm(m.m)===n&&(!reg||m.reg===reg))||null;};

function loadData(){
  SANDBOX=lsGet('sandbox',null);
  if(SANDBOX){ const ui=(lsGet('data',{}).ui)||{}; S={items:[],events:[],snaps:[],dirty:false,lastPull:0,...SANDBOX.data,ui}; return; }
  S={items:[],events:[],snaps:[],ui:{},dirty:false,lastPull:0,...lsGet('data',{})};
  S.items.forEach(i=>{i.avisos=i.avisos||[]; i.adj=i.adj||0; i.upd=i.upd||Date.now(); i.regional=i.regional||''; i.base=i.base||'';});
}
function saveData(){
  if(SANDBOX){ SANDBOX.data={items:S.items,events:S.events,snaps:S.snaps}; lsSet('sandbox',SANDBOX); const real=lsGet('data',{}); real.ui=S.ui; lsSet('data',real); return; }
  lsSet('data',S);}
function enterSandbox(reg){ const m=makeMock(45,reg); lsSet('sandbox',{reg,data:m}); location.reload(); }
function exitSandbox(){ lsDel('sandbox'); location.reload(); }
function logEv(ev,it,extra={}){S.events.push({ts:new Date().toISOString(),perfil:WHO,regiao:it?it.regiao:'',ev,id:it?it.id:'',nota:it?it.nota||'':'',
  tipo:it?tipoInfo(it.tipo).k:'',resp:it?it.resp||'':'',base:it?it.base||'':'',regional:it?it.regional||'':'',municipio:it?it.municipio||'':'',...extra});}
function touch(it){it.upd=Date.now(); it.por=WHO; S.dirty=true; saveData(); schedulePush();}

/* ---------- avisos e bandeiras ---------- */
const recent=it=>{const a=it.avisos||[]; return a.length&&Date.now()-a[a.length-1]<WIN;};
const avisoN=it=>it._aviso!=null?it._aviso:Math.max(1,(it.avisos||[]).length+(it.adj||0)+(recent(it)?0:1));
const flag=it=>it.status==='RES'?'':(avisoN(it)<=2?'y':'r');      // 1º–2º amarela · 3º+ vermelha
const avisosDados=it=>(it.avisos||[]).length+(it.adj||0);           // avisos já enviados

/* ---------- campos obrigatórios ---------- */
const REQ=['tipo','municipio','base','regional','nota','resp','status'];
function missing(it){const m=REQ.filter(f=>!it[f]); if((it.status==='PCP'||it.status==='PFP')&&!it.prazo) m.push('prazo'); return m;}

/* =====================================================================
   GITHUB — arquivos criptografados na branch de dados
   ===================================================================== */
const nkw=k=>String(k||'').trim().toLowerCase();   // palavra-chave não diferencia maiúsculas
async function unlock(kw){
  if(!CFG.gh.tok) return true; kw=nkw(kw); if(!kw) return false;
  try{ TOKEN=await unseal(await aesKey(kw,CFG.gh.tok.s,CFG.gh.tok.it),CFG.gh.tok); DKEY=await aesKey(kw,CFG.gh.salt,300000); lsSet('kw',kw); return true; }
  catch(_){TOKEN=null; DKEY=null; return false;}
}
const kwFromLink=()=>{try{return decodeURIComponent(location.hash.slice(1))}catch(_){return ''}};
async function gh(path,opt={}){
  const r=await fetch(`https://api.github.com/repos/${CFG.gh.owner}/${CFG.gh.repo}${path}`,{...opt,headers:{'Authorization':'Bearer '+TOKEN,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(opt.body?{'Content-Type':'application/json'}:{})}});
  if(!r.ok){const e=new Error('GitHub '+r.status); e.status=r.status; try{e.msg=(await r.json()).message}catch(_){ } throw e;}
  return r.status===204?null:r.json();
}
async function ghRead(path,branch){
  const r=await fetch(`https://api.github.com/repos/${CFG.gh.owner}/${CFG.gh.repo}/contents/${path}?ref=${encodeURIComponent(branch)}&t=${Date.now()}`,{headers:{'Authorization':'Bearer '+TOKEN,'Accept':'application/vnd.github.raw','X-GitHub-Api-Version':'2022-11-28'},cache:'no-store'});
  if(r.status===404) return null; if(!r.ok){const e=new Error('GitHub '+r.status);e.status=r.status;throw e;} return r.text();
}
async function ghList(dir,branch){try{return (await gh(`/contents/${dir}?ref=${encodeURIComponent(branch)}`)).map(f=>f.path);}catch(e){if(e.status===404) return []; throw e;}}
async function ghCommit(branch,files,message){ // um commit com vários arquivos; cria a branch se não existir
  const tree=Object.entries(files).map(([path,content])=>({path,mode:'100644',type:'blob',content}));
  let ref=null; try{ref=await gh(`/git/ref/heads/${branch}`);}catch(e){if(e.status!==404) throw e;}
  if(!ref){const t=await gh('/git/trees',{method:'POST',body:JSON.stringify({tree})});
    const c=await gh('/git/commits',{method:'POST',body:JSON.stringify({message,tree:t.sha,parents:[]})});
    await gh('/git/refs',{method:'POST',body:JSON.stringify({ref:'refs/heads/'+branch,sha:c.sha})}); return;}
  const head=ref.object.sha, hc=await gh(`/git/commits/${head}`);
  const t=await gh('/git/trees',{method:'POST',body:JSON.stringify({base_tree:hc.tree.sha,tree})});
  const c=await gh('/git/commits',{method:'POST',body:JSON.stringify({message,tree:t.sha,parents:[head]})});
  await gh(`/git/refs/heads/${branch}`,{method:'PATCH',body:JSON.stringify({sha:c.sha,force:false})});
}
const readEnc=async p=>{const t=await ghRead(p,CFG.gh.branch); return t?JSON.parse(await unseal(DKEY,JSON.parse(t))):null;};
const writeEnc=async obj=>JSON.stringify(await seal(DKEY,JSON.stringify(obj)));
function mergeItems(local,remote){const m=new Map(); for(const it of remote) m.set(it.id,it);
  for(const it of local){const r=m.get(it.id); if(!r||(it.upd||0)>(r.upd||0)) m.set(it.id,it);} return [...m.values()];}
const evKey=e=>e.ts+'|'+e.id+'|'+e.ev; const snKey=s=>s.ts+'|'+s.escopo;
const mergeBy=(a,b,k)=>{const seen=new Set(a.map(k)); return [...a,...b.filter(x=>!seen.has(k(x)))];};

let pushT=null, busy=false, onSync=()=>{}, onData=()=>{};
function setSync(st,txt){const b=$('syncBtn'); if(!b) return; b.className='hbtn sync '+st; $('syncTxt').textContent=txt;}
function schedulePush(){ if(SANDBOX){setSync('pend','Modo exemplo'); return;} if(!ghOn()){setSync('pend','Salvo neste navegador'); return;} setSync('pend','Alterações a enviar'); clearTimeout(pushT); pushT=setTimeout(push,5000); }
async function pull(silent){
  if(!ghOn()||busy) return; busy=true; if(!silent) setSync('run','Atualizando…');
  try{ const d=await readEnc('demandas.enc.json'); S.items=mergeItems(S.items,d?d.itens||[]:[]); S.lastPull=Date.now(); saveData(); onData();
    setSync(S.dirty?'pend':'ok',S.dirty?'Alterações a enviar':'Sincronizado'); }
  catch(e){console.error(e); setSync('err',e.name==='OperationError'?'Palavra-chave não abre os dados':'Erro ao ler o repositório');}
  busy=false;
}
// histórico completo (para o BI): todos os meses de eventos e envios
async function pullHistory(){
  if(!ghOn()) return {events:S.events,snaps:S.snaps};
  const [hf,ef]=await Promise.all([ghList('historico',CFG.gh.branch),ghList('envios',CFG.gh.branch)]);
  const ev=(await Promise.all(hf.filter(p=>p.endsWith('.enc.json')).map(readEnc))).flat().filter(Boolean);
  const sn=(await Promise.all(ef.filter(p=>p.endsWith('.enc.json')).map(readEnc))).flat().filter(Boolean);
  return {events:mergeBy(ev,S.events,evKey),snaps:mergeBy(sn,S.snaps,snKey)};
}
async function push(opts={}){
  if(!ghOn()) return; if(busy){schedulePush();return;} busy=true; setSync('run','Enviando…');
  for(let n=0;n<4;n++){
    try{
      const d=await readEnc('demandas.enc.json'); let remote=d?d.itens||[]:[];
      if(opts.purge) remote=remote.filter(opts.purge);
      S.items=opts.replace?S.items:mergeItems(S.items,remote);
      S.items=S.items.filter(i=>!i.exemplo); S.events=S.events.filter(e=>!e.exemplo); S.snaps=S.snaps.filter(x=>!x.exemplo);   // trava: exemplo nunca sobe
      const files={'demandas.enc.json':await writeEnc({atualizado:new Date().toISOString(),por:WHO,itens:S.items})};
      const evs=[...S.events], snaps=[...S.snaps], months=new Set(opts.months||[]);
      evs.forEach(e=>months.add(e.ts.slice(0,7))); snaps.forEach(s=>months.add(s.ts.slice(0,7)));
      for(const m of months){
        const me=evs.filter(e=>e.ts.startsWith(m)), ms=snaps.filter(s=>s.ts.startsWith(m));
        if(me.length||opts.purge){const p=`historico/${m}.enc.json`; let cur=(await readEnc(p))||[]; if(opts.purge) cur=cur.filter(opts.purge); files[p]=await writeEnc(mergeBy(cur,me,evKey));}
        if(ms.length||opts.purge){const p=`envios/${m}.enc.json`; let cur=(await readEnc(p))||[]; if(opts.purge) cur=cur.filter(opts.purge); files[p]=await writeEnc(mergeBy(cur,ms,snKey));}
      }
      await ghCommit(CFG.gh.branch,files,opts.msg||`dados: ${WHO} ${new Date().toLocaleString('pt-BR')}${snaps.length?' · envio de card':''}`);
      S.events=S.events.slice(evs.length); S.snaps=S.snaps.slice(snaps.length); S.dirty=false; S.lastPull=Date.now(); saveData(); onData();
      setSync('ok','Sincronizado'); busy=false; return true;
    }catch(e){ if(e.status===422||e.status===409){await new Promise(r=>setTimeout(r,800+Math.random()*1500)); continue;}
      console.error(e); setSync('err',e.status===401||e.status===403?'Token sem permissão':'Erro ao enviar'); busy=false; return false; }
  }
  setSync('err','Conflito, tente de novo'); busy=false; return false;
}

/* =====================================================================
   CARD (imagem)
   ===================================================================== */
const CARD_CSS=`
.pg{width:1080px;background:#f3f4f6;font-family:"Segoe UI",Roboto,Arial,sans-serif;color:#111827;box-sizing:border-box;overflow:hidden;position:relative}
.pg *{box-sizing:border-box}
.pg.auto .bd{padding-bottom:40px}
.hd{height:190px;background:#ffc20e;display:flex;align-items:center;padding:0 48px;gap:28px;border-bottom:8px solid #111827}
.hd svg{width:104px;height:104px;flex:0 0 auto}
.hd .t{flex:1;min-width:0}
.hd .t1{font-size:62px;font-weight:900;line-height:1;letter-spacing:-1px}
.hd .t2{font-size:28px;font-weight:700;margin-top:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hd .dt{text-align:right}
.hd .d1{font-size:66px;font-weight:900;line-height:1}
.hd .d2{font-size:24px;font-weight:700;margin-top:6px;color:#3f3f46}
.bd{padding:36px 48px 0}
.sm{display:flex;background:#fff;border-radius:16px;border:2px solid #e5e7eb}
.sm>div{flex:1;padding:18px 20px;border-left:2px solid #e5e7eb}
.sm>div:first-child{border-left:none}
.sm .n{font-size:64px;font-weight:900;line-height:1}
.sm .l{font-size:20px;font-weight:700;color:#4b5563;margin-top:6px;white-space:nowrap}
.rgh{font-size:22px;font-weight:800;color:#4b5563;margin:28px 0 12px;letter-spacing:.5px}
.rgs{display:flex;gap:8px}
.rgs>div{flex:1;border-radius:12px;padding:12px 0;text-align:center}
.rgs .n{font-size:46px;font-weight:900;line-height:1}
.rgs .l{font-size:17px;font-weight:800;margin-top:5px;white-space:nowrap}
.ls{margin-top:28px;display:flex;flex-direction:column;gap:12px}
.it{height:132px;background:#fff;border-radius:16px;border:2px solid #e5e7eb;display:flex;overflow:hidden}
.it.fy{background:#fff8d9;border:2px solid #ecd27a}
.it.fr{background:#fdeaea;border:2px solid #eba3a3}
.it .rg{width:178px;flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
.it .rg .b{font-size:54px;font-weight:900;letter-spacing:-1px}
.it .rg .b.sm2{font-size:29px;letter-spacing:0}
.it .rg .s{font-size:20px;font-weight:800;margin-top:6px;letter-spacing:1px}
.it .md{flex:1;min-width:0;padding:0 22px;display:flex;flex-direction:column;justify-content:center}
.it .mu{font-size:33px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.1}
.it .tg{display:flex;gap:8px;margin-top:8px;white-space:nowrap}
.it .tg span{font-size:22px;font-weight:900;padding:3px 11px;border-radius:7px;letter-spacing:.3px}
.it .tg .bs{border:3px solid #111827;color:#111827;padding:0 10px;max-width:440px;overflow:hidden;text-overflow:ellipsis}
.it .l3{font-size:17px;color:#9ca3af;margin-top:7px;white-space:nowrap}
.it.fy .l3,.it.fr .l3{color:#6b7280}
.it .rt{width:250px;flex:0 0 auto;padding-right:24px;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;text-align:right}
.it .st{font-size:24px;font-weight:900;display:flex;align-items:center;gap:10px;white-space:nowrap}
.it .st i{width:18px;height:18px;border-radius:50%;display:inline-block;flex:0 0 auto}
.it .sb{font-size:20px;font-weight:600;color:#6b7280;margin-top:6px}
.it .av{font-size:21px;font-weight:900;margin-top:8px;padding:4px 12px;border-radius:8px;white-space:nowrap}
.it .av.y{background:#f2c200;color:#111827}
.it .av.r{background:#c81e1e;color:#fff}
.gh{display:flex;align-items:center;gap:16px;margin-top:6px}
.gh b{background:#111827;color:#fff;font-size:28px;font-weight:900;padding:6px 18px;border-radius:10px;letter-spacing:1px}
.gh .ln{flex:1;height:3px;background:#d1d5db;border-radius:2px}
.gh span{font-size:20px;font-weight:800;color:#6b7280;white-space:nowrap}
.gh em{font-style:normal}
.ls .gh~.gh{margin-top:14px}
.ls.cp{gap:8px}
.ls.cp .it{height:98px}
.cpp .sm>div{padding:12px 20px}.cpp .sm .n{font-size:52px}.cpp .sm .l{font-size:18px;margin-top:4px}
.cpp .rgh{margin:18px 0 10px;font-size:20px}.cpp .rgs>div{padding:8px 0}.cpp .rgs .n{font-size:38px}.cpp .rgs .l{font-size:16px}
.cpp .ls{margin-top:20px}.cpp .bd{padding-top:28px}
.ls.cp .it .rg .b{font-size:46px}.ls.cp .it .rg .b.sm2{font-size:26px}.ls.cp .it .rg .s{font-size:18px}
.ls.cp .it .mu{font-size:29px}.ls.cp .it .tg{margin-top:4px}.ls.cp .it .tg span{font-size:19px}.ls.cp .it .l3{font-size:16px;margin-top:4px}
.ls.cp .it .st{font-size:22px}.ls.cp .it .av{font-size:19px;margin-top:4px;padding:2px 10px}.ls.cp .it .sb{font-size:17px;margin-top:3px}
.ls.cp .gh b{font-size:23px;padding:3px 14px}.ls.cp .gh span{font-size:18px}.ls.cp .gh~.gh{margin-top:8px}
.none{background:#fff;border:2px dashed #d1d5db;border-radius:16px;padding:40px;text-align:center;color:#6b7280;font-size:30px;font-weight:700;margin-top:28px}`;
document.head.insertAdjacentHTML('beforeend',`<style id="cardcss">${CARD_CSS}</style>`);

const TRI=`<svg viewBox="0 0 100 100"><path d="M50 8 L95 88 L5 88 Z" fill="#111827" stroke="#111827" stroke-width="8" stroke-linejoin="round"/><rect x="45" y="36" width="10" height="28" rx="3" fill="#ffc20e"/><circle cx="50" cy="74" r="6" fill="#ffc20e"/></svg>`;
// ordem: pendentes → (SGFI e comercial no fim) → faixa mais grave → mais avisos → status → resolvidas por último
const sorted=a=>[...a].sort((x,y)=>{const tx=tipoInfo(x.tipo),ty=tipoInfo(y.tipo);
  return (x.status==='RES')-(y.status==='RES')||(tx.low?1:0)-(ty.low?1:0)||ty.sev-tx.sev||avisoN(y)-avisoN(x)||ST[x.status].o-ST[y.status].o;});
const groupOf=items=>[...RESPS,''].map(r=>({r,its:items.filter(i=>(i.resp||'')===r||(r===''&&!RESPS.includes(i.resp)))})).filter(g=>g.its.length);
function outW(ui){return ui.fmt==='cus'?Math.max(300,+ui.cw||1080):1080;}
function pageH(ui){const f=ui.fmt; if(f==='11') return 1080; if(f==='auto') return 0; if(f==='cus') return Math.round((Math.max(300,+ui.ch||1920))*1080/outW(ui)); return 1350;}

// páginas de um conjunto de demandas → [{html, ids}]
function buildPages(all,label,o={}){
  const dt=o.dt||todayISO(), PH=pageH(o.ui||S.ui), its=sorted(all);
  const c={PSR:0,PFP:0,PCP:0,RES:0}; all.forEach(i=>c[i.status]++);
  const rgCount=TIPOS.map(t=>all.filter(i=>tipoInfo(i.tipo).k===t.k&&i.status!=='RES').length);
  const [d,m,y]=br(dt).split('/');
  const head=(pi,n)=>`<div class="hd">${TRI}<div class="t"><div class="t1">REINCIDÊNCIA</div><div class="t2">Atendimento ao cliente · ${esc(label)}</div></div>
      <div class="dt"><div class="d1">${d}/${m}</div><div class="d2">${n>1?`Parte ${pi+1} de ${n}`:y}</div></div></div>`;
  const summ=`<div class="sm"><div><div class="n">${all.length}</div><div class="l">Demandas</div></div>
      ${['PSR','PFP','PCP','RES'].map(k=>`<div><div class="n" style="color:${c[k]?ST[k].c:'#c4c9d1'}">${c[k]}</div><div class="l">${k==='RES'?'Resolvidas':ST[k].k}</div></div>`).join('')}</div>
      <div class="rgh">PENDENTES POR TIPO</div>
      <div class="rgs">${TIPOS.map((t,i)=>{const on=rgCount[i]>0;return `<div style="background:${on?t.bg:'#e5e7eb'};color:${on?t.fg:'#9ca3af'}"><div class="n">${rgCount[i]}</div><div class="l">${t.sh}</div></div>`;}).join('')}</div>`;
  const itemHTML=it=>{const t=tipoInfo(it.tipo),st=ST[it.status]||ST.PSR,av=avisoN(it),fl=flag(it);
    const dias=it.criado?daysBetween(it.criado,dt):0, venc=it.prazo&&it.status!=='RES'&&it.prazo<dt;
    const sub=venc?`<span style="color:#b91c1c">Prazo vencido ${brShort(it.prazo)}</span>`:it.prazo&&it.status!=='RES'?`Prazo ${brShort(it.prazo)}`:dias>0&&it.status!=='RES'?`Há ${dias} dia${dias>1?'s':''}`:'';
    const l3=[it.regional&&norm(it.regional)!==norm(it.base)?'Regional '+title(it.regional):'',`Nota ${it.nota||'—'}`,it.conta?`CC ${it.conta}`:'',it.canal?title(it.canal):''].filter(Boolean).join('  ·  ');
    return `<div class="it ${fl?'f'+fl:''}"><div class="rg" style="background:${t.bg};color:${t.fg}"><div class="b ${t.b.length>4?'sm2':''}">${esc(t.b)}</div><div class="s" ${t.u.length>10?'style="font-size:16px;letter-spacing:.5px"':''}>${esc(t.u)}</div></div>
      <div class="md"><div class="mu">${esc(title(it.municipio)||'—')}</div>
        <div class="tg">${it.base?`<span class="bs">BASE ${esc(it.base)}</span>`:'<span class="bs" style="border-color:#9ca3af;color:#9ca3af">SEM BASE</span>'}${o.showReg&&REG(it.regiao)?`<span class="bs" style="border-color:#6b7280;color:#4b5563">${esc(REG(it.regiao).nome.toUpperCase())}</span>`:''}</div>
        <div class="l3">${esc(l3)}</div></div>
      <div class="rt"><div class="st" style="color:${st.c}"><i style="background:${st.c}"></i>${st.k}</div>
        ${sub?`<div class="sb">${sub}</div>`:''}${fl?`<div class="av ${fl}">${av}º aviso</div>`:''}</div></div>`;};
  const ghead=(g,cont)=>{const k={PSR:0,PFP:0,PCP:0,RES:0}; g.its.forEach(i=>k[i.status]++);
    const parts=['PSR','PFP','PCP','RES'].filter(s=>k[s]).map(s=>`<em style="color:${ST[s].c}">${k[s]} ${s==='RES'?'resolvida'+(k[s]>1?'s':''):ST[s].k.toLowerCase()}</em>`).join(' · ');
    return `<div class="gh"><b>${esc(g.r||'SEM RESPONSÁVEL')}</b><span class="ln"></span><span>${cont?'continuação':parts}</span></div>`;};
  const blocks=[]; groupOf(its).forEach(g=>{blocks.push({h:1,g}); g.its.forEach(it=>blocks.push({g,id:it.id,html:itemHTML(it)}));});
  const pageHTML=(pi,n,bl,compact)=>{
    const list=bl.map(b=>b.h?ghead(b.g,b.cont):b.html).join('');
    const body=!all.length?'<div class="none">Nenhuma demanda</div>':(pi===0?summ:'')+`<div class="ls ${compact?'cp':''}" ${pi?'style="margin-top:0"':''}>${list}</div>`;
    return `<div class="pg ${compact?'cpp':''} ${PH?'':'auto'}" style="height:${PH?PH+'px':'auto'}">${head(pi,n)}<div class="bd">${body}</div></div>`;};
  const out=(pgs,compact)=>pgs.map((bl,pi)=>({html:pageHTML(pi,pgs.length,bl,compact&&pi===0),ids:bl.filter(b=>b.id).map(b=>b.id)}));
  if(!PH) return out([blocks],false);
  let M=$('measure'); if(!M){M=document.createElement('div');M.id='measure';M.style.cssText='position:absolute;left:-99999px;top:0';document.body.appendChild(M);}
  const fits=(pi,bl,compact)=>{M.innerHTML=pageHTML(pi,1,bl,compact); const ls=M.firstChild.querySelector('.ls'); if(!ls) return true; return ls.offsetTop+ls.offsetHeight<=PH-34;};
  const paginate=compact=>{const o2=[]; let cur=[];
    for(const b of blocks){ cur.push(b);
      if(!fits(o2.length,cur,compact)){ cur.pop(); let carry=[]; if(cur.length&&cur[cur.length-1].h) carry=[cur.pop()];
        o2.push(cur); cur=carry.length?carry:(b.h?[]:[{h:1,g:b.g,cont:1}]); cur.push(b);}}
    o2.push(cur); return o2;};
  let compact=false, pgs=paginate(false);
  if(pgs.length>1){const c1=paginate(true); if(c1.length===1){pgs=c1;compact=true;}}
  M.innerHTML=''; return out(pgs,compact);
}
// conjuntos de imagens: tudo junto ou um por responsável
function cardSets(items,label,o={}){
  if(!o.split) return [{label,pages:buildPages(items,label,o)}];
  return groupOf(items).map(g=>{const l=`${label} · ${title(g.r||'Sem responsável')}`; return {label:l,resp:g.r||'Sem responsável',pages:buildPages(g.its,l,o)};});
}
async function toImage(node,ui){
  const w=1080,h=node.offsetHeight, k=outW(ui||S.ui)/1080, W=Math.round(w*k), Hh=Math.round(h*k);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject x="0" y="0" width="${w}" height="${h}"><div xmlns="http://www.w3.org/1999/xhtml"><style>${CARD_CSS}</style>${new XMLSerializer().serializeToString(node)}</div></foreignObject></svg>`;
  const img=new Image(); await new Promise((ok,ko)=>{img.onload=ok;img.onerror=ko;img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);});
  const cv=document.createElement('canvas'); cv.width=W; cv.height=Hh; const ctx=cv.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,Hh); ctx.drawImage(img,0,0,W,Hh);
  return {jpg:cv.toDataURL('image/jpeg',0.93),png:await new Promise(r=>cv.toBlob(r,'image/png'))};
}
// prévia escalada
function fitPreview(box,ui){const ws=box.querySelectorAll('.pv-wrap'), n=ws.length, avail=box.clientWidth, w=Math.min(n>1?(avail-16)/2:avail,520), sc=w/1080;
  ws.forEach(el=>{const h=el.querySelector('.pg').offsetHeight; el.style.width=w+'px';el.style.height=h*sc+'px';el.firstChild.style.transform=`scale(${sc})`;});
  const pg=box.querySelector('.pg'); return pg?`Saída: ${outW(ui)} × ${Math.round(pg.offsetHeight*outW(ui)/1080)} px${n>1?` · ${n} imagens`:''}`:'';}

/* =====================================================================
   DADOS DE EXEMPLO (marcados com exemplo:true — fáceis de apagar)
   ===================================================================== */
function makeMock(days=45,onlyReg=null){
  let seed=20261124+(onlyReg?onlyReg.length*97:0); const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
  const pick=a=>a[Math.floor(rnd()*a.length)];
  const wpick=pairs=>{const t=pairs.reduce((a,p)=>a+p[1],0); let r=rnd()*t; for(const [v,w] of pairs){if((r-=w)<0) return v;} return pairs[0][0];};
  const items=[],events=[],snaps=[], now=Date.now(), dayMs=864e5;
  const regW=[['SUL',5],['METRO',4],['NORTE',3]].filter(r=>!onlyReg||r[0]===onlyReg);
  const tipoW=[['E24',6],['E35',5],['E57',4],['E810',3],['E10',2],['PLA',2],['SGFI',3],['COM',4]];
  const respOf=k=>k==='PLA'?'OBRAS':k==='SGFI'?'RELACIONAMENTO':k==='COM'?'STC':(rnd()<.85?'MANUTENÇÃO':'STC');
  const contas=[]; let nota=1021300000;
  const at=(dayAgo,h)=>{const d=new Date(now-dayAgo*dayMs); d.setHours(h,Math.floor(rnd()*50),0,0); return d.getTime();};
  const ev=(ts,e,it,x={})=>events.push({ts:new Date(ts).toISOString(),perfil:it.regiao.toLowerCase(),regiao:it.regiao,ev:e,id:it.id,nota:it.nota,tipo:tipoInfo(it.tipo).k,resp:it.resp,base:it.base,regional:it.regional,municipio:it.municipio,exemplo:true,...x});
  // bases "problemáticas" demoram mais
  const slow={'BOM JESUS':1.8,'CAMPO MAIOR':1.6,'PIRIPIRI':1.5,'SAO RAIMUNDO NONATO':1.4};
  for(let dAgo=days;dAgo>=0;dAgo--){
    const wd=new Date(now-dAgo*dayMs).getDay(); if(wd===0) continue;
    const n=wd===6?1:2+Math.floor(rnd()*4);
    for(let i=0;i<n;i++){
      const reg=wpick(regW), mun=pick(MUN.filter(m=>m.reg===reg)); if(!mun) continue;
      const k=wpick(tipoW), resp=respOf(k);
      let conta; if(contas.length>8&&rnd()<.1) conta=pick(contas); else {conta=String(3000000000+Math.floor(rnd()*9e8)); contas.push(conta);}
      const created=at(dAgo,8+Math.floor(rnd()*8));
      const it={id:'ex'+(nota++).toString(36)+Math.floor(rnd()*1e4),exemplo:true,regiao:reg,tipo:TK(k).v,municipio:mun.m,base:mun.b,regional:mun.rg,conta,nota:String(nota),
        resp,status:'PSR',prazo:'',canal:rnd()<.55?'DELFOS':'PRESENCIAL',obs:'',criado:isoDay(created),avisos:[],adj:0,upd:created,por:reg.toLowerCase()};
      // quanto tempo para resolver (dias); algumas continuam abertas
      const base=(slow[mun.b]||1)*(resp==='OBRAS'?2:resp==='RELACIONAMENTO'?1.3:1);
      const ttr=Math.round((1+rnd()*6)*base);
      const resolveAgo=dAgo-ttr;
      if(rnd()<.45){it.status='PCP'; it.prazo=isoDay(created+(2+Math.floor(rnd()*6))*dayMs);}
      items.push(it); ev(created,'criado',it);
      it._res=resolveAgo>=0?(rnd()<.9?resolveAgo:(dAgo>14?Math.max(0,dAgo-14):null)):null;   // nada fica aberto mais de ~2 semanas
      if(it.status==='PCP'&&(it._res==null||it._res<dAgo-3)&&rnd()<.4) it._pfp=Math.max(0,dAgo-3);
    }
    // envio do dia (17h) por superintendência: pendentes ganham aviso, resolvidas saem
    if(wd>=1&&wd<=5&&dAgo>0) for(const [reg] of regW){
      const ts=at(dAgo,17), sIts=[];
      for(const it of items.filter(i=>i.regiao===reg&&!i.arq&&i.criado<=isoDay(now-dAgo*dayMs))){
        if(it._pfp!=null&&it._pfp>=dAgo&&it.status==='PCP'){ev(ts-36e5,'status',it,{de:'PCP',para:'PFP'}); it.status='PFP';}
        if(it._res!=null&&it._res>=dAgo&&it.status!=='RES'){ev(ts-72e5,'status',it,{de:it.status,para:'RES'}); it.status='RES'; it.resolvido=ts-72e5;}
        if(it.status==='RES'){it.arq=true; ev(ts,'arquivado',it); sIts.push({...snapOf(it),aviso:null}); continue;}
        it.avisos.push(ts); ev(ts,'envio',it,{aviso:it.avisos.length}); sIts.push({...snapOf(it),aviso:it.avisos.length});
      }
      if(sIts.length) snaps.push({ts:new Date(ts).toISOString(),perfil:reg.toLowerCase(),escopo:reg,itens:sIts,exemplo:true});
    }
  }
  // resolvidas hoje: aparecem no card de hoje (ainda não enviado)
  items.filter(i=>!i.arq&&i._res===0&&i.status!=='RES').forEach(i=>{const t=now-2*36e5; ev(t,'status',i,{de:i.status,para:'RES'}); i.status='RES'; i.resolvido=t;});
  items.forEach(i=>{delete i._res; delete i._pfp; i.upd=now;});
  return {items,events,snaps};
}
const snapOf=i=>({id:i.id,nota:i.nota,conta:i.conta,regiao:i.regiao,regional:i.regional,base:i.base,municipio:i.municipio,tipo:tipoInfo(i.tipo).k,resp:i.resp,status:i.status,prazo:i.prazo,canal:i.canal,criado:i.criado});

/* ---------- interface comum ---------- */
function sandboxUI(getReg){
  const b=$('btnEx'); if(!b) return;
  if(SANDBOX){ b.textContent='Sair do exemplo'; b.classList.add('exon'); b.onclick=exitSandbox;
    document.body.insertAdjacentHTML('afterbegin',`<div class="exbar">Modo exemplo · ${esc((REG(SANDBOX.reg)||{}).nome||'')}: dados fictícios. Nada do que você fizer aqui é salvo de verdade nem aparece para outras pessoas. <button onclick="exitSandbox()">Sair do exemplo</button></div>`); }
  else { b.textContent='Exemplo'; b.onclick=()=>{const r=getReg(); if(!r) return toast('Escolha a superintendência primeiro'); enterSandbox(r);}; }
}
function brand(){ document.querySelectorAll('[data-dist]').forEach(e=>e.textContent=CFG.distribuidora);
  document.querySelectorAll('[data-mail]').forEach(e=>{e.textContent=CFG.contato; e.href='mailto:'+CFG.contato;}); }
function wireModals(){ document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m||e.target.closest('[data-close]')) m.classList.remove('on');})); }
function openHelp(anchor){ const m=$('mHelp'); $('helpFrame').src=BASE+'ajuda.html'+(anchor?'#'+anchor:''); m.classList.add('on'); }
