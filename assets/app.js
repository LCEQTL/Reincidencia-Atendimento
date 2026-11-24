/* =====================================================================
   Página de demandas
   ===================================================================== */
let REGION=null;
const visible=()=>S.items.filter(i=>!i.del&&!i.arq&&i.regiao===REGION);
const ready=()=>visible().filter(i=>!missing(i).length);   // completas: entram no card
const regLabel=()=>REG(REGION)?REG(REGION).nome:'';

/* ---------- grade ---------- */
const COLS=[
  {k:'n',l:'',w:34,fix:1},
  {k:'tipo',l:'Tipo de serviço',w:215,req:1},{k:'municipio',l:'Município',w:190,req:1},{k:'base',l:'Base',w:160,req:1},{k:'regional',l:'Regional',w:140,req:1},
  {k:'nota',l:'Nº da nota',w:115,req:1},{k:'conta',l:'Conta contrato',w:140},{k:'resp',l:'Responsável',w:150,req:1},{k:'status',l:'Status',w:145,req:1},
  {k:'prazo',l:'Prazo',w:140,req:2},{k:'canal',l:'Canal',w:110},{k:'obs',l:'Relato (só no texto)',w:240},{k:'aviso',l:'Aviso',w:100},{k:'act',l:'',w:118,fix:1}];
const colW=c=>(S.ui.colw&&S.ui.colw[c.k])||c.w;
function gridHead(){
  $('cg').innerHTML=COLS.map(c=>`<col style="width:${colW(c)}px">`).join('');
  $('grid').style.width=COLS.reduce((a,c)=>a+colW(c),0)+'px';
  $('gh').innerHTML='<tr>'+COLS.map(c=>`<th data-k="${c.k}" ${c.req===2?'title="Obrigatório quando o status é Com prazo ou Fora do prazo"':''}>${esc(c.l)}${c.req?'<span class="req"> *</span>':''}${c.fix?'':'<span class="rz"></span>'}</th>`).join('')+'</tr>';}
const opts=(list,val,lab=x=>x,blank=true)=>(blank?'<option value=""></option>':'')+[...list,...(val&&!list.includes(val)?[val]:[])].map(v=>`<option value="${esc(v)}" ${v===val?'selected':''}>${esc(lab(v))}</option>`).join('');
function rowHTML(it,i){
  const res=it.status==='RES', st=ST[it.status]||ST.PSR, av=avisoN(it), fl=flag(it), miss=missing(it);
  const td=(f,html,cls='')=>`<td class="${miss.includes(f)?'miss':''} ${cls}">${html}</td>`;
  const cell={
    n:`<td class="rn">${i+1}</td>`,
    tipo:td('tipo',`<select data-f="tipo">${opts(TIPOS.map(t=>t.v),it.tipo,v=>tipoInfo(v).g)}</select>`),
    municipio:td('municipio',`<input data-f="municipio" value="${esc(it.municipio||'')}" list="dlMun" autocomplete="off">`),
    base:td('base',`<select data-f="base">${opts(basesOf(REGION,{rg:it.regional}),it.base,title)}</select>`),
    regional:td('regional',`<select data-f="regional">${opts(regionaisOf(REGION,{b:it.base}),it.regional,title)}</select>`),
    nota:td('nota',`<input data-f="nota" inputmode="numeric" value="${esc(it.nota||'')}">`),
    conta:td('conta',`<input data-f="conta" inputmode="numeric" value="${esc(it.conta||'')}">`),
    resp:td('resp',`<select data-f="resp">${opts(RESPS,it.resp,title)}</select>`),
    status:res?`<td><span class="stres">Resolvida</span></td>`:td('status',`<select data-f="status" class="st" style="color:${st.c}">${opts(OPEN,it.status,k=>ST[k].k,false)}</select>`),
    prazo:td('prazo',`<input data-f="prazo" type="date" value="${esc(it.prazo||'')}">`),
    canal:td('canal',`<select data-f="canal" style="color:var(--mt)">${opts(CANAIS,it.canal,title)}</select>`),
    obs:td('obs',`<input data-f="obs" value="${esc(it.obs||'')}" title="${esc(it.obs||'')}">`),
    aviso:`<td>${res?'<div class="av hint" style="line-height:1.2">sai no<br>próximo envio</div>':`<div class="av"><button data-av="-1" title="Diminuir">−</button><b class="${fl}">${av}º</b><button data-av="1" title="Aumentar">+</button></div>`}</td>`,
    act:`<td><div class="act">${res?'<button data-undo>Desfazer</button>':'<button class="ok" data-res title="Marcar como resolvida">Resolver</button>'}<button class="x" data-del title="Excluir">✕</button></div></td>`,
  };
  return `<tr data-id="${it.id}" class="${res?'res':''}">${COLS.map(c=>cell[c.k]).join('')}</tr>`;
}
function renderGrid(){
  gridHead(); const v=visible(); const pend=v.filter(i=>i.status!=='RES').length, res=v.length-pend, inc=v.filter(i=>missing(i).length).length;
  $('cnt').innerHTML=v.length?`${pend} pendente(s)${res?` · ${res} resolvida(s) aguardando envio`:''}${inc?` · <span style="color:#b42318">${inc} incompleta(s), fora do card</span>`:''}`:'';
  $('rows').innerHTML=v.length?v.map(rowHTML).join(''):`<tr class="empty"><td colspan="${COLS.length}">Nenhuma demanda na superintendência ${esc(regLabel())}. Use <b>+ Nova linha</b> ou cole do Excel abaixo.</td></tr>`;
}
function refreshRow(it){ // atualiza a linha sem recriar (não perde o foco do Tab)
  const tr=document.querySelector(`tr[data-id="${it.id}"]`); if(!tr) return renderGrid(); const miss=missing(it);
  tr.querySelectorAll('[data-f]').forEach(el=>{const f=el.dataset.f, td=el.closest('td');
    if(f==='base') el.innerHTML=opts(basesOf(REGION,{rg:it.regional}),it.base,title);
    else if(f==='regional') el.innerHTML=opts(regionaisOf(REGION,{b:it.base}),it.regional,title);
    if(el.value!==(it[f]||'')) el.value=it[f]||'';
    if(f==='status') el.style.color=(ST[it.status]||ST.PSR).c;
    td.classList.toggle('miss',miss.includes(f)); td.classList.remove('bad');});
}
function addRow(focus=true){
  const it={id:uid(),regiao:REGION,tipo:'',municipio:'',regional:'',base:'',conta:'',nota:'',resp:'',status:'PSR',prazo:'',canal:'',obs:'',criado:todayISO(),avisos:[],adj:0};
  S.items.push(it); logEv('criado',it); touch(it); renderGrid();
  if(focus) document.querySelector(`tr[data-id="${it.id}"] [data-f="tipo"]`).focus(); return it;}
// lista de municípios filtrada pela base/regional da linha em foco
document.addEventListener('focusin',e=>{ if(e.target.dataset&&e.target.dataset.f==='municipio'){const it=S.items.find(x=>x.id===e.target.closest('tr').dataset.id);
  $('dl').innerHTML=`<datalist id="dlMun">${munOf(REGION,{b:it.base,rg:it.regional}).map(m=>`<option value="${esc(m.m)}">`).join('')}</datalist>`;}});

/* regras dos campos ligados (município ↔ base ↔ regional) */
function applyField(it,f,v){
  if(f==='municipio'){ if(!v){it.municipio=''; return true;}
    const m=findMun(v,REGION); if(!m) return false;
    it.municipio=m.m; it.base=m.b; it.regional=m.rg; return true; }
  if(f==='base'){ it.base=v; if(v){const rs=regionaisOf(REGION,{b:v}); if(rs.length===1) it.regional=rs[0]; else if(it.regional&&!rs.includes(it.regional)) it.regional='';}
    if(it.municipio&&!munOf(REGION,{b:it.base,rg:it.regional}).some(m=>m.m===it.municipio)) it.municipio=''; return true; }
  if(f==='regional'){ it.regional=v; if(v&&it.base&&!basesOf(REGION,{rg:v}).includes(it.base)) it.base='';
    if(it.municipio&&!munOf(REGION,{b:it.base,rg:it.regional}).some(m=>m.m===it.municipio)) it.municipio=''; return true; }
  if(f==='tipo'){ it.tipo=v; if(tipoInfo(v).resp) it.resp=tipoInfo(v).resp; return true; }
  if(f==='conta'||f==='nota'){ it[f]=v.replace(/\D/g,''); return true; }
  it[f]=v; return true;
}

/* ---------- colar / importar ---------- */
function importRows(rows){
  if(!rows.length) return;
  const H={}; let start=0;
  for(let i=0;i<Math.min(3,rows.length);i++){ if(rows[i].some(c=>{const n=norm(c);return n.includes('NOTA')||n.includes('TIPO DE SERV')||n.includes('RESPONS');})){
    rows[i].forEach((c,j)=>{const n=norm(c);
      if(n.startsWith('TIPO'))H.tipo=j; else if(n.startsWith('MUNIC'))H.municipio=j; else if(n.includes('CONTA'))H.conta=j; else if(n.includes('NOTA'))H.nota=j;
      else if(n.startsWith('CANAL'))H.canal=j; else if(n.startsWith('RESPONS'))H.resp=j; else if(n.startsWith('STATUS'))H.status=j; else if(n.startsWith('BASE'))H.base=j;
      else if(n.startsWith('REGIONAL'))H.regional=j; else if(n.startsWith('PRAZO'))H.prazo=j; else if(n.includes('RELATO')||n.startsWith('OBS'))H.obs=j; else if(n.startsWith('DATA'))H.criado=j;});
    start=i+1; break;}}
  const M=Object.keys(H).length?H:{tipo:0,municipio:1,conta:2,nota:3,canal:4,resp:5,status:6,base:7,prazo:8,obs:9};
  let nn=0,nu=0; const semNota=[],semMun=[];
  for(const r of rows.slice(start)){
    const g=k=>M[k]!=null?String(r[M[k]]??'').trim():'';
    if(!r.some(c=>String(c??'').trim())) continue;
    const nota=g('nota').replace(/\D/g,''); if(!nota){semNota.push(g('municipio')||'?'); continue;}
    const m=findMun(g('municipio'),REGION); if(!m){semMun.push(g('municipio')||'(vazio)'); continue;}
    const d={tipo:nTipo(g('tipo')),municipio:m.m,base:m.b,regional:m.rg,conta:g('conta').replace(/\D/g,''),nota,canal:nCanal(g('canal')),resp:nResp(g('resp')),
      status:nStatus(g('status')),prazo:nDate(g('prazo')),obs:g('obs'),criado:nDate(g('criado'))};
    if(!d.resp&&tipoInfo(d.tipo).resp) d.resp=tipoInfo(d.tipo).resp;
    const ex=S.items.find(x=>x.nota===nota&&!x.del&&!x.arq);
    if(ex){ if(ex.regiao!==REGION){semMun.push(d.municipio+' (nota de outra superintendência)'); continue;}
      for(const k in d) if(d[k]){ if(k==='status'&&ex.status!==d.status){logEv('status',ex,{de:ex.status,para:d.status}); if(d.status==='RES') ex.resolvido=Date.now();} ex[k]=d[k]; }
      touch(ex); nu++; }
    else{const it={id:uid(),regiao:REGION,avisos:[],adj:0,...d,status:d.status||'PSR',criado:d.criado||todayISO()}; if(it.status==='RES') it.resolvido=Date.now();
      S.items.push(it); logEv('criado',it); touch(it); nn++;}
  }
  renderAll();
  const msg=[`${nn} nova(s), ${nu} atualizada(s)`]; if(semMun.length) msg.push(`${semMun.length} ignorada(s) por município não cadastrado na superintendência: ${[...new Set(semMun)].slice(0,4).join(', ')}${semMun.length>4?'…':''}`);
  if(semNota.length) msg.push(`${semNota.length} sem nº da nota`); toast(msg.join(' · '),semMun.length?7000:3500);
}
function nTipo(x){const n=norm(x); if(!n) return '';
  if(n.includes('SGFI')) return TK('SGFI').v; if(/(^| )PLA( |$)/.test(n)) return TK('PLA').v; if(n.includes('COMERCIAL')) return TK('COM').v;
  if(n.includes('ACIMA')||/\+ ?10/.test(String(x))||n.includes(' 10 DIAS')&&!n.includes('8')) return TK('E10').v; if(n.includes('8')&&n.includes('10')) return TK('E810').v;
  if(n.includes('5')&&n.includes('7')) return TK('E57').v; if(n.includes('3')&&n.includes('5')) return TK('E35').v; if(n.includes('24')) return TK('E24').v; return '';}
const nCanal=x=>{const n=norm(x); return n.includes('DELFOS')?'DELFOS':n.includes('PRESENC')?'PRESENCIAL':'';};
const nResp=x=>{const n=norm(x); return n.includes('STC')?'STC':n.includes('MANUT')?'MANUTENÇÃO':n.includes('RELAC')?'RELACIONAMENTO':n.includes('OBRA')?'OBRAS':'';};
function nStatus(x){const n=norm(x); if(n.includes('RESOLV'))return 'RES'; if(n.includes('FORA DO PRAZO')||n.includes('FORA PRAZO'))return 'PFP';
  if(n.includes('SEM RETORNO'))return 'PSR'; if(n.includes('PRAZO'))return 'PCP'; if(n.includes('PEND'))return 'PSR'; return '';}
function nDate(x){if(!x) return ''; if(x instanceof Date) return isoDay(x); const s=String(x).trim(); const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if(m){const y=m[3].length===2?'20'+m[3]:m[3]; return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;} return /^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10):'';}

/* ---------- planilha (xlsx com listas suspensas) ---------- */
function loadExcelJS(){ if(window.ExcelJS) return Promise.resolve();
  const load=src=>new Promise((ok,ko)=>{const s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=ko; document.head.appendChild(s);});
  return load(BASE+'assets/vendor/exceljs.min.js').catch(()=>load('https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js')); }
const XCOLS=[['Tipo de serviço*',it=>tipoInfo(it.tipo).g,30],['Município*',it=>it.municipio,26],['Base*',it=>it.base,20],['Regional*',it=>it.regional,17],['Nº da nota*',it=>it.nota,14],
  ['Conta contrato',it=>it.conta,15],['Responsável*',it=>it.resp,17],['Status*',it=>ST[it.status].k,16],['Prazo',it=>it.prazo?new Date(it.prazo+'T12:00'):null,12],['Canal',it=>it.canal,13],['Relato',it=>it.obs,40],['Aviso (informativo)',it=>it.status==='RES'?'':avisoN(it)+'º',10]];
async function exportXlsx(){
  const v=visible(), name=`demandas_${norm(regLabel()).toLowerCase().replace(/ /g,'_')}_${todayISO()}`;
  try{ await loadExcelJS(); }catch(_){ // sem internet: CSV simples
    download(name+'.csv',csvText(XCOLS.map(c=>c[0]),v.map(it=>XCOLS.map(c=>{const x=c[1](it); return x instanceof Date?br(isoDay(x)):x;}))),'text/csv'); toast('Sem acesso à biblioteca de Excel: baixei em CSV'); return; }
  const wb=new ExcelJS.Workbook(), ws=wb.addWorksheet('Demandas',{views:[{state:'frozen',ySplit:1}]}), ls=wb.addWorksheet('Listas',{state:'hidden'});
  ws.columns=XCOLS.map(([h,,w])=>({header:h,width:w}));
  v.forEach(it=>ws.addRow(XCOLS.map(c=>c[1](it))));
  const hr=ws.getRow(1); hr.font={bold:true,color:{argb:'FFFFFFFF'}}; hr.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1F2733'}}; hr.height=20;
  const listas=[TIPOS.map(t=>t.g),munOf(REGION).map(m=>m.m).sort(),basesOf(REGION),regionaisOf(REGION),RESPS,['Sem retorno','Fora do prazo','Com prazo','Resolvido'],CANAIS];
  listas.forEach((l,ci)=>l.forEach((x,ri)=>ls.getCell(ri+1,ci+1).value=x));
  const L=(ci,n)=>`Listas!$${String.fromCharCode(65+ci)}$1:$${String.fromCharCode(65+ci)}$${Math.max(1,n)}`;
  const map={1:0,2:1,3:2,4:3,7:4,8:5,10:6};   // coluna da planilha → lista
  const last=Math.max(v.length+300,300);
  for(let r=2;r<=last;r++){
    for(const [col,li] of Object.entries(map)) ws.getCell(r,+col).dataValidation={type:'list',allowBlank:true,formulae:[L(li,listas[li].length)],showErrorMessage:true,errorStyle:'stop',errorTitle:'Valor inválido',error:'Escolha um valor da lista.'};
    ws.getCell(r,9).numFmt='dd/mm/yyyy'; ws.getCell(r,9).dataValidation={type:'date',operator:'greaterThan',allowBlank:true,formulae:[new Date(2020,0,1)],showErrorMessage:true,error:'Use uma data (dd/mm/aaaa).'};
    ws.getCell(r,5).numFmt='@'; ws.getCell(r,6).numFmt='@';
  }
  const buf=await wb.xlsx.writeBuffer(); download(name+'.xlsx',new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
}
async function importFile(f){
  if(/\.xlsx$/i.test(f.name)){ try{await loadExcelJS();}catch(_){return toast('Sem acesso à biblioteca de Excel. Copie as linhas e cole na caixa.',5000);}
    const wb=new ExcelJS.Workbook(); await wb.xlsx.load(await f.arrayBuffer()); const ws=wb.getWorksheet('Demandas')||wb.worksheets[0]; const rows=[];
    ws.eachRow({includeEmpty:false},row=>{const a=[]; for(let c=1;c<=ws.columnCount;c++){let x=row.getCell(c).value; if(x&&typeof x==='object'&&!(x instanceof Date)) x=x.text||x.result||(x.richText?x.richText.map(t=>t.text).join(''):''); a.push(x instanceof Date?br(isoDay(x)):x??'');} rows.push(a);});
    importRows(rows);
  } else { const t=await f.text(); importRows(t.replace(/^﻿/,'').replace(/\r/g,'').split('\n').filter(l=>l.trim()).map(l=>l.split(l.includes('\t')?'\t':';'))); }
}

/* ---------- card ---------- */
let SETS=[];
function renderCard(){SETS=cardSets(ready(),regLabel(),{split:S.ui.split}); $('pv').innerHTML=SETS.flatMap(s=>s.pages).map(p=>`<div class="pv-wrap"><div class="pv-inner">${p.html}</div></div>`).join(''); $('resInfo').textContent=fitPreview($('pv'),S.ui);}
let rT; function renderAll(){renderGrid(); clearTimeout(rT); rT=setTimeout(renderCard,120);}
onData=renderAll;
/* envio: pendentes ganham +1 aviso, resolvidas são arquivadas, e fica a foto do envio para o BI */
function registerSend(ids){
  const its=S.items.filter(i=>ids.includes(i.id)&&!i.arq&&!i.del); if(!its.length) return;
  const ts=Date.now(), snapIts=its.map(i=>({...snapOf(i),aviso:i.status==='RES'?null:avisoN(i)})); let n=0;
  its.forEach(it=>{ if(it.status==='RES'){it.arq=true; logEv('arquivado',it); touch(it); n++;}
    else if(!recent(it)){it.avisos.push(ts); logEv('envio',it,{aviso:avisoN(it)}); touch(it); n++;} });
  if(!n) return;
  S.snaps.push({ts:new Date(ts).toISOString(),perfil:WHO,escopo:REGION,itens:snapIts});
  saveData(); renderAll(); if(ghOn()){clearTimeout(pushT); push();}
}
let shots=[];
async function exportAll(){
  const bt=$('btnJpg'); bt.disabled=true; bt.textContent='Gerando…';
  try{ renderCard(); const nodes=[...document.querySelectorAll('#pv .pg')], meta=SETS.flatMap(s=>s.pages.map((p,i)=>({ids:p.ids,label:s.resp?title(s.resp):'',part:s.pages.length>1?i+1:0})));
    shots=[]; for(let i=0;i<nodes.length;i++) shots.push({...(await toImage(nodes[i],S.ui)),...meta[i]});
    const hh=new Date().toTimeString().slice(0,5).replace(':','h'), base=`reincidencia_${norm(regLabel()).toLowerCase().replace(/ /g,'_')}_${todayISO()}_${hh}`;
    $('mImgTitle').textContent=shots.length>1?`${shots.length} imagens prontas`:'Imagem pronta';
    $('imgs').innerHTML=shots.map((s,i)=>{const nm=base+(s.label?'_'+norm(s.label).toLowerCase().replace(/ /g,''):'')+(s.part?'_'+s.part:'');
      return `<figure><img src="${s.jpg}"><figcaption><a class="btn sm pri" href="${s.jpg}" download="${nm}.jpg" data-dl="${i}">Baixar</a><button class="btn sm" data-cp="${i}">Copiar</button><span>${esc(s.label)}${s.part?' · parte '+s.part:''}</span></figcaption></figure>`;}).join('');
    $('mImg').classList.add('on');
  }catch(e){console.error(e); toast('Não foi possível gerar a imagem neste navegador');}
  bt.disabled=false; bt.textContent='Gerar imagem (JPG)';
}
function makeText(){
  const all=ready(), its=sorted(all); const c={PSR:0,PFP:0,PCP:0,RES:0}; all.forEach(i=>c[i.status]++);
  let t=`⚠️ *REINCIDÊNCIA · ${brShort(todayISO())} · ${regLabel()}*\n${all.length} demandas · 🔴 ${c.PSR} sem retorno · 🟣 ${c.PFP} fora do prazo · 🟡 ${c.PCP} com prazo · 🟢 ${c.RES} resolvidas\n`;
  for(const g of groupOf(its)){
    t+=`\n*${g.r||'SEM RESPONSÁVEL'}*\n`;
    g.its.forEach(i=>{const av=avisoN(i),fl=flag(i);
      t+=`${ST[i.status].e} *${tipoInfo(i.tipo).sh}* · ${title(i.municipio)} (base ${title(i.base)}) · nota ${i.nota}`+((i.status==='PCP'||i.status==='PFP')&&i.prazo?` · prazo ${brShort(i.prazo)}`:'')+(fl?` · ${av}º aviso`:'')+(i.obs?`\n    _${i.obs}_`:'')+'\n';});
  }
  return t.trim();
}

/* ---------- entrada (escolha da superintendência) ---------- */
function showGate(msg){
  $('gate').style.display='flex'; $('gErr').textContent=msg||'';
  const kw=kwFromLink()||lsGet('kw','');
  $('kwBox').style.display=ghConfigured()&&!(TOKEN&&DKEY)&&!kw?'':'none';
  $('regBtns').innerHTML=CFG.regioes.map(r=>`<button data-r="${r.id}">${esc(r.nome)}<small>${esc(r.regionais.map(title).join(' · '))}</small></button>`).join('');
  $('regBtns').onclick=async e=>{const b=e.target.closest('button'); if(!b) return;
    if(ghConfigured()&&!(TOKEN&&DKEY)&&!(await unlock(kw||$('kw').value))){$('gErr').textContent='Palavra-chave inválida. Abra pelo link completo ou digite a palavra-chave.'; return;}
    lsSet('regiao',b.dataset.r); start(b.dataset.r);};
}
async function start(reg){
  REGION=reg; WHO=reg.toLowerCase(); $('gate').style.display='none'; $('who').textContent=regLabel();
  setSync(ghOn()?'run':'pend',SANDBOX?'Modo exemplo':ghOn()?'Conectando…':'Salvo neste navegador');
  renderAll();
  if(ghOn()){ await pull(); if(S.dirty||S.events.length||S.snaps.length) push(); }
}

/* ---------- inicialização ---------- */
(async function init(){
  await loadCfg(); loadData(); brand(); wireModals();
  sandboxUI(()=>REGION||lsGet('regiao',null));
  S.ui.fmt=FMT[S.ui.fmt]?S.ui.fmt:'45'; S.ui.cw=S.ui.cw||1080; S.ui.ch=S.ui.ch||1920;
  const rows=$('rows');
  rows.addEventListener('change',e=>{const tr=e.target.closest('tr'), f=e.target.dataset.f; if(!tr||!f) return; const it=S.items.find(x=>x.id===tr.dataset.id);
    let v=e.target.value; if(f==='municipio') v=v.trim();
    const before={...it};
    if(!applyField(it,f,v)){ e.target.value=before[f]||''; e.target.closest('td').classList.add('bad'); toast(`"${v}" não está cadastrado na superintendência ${regLabel()}${it.base?' / base '+title(it.base):''}. Escolha um da lista.`,4500); return; }
    const changed=['tipo','municipio','base','regional','resp','status','prazo','nota','conta','canal','obs'].filter(k=>before[k]!==it[k]); if(!changed.length) return;
    changed.forEach(k=>logEv(k==='status'?'status':'alterado',it,{campo:k,de:before[k]??'',para:it[k]}));
    if(f==='resp') S.ui.lastResp=v;
    touch(it); refreshRow(it); renderGridCount(); clearTimeout(rT); rT=setTimeout(renderCard,120);});
  rows.addEventListener('click',e=>{const tr=e.target.closest('tr'); if(!tr||!tr.dataset.id) return; const it=S.items.find(x=>x.id===tr.dataset.id); const b=e.target.closest('button'); if(!b) return;
    if(b.dataset.av){it.adj=(it.adj||0)+(+b.dataset.av); if(avisoN(it)<1) it.adj++; logEv('aviso_ajuste',it,{para:avisoN(it)}); touch(it); renderAll();}
    if(b.hasAttribute('data-res')){logEv('status',it,{de:it.status,para:'RES'}); it.statusAnt=it.status; it.status='RES'; it.resolvido=Date.now(); touch(it); renderAll();}
    if(b.hasAttribute('data-undo')){logEv('status',it,{de:'RES',para:it.statusAnt||'PSR'}); it.status=it.statusAnt||'PSR'; it.resolvido=null; touch(it); renderAll();}
    if(b.hasAttribute('data-del')){ if(b.classList.contains('arm')){it.del=true; logEv('excluido',it); touch(it); renderAll();}
      else{b.classList.add('arm'); b.title='Clique de novo para excluir'; setTimeout(()=>{if(b.isConnected){b.classList.remove('arm');b.title='Excluir';}},2500);} }});
  rows.addEventListener('keydown',e=>{ if(e.key!=='Enter'||e.target.tagName==='BUTTON') return; e.preventDefault();
    const f=e.target.dataset.f, id=e.target.closest('tr').dataset.id; e.target.dispatchEvent(new Event('change',{bubbles:true}));
    const tr=document.querySelector(`tr[data-id="${id}"]`); let nx=tr&&tr.nextElementSibling;
    if(!nx){const it=S.items.find(x=>x.id===id); if(!it||(!it.nota&&!it.municipio)) return; addRow(false); nx=$('rows').lastElementChild;}
    const el=nx.querySelector(`[data-f="${f}"]`); el&&el.focus(); });
  rows.addEventListener('paste',e=>{const t=(e.clipboardData||{}).getData?.('text')||''; if(/[\t\n]/.test(t.trim())){e.preventDefault(); importRows(t.replace(/\r/g,'').split('\n').filter(l=>l.trim()).map(l=>l.split('\t')));}});
  $('paste').addEventListener('paste',()=>setTimeout(()=>{importRows($('paste').value.replace(/\r/g,'').split('\n').filter(l=>l.trim()).map(l=>l.split('\t'))); $('paste').value='';},30));
  $('btnAdd').onclick=()=>addRow();
  $('btnXls').onclick=exportXlsx;
  $('fileImp').onchange=async e=>{const f=e.target.files[0]; if(f) await importFile(f); e.target.value='';};
  // redimensionar colunas
  let rz=null;
  document.addEventListener('mousedown',e=>{const h=e.target.closest('.rz'); if(!h) return; const th=h.parentElement; rz={k:th.dataset.k,x:e.clientX,w:th.offsetWidth,h}; h.classList.add('on'); e.preventDefault();});
  document.addEventListener('mousemove',e=>{ if(!rz) return; const w=Math.max(60,rz.w+e.clientX-rz.x); S.ui.colw=S.ui.colw||{}; S.ui.colw[rz.k]=w;
    $('cg').children[COLS.findIndex(c=>c.k===rz.k)].style.width=w+'px'; $('grid').style.width=COLS.reduce((a,c)=>a+colW(c),0)+'px';});
  document.addEventListener('mouseup',()=>{ if(rz){rz.h.classList.remove('on'); rz=null; saveData();} });
  // card
  const sf=$('segFmt'); sf.innerHTML=Object.entries(FMT).map(([k,v])=>`<button type="button" data-v="${k}">${v.l}</button>`).join('');
  $('cw').value=S.ui.cw; $('ch').value=S.ui.ch; $('split').checked=!!S.ui.split;
  const pf=()=>{sf.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v===S.ui.fmt)); $('cusBox').style.display=S.ui.fmt==='cus'?'':'none';}; pf();
  sf.onclick=e=>{const b=e.target.closest('button'); if(b){S.ui.fmt=b.dataset.v; pf(); saveData(); renderCard();}};
  ['cw','ch'].forEach(id=>$(id).onchange=e=>{S.ui[id]=Math.max(300,+e.target.value||1080); e.target.value=S.ui[id]; saveData(); renderCard();});
  $('split').onchange=e=>{S.ui.split=e.target.checked; saveData(); renderCard();};
  $('btnJpg').onclick=exportAll;
  $('imgs').addEventListener('click',async e=>{
    const d=e.target.closest('[data-dl]'); if(d) registerSend(shots[+d.dataset.dl].ids);
    const b=e.target.closest('[data-cp]'); if(b){try{await navigator.clipboard.write([new ClipboardItem({'image/png':shots[+b.dataset.cp].png})]); registerSend(shots[+b.dataset.cp].ids); toast('Imagem copiada. Cole no WhatsApp.');}
      catch(_){toast('Cópia bloqueada: botão direito na imagem → Copiar imagem');}}});
  $('btnTxt').onclick=()=>{$('mTxtEl').textContent=makeText(); $('mTxt').classList.add('on');};
  $('mTxtCopy').onclick=async()=>{try{await navigator.clipboard.writeText($('mTxtEl').textContent); registerSend(ready().map(i=>i.id)); toast('Texto copiado');}
    catch(_){const r=document.createRange(); r.selectNodeContents($('mTxtEl')); getSelection().removeAllRanges(); getSelection().addRange(r); toast('Texto selecionado: Ctrl+C');}};
  // topo
  $('btnTroca').onclick=()=>SANDBOX?toast('Saia do modo exemplo para trocar de superintendência'):showGate();
  $('btnHelp').onclick=()=>openHelp();
  $('syncBtn').onclick=()=>{ if(ghOn()) (S.dirty||S.events.length||S.snaps.length?push():pull()); else toast(SANDBOX?'Modo exemplo: nada é enviado ao repositório.':'Os dados estão só neste navegador.',4000); };
  $('lnkBI').href='dados/'+(location.hash||'');
  addEventListener('resize',()=>{$('resInfo').textContent=fitPreview($('pv'),S.ui);});
  setInterval(()=>{ if(REGION&&ghOn()&&!S.dirty&&!busy&&document.visibilityState==='visible'&&Date.now()-S.lastPull>90e3) pull(true); },30e3);
  addEventListener('beforeunload',e=>{ if(ghOn()&&(S.dirty||S.events.length)){e.preventDefault(); e.returnValue='';} });

  if(SANDBOX) return start(SANDBOX.reg);
  const reg=lsGet('regiao',null);
  if(reg&&REG(reg)&&(!ghConfigured()||await unlock(kwFromLink()||lsGet('kw','')))) return start(reg);
  showGate();
})();
function renderGridCount(){const v=visible(); const pend=v.filter(i=>i.status!=='RES').length, res=v.length-pend, inc=v.filter(i=>missing(i).length).length;
  $('cnt').innerHTML=v.length?`${pend} pendente(s)${res?` · ${res} resolvida(s) aguardando envio`:''}${inc?` · <span style="color:#b42318">${inc} incompleta(s), fora do card</span>`:''}`:'';}
