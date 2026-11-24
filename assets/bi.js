/* =====================================================================
   Painel (BI) e auditoria
   ===================================================================== */
WHO='painel';
let HIST={events:[],snaps:[]};
const F={per:'30',de:'',ate:'',reg:'',rg:'',base:'',resp:'',tipo:''}; let DEF_REG='';
const fmtN=n=>Number(n).toLocaleString('pt-BR');
const pct=(a,b)=>b?Math.round(a/b*100)+'%':'—';

/* ---------- filtros ---------- */
function period(){ const t=todayISO();
  if(F.per==='all') return ['0000-01-01',t];
  if(F.per==='cus') return [F.de||'0000-01-01',F.ate||t];
  return [isoDay(Date.now()-(+F.per-1)*864e5),t]; }
const inPer=(d,[a,b])=>d&&d>=a&&d<=b;
const matchIt=x=>(!F.reg||x.regiao===F.reg)&&(!F.rg||x.regional===F.rg)&&(!F.base||x.base===F.base)&&(!F.resp||(x.resp||'')===F.resp)&&(!F.tipo||tipoInfo(x.tipo).k===F.tipo);
function fillFilters(){
  const sel=(id,list,val,lab=x=>x,all='Todas')=>{$(id).innerHTML=`<option value="">${all}</option>`+list.map(v=>`<option value="${esc(v)}" ${v===val?'selected':''}>${esc(lab(v))}</option>`).join('');};
  sel('fReg',CFG.regioes.map(r=>r.id),F.reg,id=>REG(id).nome);
  sel('fRg',regionaisOf(F.reg||null),F.rg,title);
  sel('fBase',basesOf(F.reg||null,{rg:F.rg}),F.base,title);
  sel('fResp',RESPS,F.resp,title,'Todos');
  sel('fTipo',TIPOS.map(t=>t.k),F.tipo,k=>TK(k).g,'Todos');
  $('fCus').style.display=F.per==='cus'?'':'none';
}

/* ---------- dica ao passar o mouse ---------- */
document.addEventListener('mousemove',e=>{const t=e.target.closest('[data-tip]'), tip=$('tip'); if(!t){tip.style.display='none';return;}
  tip.innerHTML=t.dataset.tip; tip.style.display='block'; const w=tip.offsetWidth; tip.style.left=Math.min(innerWidth-w-8,e.clientX+12)+'px'; tip.style.top=(e.clientY+14)+'px';});

/* ---------- gráficos ---------- */
const NAVY='#2f4b7c';
function bars(el,rows,{color=NAVY,unit=''}={}){ // rows: [{l,v,c?,tip?}]
  if(!rows.length){el.innerHTML='<div class="hint">Sem dados no período.</div>';return;}
  const max=Math.max(...rows.map(r=>r.v),1);
  el.innerHTML=`<div class="bars">${rows.map(r=>`<div class="brow" data-tip="${esc(r.tip||`${r.l}: <b>${fmtN(r.v)}</b>${unit}`)}"><span class="nm" title="${esc(r.l)}">${esc(r.l)}</span><span class="tr"><span class="fl" style="display:block;width:${r.v/max*100}%;background:${r.c||color}"></span></span><span class="vl">${fmtN(r.v)}</span></div>`).join('')}</div>`;
}
function stacked(el,rows,keys){ // rows: [{l,parts:{k:v}}], keys: [{k,l,c}]
  const max=Math.max(...rows.map(r=>keys.reduce((a,k)=>a+(r.parts[k.k]||0),0)),1);
  el.innerHTML=`<div class="lg">${keys.map(k=>`<span><i style="background:${k.c}"></i>${k.l}</span>`).join('')}</div><div class="bars">${rows.map(r=>{const tot=keys.reduce((a,k)=>a+(r.parts[k.k]||0),0);
    return `<div class="brow stk"><span class="nm">${esc(r.l)}</span><span class="tr" style="width:${tot/max*100}%">${keys.filter(k=>r.parts[k.k]).map(k=>`<div style="flex:${r.parts[k.k]};background:${k.c}" data-tip="${esc(r.l)} · ${k.l}: <b>${r.parts[k.k]}</b>"></div>`).join('')}</span><span class="vl">${tot}</span></div>`;}).join('')}</div>`;
}
function lines(el,labels,series){ // series: [{l,c,v:[]}]
  const W=Math.max(el.clientWidth,320), H=220, P={l:34,r:70,t:10,b:26}, n=labels.length, max=Math.max(...series.flatMap(s=>s.v),1);
  const x=i=>P.l+(n<2?0:i*(W-P.l-P.r)/(n-1)), y=v=>P.t+(H-P.t-P.b)*(1-v/max);
  const ticks=[0,Math.ceil(max/2),max];
  let s=`<svg width="${W}" height="${H}" style="display:block">`;
  ticks.forEach(t=>{s+=`<line x1="${P.l}" x2="${W-P.r}" y1="${y(t)}" y2="${y(t)}" stroke="#eef0f3"/><text x="${P.l-6}" y="${y(t)+4}" font-size="11" fill="#98a2b3" text-anchor="end">${t}</text>`;});
  const step=Math.ceil(n/8); labels.forEach((l,i)=>{if(i%step===0||i===n-1) s+=`<text x="${x(i)}" y="${H-8}" font-size="11" fill="#98a2b3" text-anchor="middle">${esc(l)}</text>`;});
  series.forEach(se=>{s+=`<polyline fill="none" stroke="${se.c}" stroke-width="2" points="${se.v.map((v,i)=>x(i)+','+y(v)).join(' ')}"/>`;
    se.v.forEach((v,i)=>{s+=`<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${se.c}"/>`;});
    s+=`<text x="${x(n-1)+8}" y="${y(se.v[n-1])+4}" font-size="12" fill="#344054">${esc(se.l)}</text>`;});
  const bw=n<2?W:(W-P.l-P.r)/(n-1);
  labels.forEach((l,i)=>{s+=`<rect class="hov" x="${x(i)-bw/2}" y="${P.t}" width="${bw}" height="${H-P.t-P.b}" data-tip="${esc(l)}<br>${series.map(se=>`${se.l}: <b>${se.v[i]}</b>`).join('<br>')}"/>`;});
  el.innerHTML=s+'</svg>'+`<div class="lg" style="margin:6px 0 0">${series.map(se=>`<span><i style="background:${se.c}"></i>${se.l}</span>`).join('')}</div>`;
}
function heat(v,max){ // azul sequencial, claro → escuro
  const t=max?v/max:0, a=[238,243,251], b=[31,78,140], c=a.map((x,i)=>Math.round(x+(b[i]-x)*t));
  return {bg:v?`rgb(${c})`:'#f6f7f9',fg:t>.55?'#fff':'#344054'};
}

/* ---------- painel ---------- */
function render(){
  fillFilters(); const P=period(), items=S.items.filter(i=>!i.del&&matchIt(i)), evs=HIST.events.filter(e=>matchIt(e)&&inPer(e.ts.slice(0,10),P));
  const rec=items.filter(i=>inPer(i.criado,P)), res=items.filter(i=>i.resolvido&&inPer(isoDay(i.resolvido),P)), open=items.filter(i=>!i.arq&&i.status!=='RES');
  const reav=evs.filter(e=>e.ev==='envio'&&e.aviso>=2);
  const ttr=res.length?(res.reduce((a,i)=>a+Math.max(0,daysBetween(i.criado,isoDay(i.resolvido))),0)/res.length):null;
  const snaps=HIST.snaps.filter(s=>inPer(s.ts.slice(0,10),P)&&(!F.reg||s.escopo===F.reg));
  const k3=rec.filter(i=>avisosDados(i)>=3).length;
  $('kpis').innerHTML=[
    [fmtN(rec.length),'Recebidas no período'],[fmtN(res.length),'Resolvidas no período'],[fmtN(open.length),'Abertas agora'],
    [ttr==null?'—':ttr.toLocaleString('pt-BR',{maximumFractionDigits:1})+' d','Tempo médio até resolver'],
    [fmtN(reav.length),'Reavisos no período','envios a partir do 2º aviso'],[pct(k3,rec.length),'Chegaram ao 3º aviso','das recebidas no período'],[fmtN(snaps.length),'Cards enviados']
  ].map(([v,l,d])=>`<div class="kpi"><div class="v">${v}</div><div class="l">${l}</div>${d?`<div class="d">${d}</div>`:''}</div>`).join('');
  const cnt=(arr,key)=>{const m={}; arr.forEach(x=>{const k=key(x)||'(vazio)'; m[k]=(m[k]||0)+1;}); return Object.entries(m).sort((a,b)=>b[1]-a[1]);};
  bars($('cResp'),cnt(reav,e=>e.resp).map(([l,v])=>({l:title(l),v})),{unit:' reavisos'});
  bars($('cBase'),cnt(reav,e=>e.base).slice(0,12).map(([l,v])=>({l:title(l),v})),{unit:' reavisos'});
  bars($('cTipo'),TIPOS.map(t=>({l:t.g,v:rec.filter(i=>tipoInfo(i.tipo).k===t.k).length,c:t.bg})).filter(r=>r.v).sort((a,b)=>b.v-a.v));
  // recebidas × resolvidas (por dia ou semana)
  const [a,b]=P[0]==='0000-01-01'?[rec.concat(res).map(i=>i.criado).sort()[0]||todayISO(),P[1]]:P;
  const span=daysBetween(a,b)+1, weekly=span>21, keys=[], lab=[];
  const bucket=d=>{if(!weekly) return d; const dt=new Date(d+'T12:00'); dt.setDate(dt.getDate()-((dt.getDay()+6)%7)); return isoDay(dt);};
  for(let d=new Date(a+'T12:00');isoDay(d)<=b;d.setDate(d.getDate()+1)){const k=bucket(isoDay(d)); if(!keys.includes(k)){keys.push(k); lab.push(brShort(k));}}
  const ser=(arr,f)=>keys.map(k=>arr.filter(i=>bucket(f(i))===k).length);
  $('cWkSub').textContent=weekly?'Por semana (a data é a segunda-feira)':'Por dia';
  lines($('cWk'),lab,[{l:'Recebidas',c:NAVY,v:ser(rec,i=>i.criado)},{l:'Resolvidas',c:'#2e9d6a',v:ser(res,i=>isoDay(i.resolvido))}]);
  // mapa base × tipo
  const bases=cnt(rec,i=>i.base).map(x=>x[0]); const tps=TIPOS.filter(t=>rec.some(i=>tipoInfo(i.tipo).k===t.k));
  const cell=(bs,t)=>rec.filter(i=>i.base===bs&&tipoInfo(i.tipo).k===t.k).length; const mx=Math.max(1,...bases.flatMap(bs=>tps.map(t=>cell(bs,t))));
  $('cHm').innerHTML=bases.length?`<table class="hm"><tr><th class="rl">Base</th>${tps.map(t=>`<th>${t.sh}</th>`).join('')}<th>Total</th></tr>${bases.map(bs=>`<tr><td class="rl">${esc(title(bs))}</td>${tps.map(t=>{const v=cell(bs,t),h=heat(v,mx);return `<td style="background:${h.bg};color:${h.fg}" data-tip="${esc(title(bs))} · ${t.g}: <b>${v}</b>">${v||''}</td>`;}).join('')}<td class="tot">${rec.filter(i=>i.base===bs).length}</td></tr>`).join('')}</table>`:'<div class="hint">Sem dados no período.</div>';
  // envelhecimento
  const age=i=>daysBetween(i.criado,todayISO()), bk=[['0 a 2 dias',0,2],['3 a 5 dias',3,5],['6 a 10 dias',6,10],['11 a 20 dias',11,20],['Mais de 20',21,1e9]];
  stacked($('cAge'),bk.map(([l,x,y])=>{const g=open.filter(i=>age(i)>=x&&age(i)<=y); return {l,parts:{PSR:g.filter(i=>i.status==='PSR').length,PFP:g.filter(i=>i.status==='PFP').length,PCP:g.filter(i=>i.status==='PCP').length}};}),
    ['PSR','PFP','PCP'].map(k=>({k,l:ST[k].k,c:ST[k].c})));
  // contas repetidas
  const cc=cnt(rec.filter(i=>i.conta),i=>i.conta).filter(x=>x[1]>1).slice(0,15);
  $('cConta').innerHTML=cc.length?`<table class="tb"><tr><th>Conta</th><th>Demandas</th><th>Município</th><th>Tipos</th><th>Última</th></tr>${cc.map(([c,n])=>{const l=rec.filter(i=>i.conta===c).sort((x,y)=>y.criado.localeCompare(x.criado));
    return `<tr><td style="font-variant-numeric:tabular-nums">${esc(c)}</td><td><b>${n}</b></td><td>${esc(uniq(l.map(i=>title(i.municipio))).join(', '))}</td><td>${esc(uniq(l.map(i=>tipoInfo(i.tipo).sh)).join(', '))}</td><td>${br(l[0].criado)}</td></tr>`;}).join('')}</table>`:'<div class="hint">Nenhuma conta repetida no período.</div>';
  cardInfo();
}

/* ---------- card do dia (remonta a imagem a partir do registro dos envios) ---------- */
const CDUI={fmt:'45'};
function daySnaps(){const d=$('cdDia').value, r=$('cdReg').value; return HIST.snaps.filter(s=>s.ts&&isoDay(s.ts)===d&&s.escopo===r).sort((a,b)=>a.ts.localeCompare(b.ts));}
function cardInfo(){
  const ss=daySnaps(); if(!ss.length){$('cdInfo').textContent='Nenhum card enviado nesse dia para essa superintendência.'; $('cdPv').innerHTML=''; return;}
  $('cdInfo').textContent=`${ss.length} envio(s): `+ss.map(s=>new Date(s.ts).toTimeString().slice(0,5)).join(', ')+'. A imagem junta as demandas enviadas no dia, com o status e o aviso daquele momento.';
  const m=new Map(); ss.forEach(s=>s.itens.forEach(i=>m.set(i.id,i)));
  const items=[...m.values()].map(i=>({...i,tipo:tipoInfo(i.tipo).v,_aviso:i.aviso==null?1:i.aviso,avisos:[]}));
  const sets=cardSets(items,REG($('cdReg').value).nome,{split:$('cdSplit').checked,dt:$('cdDia').value,ui:CDUI});
  $('cdPv').innerHTML=sets.flatMap(s=>s.pages).map(p=>`<div class="pv-wrap"><div class="pv-inner">${p.html}</div></div>`).join(''); fitPreview($('cdPv'),CDUI);
}
async function cardExport(){
  const nodes=[...$('cdPv').querySelectorAll('.pg')]; if(!nodes.length) return toast('Nada para exportar nesse dia');
  const bt=$('cdGo'); bt.disabled=true; bt.textContent='Gerando…';
  for(let i=0;i<nodes.length;i++){const im=await toImage(nodes[i],CDUI); const a=document.createElement('a'); a.href=im.jpg; a.download=`reincidencia_${norm(REG($('cdReg').value).nome).toLowerCase()}_${$('cdDia').value}${nodes.length>1?'_'+(i+1):''}.jpg`; document.body.appendChild(a); a.click(); a.remove();}
  bt.disabled=false; bt.textContent='Gerar imagem';
}

/* =====================================================================
   AUDITORIA
   ===================================================================== */
const ACOLS=[
  {k:'regiao',l:'Superintendência',w:120},{k:'tipo',l:'Tipo',w:200},{k:'municipio',l:'Município',w:190},{k:'base',l:'Base',w:150},{k:'regional',l:'Regional',w:130},
  {k:'nota',l:'Nº da nota',w:115},{k:'conta',l:'Conta',w:115},{k:'resp',l:'Responsável',w:140},{k:'status',l:'Status',w:140},{k:'prazo',l:'Prazo',w:135},{k:'canal',l:'Canal',w:110},
  {k:'avisos',l:'Avisos',w:70},{k:'criado',l:'Registrada',w:135},{k:'resolvido',l:'Resolvida em',w:135},{k:'arq',l:'Arquiv.',w:64},{k:'del',l:'Excl.',w:56},{k:'obs',l:'Relato',w:220},{k:'por',l:'Alterada por',w:110}];
const aOpts=(list,val,lab=x=>x)=>'<option value=""></option>'+[...list,...(val&&!list.includes(val)?[val]:[])].map(v=>`<option value="${esc(v)}" ${v===val?'selected':''}>${esc(lab(v))}</option>`).join('');
function audList(){const q=norm($('aBusca').value), r=$('aReg').value, s=$('aSit').value;
  return S.items.filter(i=>(!r||i.regiao===r)&&(s==='all'||(s==='ativas'&&!i.arq&&!i.del)||(s==='arq'&&i.arq&&!i.del)||(s==='del'&&i.del))&&(!q||norm([i.nota,i.conta,i.municipio,i.base,i.obs].join(' ')).includes(q)))
    .sort((a,b)=>(b.criado||'').localeCompare(a.criado||''));}
function audRow(it){
  const c={
    regiao:`<select data-f="regiao">${CFG.regioes.map(r=>`<option value="${r.id}" ${r.id===it.regiao?'selected':''}>${esc(r.nome)}</option>`).join('')}</select>`,
    tipo:`<select data-f="tipo">${aOpts(TIPOS.map(t=>t.v),it.tipo,v=>tipoInfo(v).g)}</select>`,
    municipio:`<input data-f="municipio" value="${esc(it.municipio||'')}" list="aDlMun">`,
    base:`<select data-f="base">${aOpts(basesOf(it.regiao),it.base,title)}</select>`,
    regional:`<select data-f="regional">${aOpts(regionaisOf(it.regiao),it.regional,title)}</select>`,
    nota:`<input data-f="nota" value="${esc(it.nota||'')}">`, conta:`<input data-f="conta" value="${esc(it.conta||'')}">`,
    resp:`<select data-f="resp">${aOpts(RESPS,it.resp,title)}</select>`,
    status:`<select data-f="status" style="color:${(ST[it.status]||ST.PSR).c};font-weight:600">${Object.keys(ST).map(k=>`<option value="${k}" ${k===it.status?'selected':''}>${ST[k].k}</option>`).join('')}</select>`,
    prazo:`<input type="date" data-f="prazo" value="${esc(it.prazo||'')}">`, canal:`<select data-f="canal">${aOpts(CANAIS,it.canal,title)}</select>`,
    avisos:`<input type="number" min="0" data-f="avisos" value="${avisosDados(it)}">`,
    criado:`<input type="date" data-f="criado" value="${esc(it.criado||'')}">`, resolvido:`<input type="date" data-f="resolvido" value="${it.resolvido?isoDay(it.resolvido):''}">`,
    arq:`<input type="checkbox" data-f="arq" ${it.arq?'checked':''}>`, del:`<input type="checkbox" data-f="del" ${it.del?'checked':''}>`,
    obs:`<input data-f="obs" value="${esc(it.obs||'')}" title="${esc(it.obs||'')}">`, por:`<span class="ro">${esc(it.por||'')}${it.exemplo?' · exemplo':''}</span>`};
  return `<tr data-id="${it.id}" class="${it.del||it.arq?'off':''}">${ACOLS.map(a=>`<td ${a.k==='por'?'class="ro"':''}>${c[a.k]}</td>`).join('')}</tr>`;
}
function renderAud(){
  $('aCg').innerHTML=ACOLS.map(a=>`<col style="width:${a.w}px">`).join(''); $('aGrid').style.width=ACOLS.reduce((s,a)=>s+a.w,0)+'px';
  $('aGh').innerHTML='<tr>'+ACOLS.map(a=>`<th>${a.l}</th>`).join('')+'</tr>';
  const l=audList(); $('aCnt').textContent=`${l.length} registro(s)`;
  const show=l.slice(0,400); $('aRows').innerHTML=show.map(audRow).join('')+(l.length>400?`<tr class="empty"><td colspan="${ACOLS.length}">Mostrando 400 de ${l.length}. Use a busca para encontrar o registro.</td></tr>`:'');
  if(!$('aDlMun')) document.body.insertAdjacentHTML('beforeend',`<datalist id="aDlMun">${MUN.map(m=>`<option value="${esc(m.m)}">`).join('')}</datalist>`);
}
function audChange(e){
  const tr=e.target.closest('tr'), f=e.target.dataset.f; if(!tr||!f) return; const it=S.items.find(x=>x.id===tr.dataset.id);
  const el=e.target, old=f==='avisos'?avisosDados(it):f==='resolvido'?(it.resolvido?isoDay(it.resolvido):''):it[f]; let v=el.type==='checkbox'?el.checked:el.value;
  if(f==='municipio'){const m=findMun(v); if(!m){el.value=it.municipio||''; return toast(`"${v}" não está na base de municípios`,4000);} it.municipio=m.m; it.base=m.b; it.regional=m.rg; it.regiao=m.reg||it.regiao;}
  else if(f==='avisos'){const n=Math.max(0,parseInt(v)||0); it.adj=n-(it.avisos||[]).length;}
  else if(f==='resolvido'){it.resolvido=v?new Date(v+'T12:00').getTime():null;}
  else if(f==='status'){it.status=v; if(v==='RES'&&!it.resolvido) it.resolvido=Date.now(); if(v!=='RES') it.resolvido=null;}
  else if(f==='nota'||f==='conta'){it[f]=String(v).replace(/\D/g,'');}
  else it[f]=v;
  logEv('auditoria',it,{campo:f,de:old??'',para:f==='avisos'?avisosDados(it):v});
  touch(it); tr.outerHTML=audRow(it); render();
}
function audCsv(){
  const cols=['id','regiao','regional','base','municipio','tipo','faixa','conta_contrato','nota','responsavel','status','prazo','canal','avisos_enviados','ultimo_aviso','registrada','resolvida','arquivada','excluida','exemplo','alterada_por','atualizada','relato'];
  const iso=t=>t?new Date(t).toLocaleString('pt-BR'):'';
  download(`base_completa_${todayISO()}.csv`,csvText(cols,S.items.map(i=>[i.id,i.regiao,i.regional,i.base,i.municipio,i.tipo,tipoInfo(i.tipo).sh,i.conta,i.nota,i.resp,(ST[i.status]||{}).s||i.status,i.prazo,i.canal,
    avisosDados(i),iso((i.avisos||[]).slice(-1)[0]),i.criado,iso(i.resolvido),i.arq?'sim':'',i.del?'sim':'',i.exemplo?'sim':'',i.por||'',iso(i.upd),i.obs])),'text/csv');
}
/* ---------- configuração ---------- */
function openCfg(){
  $('cDist').value=CFG.distribuidora; $('cMail').value=CFG.contato; $('cAudPw').value='';
  $('cRegs').innerHTML=CFG.regioes.map(r=>`<div><label class="f">${esc(r.id)} · nome</label><input class="inp" data-rn="${r.id}" value="${esc(r.nome)}"><label class="f" style="margin-top:8px">Regionais (uma por linha)</label><textarea data-rg="${r.id}" style="min-height:70px">${esc(r.regionais.join('\n'))}</textarea></div>`).join('');
  $('cMun').value=munCSV(MUN); munInfo();
  $('gOwner').value=CFG.gh.owner; $('gRepo').value=CFG.gh.repo; $('gMain').value=CFG.gh.main||'main'; $('gBranch').value=CFG.gh.branch||'dados'; $('gTok').value=''; $('gKw').value='';
  ghState();
}
function collectRegs(){return CFG.regioes.map(r=>({...r,nome:document.querySelector(`[data-rn="${r.id}"]`).value.trim()||r.nome,regionais:document.querySelector(`[data-rg="${r.id}"]`).value.split('\n').map(x=>x.trim().toUpperCase()).filter(Boolean)}));}
function munInfo(){const keep=CFG.regioes; CFG.regioes=collectRegs(); const l=parseMun($('cMun').value); CFG.regioes=keep; const sem=l.filter(m=>!m.reg).length;
  $('cMunInfo').textContent=`${l.length} município(s)`+(sem?` · ${sem} com regional fora de todas as superintendências`:'');}
function ghState(){
  $('gState').textContent=CFG.gh.tok?(TOKEN?'Token configurado e aberto nesta sessão.':'Token configurado.'):'Sem repositório: os dados ficam só neste navegador.';
  $('cPub').style.display=ghOn()?'':'none';
  const kw=lsGet('kw',''), url=CFG.gh.owner&&CFG.gh.repo?`https://${CFG.gh.owner}.github.io/${CFG.gh.repo}/`:'';
  $('gLink').innerHTML=url&&CFG.gh.tok?`<div class="hint" style="margin-top:10px">Link para compartilhar:</div><div class="mono">${esc(url)}#${esc(kw?encodeURIComponent(kw):'PALAVRA-CHAVE')}</div>`:'';
}
async function collectCfg(){
  const c=JSON.parse(JSON.stringify(CFG));
  c.distribuidora=$('cDist').value.trim()||c.distribuidora; c.contato=$('cMail').value.trim()||c.contato; c.regioes=collectRegs();
  if($('cAudPw').value) c.auditoria=await hashPass($('cAudPw').value);
  c.gh.owner=$('gOwner').value.trim(); c.gh.repo=$('gRepo').value.trim(); c.gh.main=$('gMain').value.trim()||'main'; c.gh.branch=$('gBranch').value.trim()||'dados';
  const tok=$('gTok').value.trim(), kw=$('gKw').value; let nk=null;
  if(tok&&!kw) throw new Error('Informe a palavra-chave para criptografar o token');
  if(kw&&!tok&&!TOKEN) throw new Error('Informe o token');
  if(tok||kw){ if(CFG.gh.salt&&DKEY&&kw!==lsGet('kw','')) throw new Error('Trocar a palavra-chave deixaria os dados já gravados ilegíveis. Use a mesma.');
    c.gh.tok=await encryptToken(tok||TOKEN,kw); if(!c.gh.salt) c.gh.salt=b64(crypto.getRandomValues(new Uint8Array(16))); nk={t:tok||TOKEN,kw}; }
  c.rev=Date.now(); return {c,nk};
}
async function saveCfg(pub){
  let r; try{r=await collectCfg();}catch(e){return toast(e.message,4500);}
  CFG=r.c; lsSet('cfg',CFG); MUN=parseMun($('cMun').value); lsSet('mun',munCSV(MUN));
  if(r.nk){TOKEN=r.nk.t; DKEY=await aesKey(r.nk.kw,CFG.gh.salt,300000); lsSet('kw',r.nk.kw);}
  brand(); ghState(); render();
  if(pub&&ghOn()){ try{await ghCommit(CFG.gh.main||'main',{'config.json':JSON.stringify(CFG,null,1),'municipios.csv':munCSV(MUN)},'config: atualizada'); toast('Publicado. O site atualiza em 1–2 minutos.',4500);}
    catch(e){toast('Erro ao publicar: '+(e.msg||e.message),5000);} }
  else toast('Salvo neste navegador');
}

/* =====================================================================
   INICIALIZAÇÃO
   ===================================================================== */
onData=()=>render();
async function loadAll(){ setSync(ghOn()?'run':'pend',SANDBOX?'Modo exemplo':ghOn()?'Carregando…':'Dados deste navegador');
  if(ghOn()){ await pull(true); try{HIST=await pullHistory(); setSync('ok','Atualizado');}catch(e){console.error(e); setSync('err','Erro ao ler o histórico');} }
  else HIST={events:S.events,snaps:S.snaps};
  const pool=HIST.snaps.filter(s=>!F.reg||s.escopo===F.reg), last=pool.map(s=>s.ts).sort().pop();
  if(F.reg) $('cdReg').value=F.reg; if(last&&!$('cdDia').value){$('cdDia').value=isoDay(last); const ls=pool.filter(s=>s.ts===last)[0]; if(ls) $('cdReg').value=ls.escopo;}
  render();
}
(async function init(){
  await loadCfg(); loadData(); brand(); wireModals();
  // cada superintendência abre o painel já filtrado na sua (dá para trocar no filtro)
  DEF_REG=SANDBOX?SANDBOX.reg:(lsGet('regiao','')||''); F.reg=DEF_REG;
  sandboxUI(()=>F.reg||lsGet('regiao',''));
  $('cdReg').innerHTML=CFG.regioes.map(r=>`<option value="${r.id}">${esc(r.nome)}</option>`).join(''); $('cdDia').value='';
  $('aReg').innerHTML='<option value="">Todas as superintendências</option>'+CFG.regioes.map(r=>`<option value="${r.id}">${esc(r.nome)}</option>`).join('');
  // filtros
  const bind=(id,k,reset=[])=>$(id).onchange=e=>{F[k]=e.target.value; reset.forEach(x=>F[x]=''); render();};
  bind('fPer','per'); bind('fDe','de'); bind('fAte','ate'); bind('fReg','reg',['rg','base']); bind('fRg','rg',['base']); bind('fBase','base'); bind('fResp','resp'); bind('fTipo','tipo');
  $('fClear').onclick=()=>{Object.assign(F,{per:'30',de:'',ate:'',reg:DEF_REG,rg:'',base:'',resp:'',tipo:''}); $('fPer').value='30'; render();};
  ['cdDia','cdReg','cdSplit'].forEach(id=>$(id).onchange=cardInfo); $('cdGo').onclick=cardExport;
  $('btnHelp').onclick=()=>openHelp('painel');
  $('syncBtn').onclick=loadAll;
  $('lnkDem').href='../'+(location.hash||'');
  addEventListener('resize',()=>{clearTimeout(window._rz); window._rz=setTimeout(render,200);});
  // auditoria
  let audOK=false;
  $('btnAud').onclick=()=>{ if(audOK){renderAud(); $('mAud').classList.add('on'); return;} $('passErr').textContent=''; $('audPass').value=''; $('mPass').classList.add('on'); setTimeout(()=>$('audPass').focus(),50); };
  $('passForm').onsubmit=async e=>{e.preventDefault(); const h=await hashPass($('audPass').value,CFG.auditoria.s);
    if(h.h!==CFG.auditoria.h){$('passErr').textContent='Senha incorreta'; return;}
    audOK=true; WHO='auditoria'; $('mPass').classList.remove('on'); renderAud(); $('mAud').classList.add('on');};
  document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));
    ['tBase','tCfg'].forEach(t=>$(t).style.display=t===b.dataset.tab?(t==='tBase'?'flex':'block'):'none'); if(b.dataset.tab==='tCfg') openCfg();});
  ['aBusca','aReg','aSit'].forEach(id=>$(id).addEventListener('input',renderAud));
  $('aRows').addEventListener('change',audChange);
  $('aCsv').onclick=audCsv;
  $('cMun').addEventListener('input',munInfo); $('cRegs').addEventListener('input',munInfo);
  $('cSave').onclick=()=>saveCfg(false); $('cPub').onclick=()=>saveCfg(true);
  $('cDl').onclick=async()=>{let r; try{r=await collectCfg();}catch(e){return toast(e.message,4500);} download('config.json',JSON.stringify(r.c,null,1)); setTimeout(()=>download('municipios.csv',munCSV(parseMun($('cMun').value)),'text/csv'),400);};
  $('cTest').onclick=async()=>{const o=$('gOwner').value.trim()||CFG.gh.owner, r=$('gRepo').value.trim()||CFG.gh.repo, t=$('gTok').value.trim()||TOKEN;
    if(!o||!r||!t) return toast('Preencha dono, repositório e token');
    try{const res=await fetch(`https://api.github.com/repos/${o}/${r}`,{headers:{'Authorization':'Bearer '+t,'Accept':'application/vnd.github+json'}}); const j=await res.json();
      if(!res.ok) throw new Error(j.message||res.status); toast(j.permissions&&j.permissions.push?`Conexão ok com ${j.full_name}, com permissão de escrita`:'Conectou, mas o token não tem permissão de escrita',5000);}
    catch(e){toast('Falhou: '+e.message,5000);} };
  // palavra-chave
  if(!SANDBOX&&ghConfigured()&&!(await unlock(kwFromLink()||lsGet('kw','')))){ $('gate').style.display='flex';
    $('kwGo').onclick=async()=>{ if(await unlock($('kw').value)){$('gate').style.display='none'; loadAll();} else $('gErr').textContent='Palavra-chave inválida'; }; return; }
  loadAll();
})();
