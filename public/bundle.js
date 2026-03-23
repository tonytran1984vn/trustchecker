var vt=Object.defineProperty;var I=(t,s)=>()=>(t&&(s=t(t=0)),s);var W=(t,s)=>{for(var a in s)vt(t,a,{get:s[a],enumerable:!0})};function G(){pt()}var k,pt,B=I(()=>{k={page:"dashboard",user:JSON.parse(localStorage.getItem("tc_user")||"null"),dashboardStats:null,products:[],fraudAlerts:[],scanHistory:[],blockchain:null,events:[],ws:null,modal:null,scanResult:null,toasts:[],scmDashboard:null,scmInventory:null,scmShipments:null,scmPartners:null,scmLeaks:null,scmGraph:null,scmOptimization:null,scmForecast:null,scmSlaViolations:null,kycData:null,evidenceData:null,stakeholderData:null,billingData:null,publicData:null,notifications:JSON.parse(localStorage.getItem("tc_notifications")||"[]"),notifOpen:!1,searchOpen:!1,searchQuery:"",searchResults:null,integrationsSchema:null,integrationsData:null,featureFlags:JSON.parse(localStorage.getItem("tc_features")||"{}"),branding:JSON.parse(localStorage.getItem("tc_branding")||"null"),plan:"free",org:null,brandingData:null},pt=()=>{};window.State=k});function ut(t){if(!t||typeof t!="string")return!1;let s=t.split(".");return s.length===3&&s.every(a=>a.length>0)}var O,mt,gt,T,H,U=I(()=>{B();O="_c:",mt=30,gt=120,T={_key(t){return O+t},get(t){try{let s=sessionStorage.getItem(this._key(t));if(!s)return null;let{data:a,ts:e,ttl:i}=JSON.parse(s),l=(Date.now()-e)/1e3;return{data:a,age:l,ttl:i,stale:l>i}}catch{return null}},set(t,s,a){try{sessionStorage.setItem(this._key(t),JSON.stringify({data:s,ts:Date.now(),ttl:a}))}catch(e){if(e.name==="QuotaExceededError"){this.prune();try{sessionStorage.setItem(this._key(t),JSON.stringify({data:s,ts:Date.now(),ttl:a}))}catch{}}}},invalidate(t){sessionStorage.removeItem(this._key(t));let s=t.split("/").filter(Boolean);if(s.length>=2){let a="/"+s.slice(0,-1).join("/")+"/bundle";sessionStorage.removeItem(this._key(a))}},clear(){let t=[];for(let s=0;s<sessionStorage.length;s++){let a=sessionStorage.key(s);a?.startsWith(O)&&t.push(a)}t.forEach(s=>sessionStorage.removeItem(s))},prune(){let t=[];for(let a=0;a<sessionStorage.length;a++){let e=sessionStorage.key(a);if(e?.startsWith(O))try{let{ts:i}=JSON.parse(sessionStorage.getItem(e));t.push({key:e,ts:i})}catch{}}t.sort((a,e)=>a.ts-e.ts);let s=Math.ceil(t.length*.3);t.slice(0,s).forEach(a=>sessionStorage.removeItem(a.key))},ttlFor(t){return t.includes("/bundle")?gt:mt}},H={base:(()=>{let s=window.location.pathname.split("/").filter(Boolean),a=s.length>0&&!s[0].includes(".")?"/"+s[0]:"";return window.location.origin+a+"/api"})(),token:(()=>{let t=sessionStorage.getItem("tc_token");return ut(t)?t:null})(),refreshToken:sessionStorage.getItem("tc_refresh"),_refreshing:null,async request(t,s,a,e){let i={method:t,headers:{"Content-Type":"application/json"}};this.token&&(i.headers.Authorization=`Bearer ${this.token}`),a&&(i.body=JSON.stringify(a));let l=await fetch(this.base+s,i),o=await l.json();if(l.status===401&&o.code==="TOKEN_EXPIRED"&&!e&&this.refreshToken)return await this.doRefresh(),this.request(t,s,a,!0);if(!l.ok)throw new Error(o.error||"Request failed");return o},async doRefresh(){if(this._refreshing)return this._refreshing;this._refreshing=(async()=>{try{let t=await fetch(this.base+"/auth/refresh",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refresh_token:this.refreshToken})}),s=await t.json();if(!t.ok)throw new Error(s.error);this.setToken(s.token,s.refresh_token)}catch(t){console.error("Token refresh failed:",t),this.clearToken(),k.user=null,G()}})(),await this._refreshing,this._refreshing=null},get(t,s){let a=s?.ttl??T.ttlFor(t);if(s?.noCache)return this.request("GET",t);let e=T.get(t);if(e&&!e.stale)return Promise.resolve(e.data);let i=this.request("GET",t).then(l=>(T.set(t,l,a),l));return e&&e.stale?(i.catch(()=>{}),Promise.resolve(e.data)):i},post(t,s){return T.invalidate(t),this.request("POST",t,s)},put(t,s){return T.invalidate(t),this.request("PUT",t,s)},patch(t,s){return T.invalidate(t),this.request("PATCH",t,s)},delete(t){return T.invalidate(t),this.request("DELETE",t)},setToken(t,s){this.token=t,sessionStorage.setItem("tc_token",t),s&&(this.refreshToken=s,sessionStorage.setItem("tc_refresh",s))},clearToken(){this.token=null,this.refreshToken=null,T.clear(),sessionStorage.removeItem("tc_token"),sessionStorage.removeItem("tc_refresh"),sessionStorage.removeItem("tc_user")}};window.API=H});var K={};W(K,{renderPage:()=>yt});function ft(t){return Q[t]||{icon:"\u25CF",color:"#94a3b8",label:t||"Unknown",tier:2}}function V(t){return t==null?"#475569":t<=10?"#22c55e":t<=20?"#84cc16":t<=35?"#f59e0b":t<=50?"#f97316":"#ef4444"}function q(t){return t==null?"#475569":t>=85?"#22c55e":t>=70?"#f59e0b":t>=50?"#f97316":"#ef4444"}function ht(t){return t==null?"gray":t<=10?"green":t<=20?"lime":t<=35?"yellow":t<=50?"orange":"red"}function yt(){let t=k.networkGraph?.graph,s=k.networkStats;if(!t)return'<div id="scm-network-root" style="padding:40px;text-align:center;color:var(--text-muted)"><div class="spinner" style="margin:0 auto 12px"></div>Loading network graph\u2026</div>';let a=t?.nodes?.length||0,e=t?.edges?.length||0,i=(t.nodes||[]).filter(d=>d.trustScore),l=i.length?Math.round(i.reduce((d,b)=>d+b.trustScore,0)/i.length):0,o=(t.edges||[]).filter(d=>d.risk_score>25).length;return setTimeout(()=>bt(),60),`<div id="scm-network-root">
    <div class="scng-stats-row">
      <div class="scng-stat-card"><div class="scng-stat-value">${a}</div><div class="scng-stat-label">Nodes</div></div>
      <div class="scng-stat-card"><div class="scng-stat-value">${e}</div><div class="scng-stat-label">Connections</div></div>
      <div class="scng-stat-card"><div class="scng-stat-value" style="color:${q(l)}">${l||"\u2014"}</div><div class="scng-stat-label">Avg Trust</div></div>
      <div class="scng-stat-card"><div class="scng-stat-value" style="color:${o>0?"#f59e0b":"#22c55e"}">${o}</div><div class="scng-stat-label">High-Risk Links</div></div>
      <div class="scng-stat-card"><div class="scng-stat-value">${s?.network_members||0}</div><div class="scng-stat-label">Verified Partners</div></div>
    </div>

    <div class="scng-graph-container">
      <div class="scng-toolbar">
        <div class="scng-toolbar-left">
          <input type="text" class="scng-search" placeholder="Search nodes\u2026" oninput="window._scngSearch(this.value)">
          <div class="scng-filter-group">
            <button class="scng-filter-btn ${u.filter==="all"?"active":""}" onclick="window._scngFilter('all')">All</button>
            <button class="scng-filter-btn ${u.filter==="supply_chain"?"active":""}" onclick="window._scngFilter('supply_chain')">Supply Chain</button>
            <button class="scng-filter-btn ${u.filter==="partners"?"active":""}" onclick="window._scngFilter('partners')">Partners</button>
          </div>
        </div>
        <div class="scng-toolbar-right">
          <button class="scng-icon-btn" onclick="window._scngZoom(1.25)" title="Zoom In">+</button>
          <button class="scng-icon-btn" onclick="window._scngZoom(0.8)" title="Zoom Out">\u2212</button>
          <button class="scng-icon-btn" onclick="window._scngReset()" title="Reset">\u27F2</button>
        </div>
      </div>
      <div id="scng-canvas" class="scng-canvas"><svg id="scng-svg"></svg></div>
      <div class="scng-legend">
        ${["farm","processor","warehouse","port","hub","distributor","organization","supplier"].map(d=>{let b=Q[d];return`<span class="scng-legend-item"><span class="scng-legend-dot" style="background:${b.color}"></span>${b.icon} ${b.label}</span>`}).join("")}
        <span class="scng-legend-sep">\u2502</span>
        <span class="scng-legend-item"><span class="scng-legend-line" style="background:#22c55e"></span>Low Risk</span>
        <span class="scng-legend-item"><span class="scng-legend-line" style="background:#f59e0b"></span>Med Risk</span>
        <span class="scng-legend-item"><span class="scng-legend-line" style="background:#ef4444"></span>High Risk</span>
      </div>
    </div>
    <div id="scng-detail" class="scng-detail" style="display:none"></div>
    ${wt()}
  </div>`}function bt(){let t=k.networkGraph?.graph,s=document.getElementById("scng-canvas"),a=document.getElementById("scng-svg");if(!t||!s||!a)return;let e=s.clientWidth||900,i=s.clientHeight||520;a.setAttribute("viewBox",`0 0 ${e} ${i}`);let l=new Map;u.nodes=t.nodes.map(p=>{let f=ft(p.type),m={...p,_cfg:f,_r:p.isCenter?30:p.trustScore>=85?22:18,x:0,y:0,vx:0,vy:0};return l.set(p.id,m),m}),u.edges=(t.edges||[]).filter(p=>{let f=l.get(p.from_node_id),m=l.get(p.to_node_id);return f&&m?(p._s=f,p._t=m,!0):!1});let o=new Set;u.edges.forEach(p=>{o.add(p._s.id),o.add(p._t.id)});let d=u.nodes.find(p=>p.isCenter);u.nodes.forEach(p=>{!p.isCenter&&!o.has(p.id)&&d&&u.edges.push({from_node_id:d.id,to_node_id:p.id,relationship:"partner",weight:.5,risk_score:null,_s:d,_t:p,_partner:!0})});let b=[...new Set(u.nodes.map(p=>p._cfg.tier))].sort((p,f)=>p-f),v=e/(b.length+1),n={};u.nodes.forEach(p=>{let f=p._cfg.tier;n[f]||(n[f]=[]),n[f].push(p)}),b.forEach((p,f)=>{let m=n[p],w=i/(m.length+1);m.forEach((x,$)=>{x.x=v*(f+1)+(Math.random()-.5)*25,x.y=w*($+1)+(Math.random()-.5)*15})});for(let p=0;p<100;p++){let f=1-p/100;for(let m=0;m<u.nodes.length;m++)for(let w=m+1;w<u.nodes.length;w++){let x=u.nodes[m],$=u.nodes[w],M=$.x-x.x,_=$.y-x.y,P=Math.sqrt(M*M+_*_)||1,E=3500/(P*P)*f*.3,D=M/P*E,N=_/P*E;x.vx-=D,x.vy-=N,$.vx+=D,$.vy+=N}u.edges.forEach(m=>{let w=m._t.x-m._s.x,x=m._t.y-m._s.y,$=Math.sqrt(w*w+x*x)||1,M=$*.007*(m.weight||.5)*f*.3,_=w/$*M,P=x/$*M;m._s.vx+=_,m._s.vy+=P,m._t.vx-=_,m._t.vy-=P}),u.nodes.forEach(m=>{let w=b.indexOf(m._cfg.tier);w>=0&&(m.vx+=(v*(w+1)-m.x)*.04*f)}),u.nodes.forEach(m=>{m.x+=m.vx*.55,m.y+=m.vy*.55,m.vx*=.65,m.vy*=.65,m.x=Math.max(m._r+10,Math.min(e-m._r-10,m.x)),m.y=Math.max(m._r+25,Math.min(i-m._r-25,m.y))})}C(e,i),xt(e,i)}function C(t,s){let a=document.getElementById("scng-svg");if(!a)return;let{x:e,y:i,scale:l}=u.transform,o={0:"SOURCE",1:"PROCESSING",2:"STORAGE",2.5:"ORG",3:"TRANSIT",4:"HUB",5:"DISTRIBUTION"},d=`<defs>
    <marker id="ma-green" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto" fill="#22c55e"><path d="M0,0 L10,3 L0,6 Z"/></marker>
    <marker id="ma-lime" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto" fill="#84cc16"><path d="M0,0 L10,3 L0,6 Z"/></marker>
    <marker id="ma-yellow" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto" fill="#f59e0b"><path d="M0,0 L10,3 L0,6 Z"/></marker>
    <marker id="ma-orange" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto" fill="#f97316"><path d="M0,0 L10,3 L0,6 Z"/></marker>
    <marker id="ma-red" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto" fill="#ef4444"><path d="M0,0 L10,3 L0,6 Z"/></marker>
    <marker id="ma-gray" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto" fill="#64748b"><path d="M0,0 L10,3 L0,6 Z"/></marker>
    <filter id="ns"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity="0.3"/></filter>
  </defs>`;d+=`<g transform="translate(${e},${i}) scale(${l})">`;let b=[...new Set(u.nodes.map(n=>n._cfg.tier))].sort((n,p)=>n-p),v=t/(b.length+1);b.forEach((n,p)=>{let f=v*(p+1);d+=`<text x="${f}" y="18" text-anchor="middle" fill="var(--text-muted)" font-size="9" font-weight="700" opacity="0.4" letter-spacing="1.5">${o[n]||""}</text>`,d+=`<line x1="${f}" y1="26" x2="${f}" y2="${s-8}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,6" opacity="0.2"/>`}),u.edges.forEach((n,p)=>{if(!n._s||!n._t)return;let f=u.hoveredNode&&(u.hoveredNode===n._s.id||u.hoveredNode===n._t.id),m=u.hoveredNode&&!f;if(n._s._hidden||n._t._hidden)return;let w=V(n.risk_score),x=ht(n.risk_score),$=m?.08:f?1:.55,M=f?3:n._partner?1:2,_=n._t.x-n._s.x,P=n._t.y-n._s.y,E=Math.sqrt(_*_+P*P)||1,D=n._s.x+_/E*(n._s._r+2),N=n._s.y+P/E*(n._s._r+2),lt=n._t.x-_/E*(n._t._r+8),ot=n._t.y-P/E*(n._t._r+8);if(d+=`<line x1="${D}" y1="${N}" x2="${lt}" y2="${ot}" stroke="${w}" stroke-width="${M}" opacity="${$}" ${n._partner?'stroke-dasharray="4,4"':""} marker-end="url(#ma-${x})"/>`,n.risk_score!=null&&!n._partner&&!m){let dt=(n._s.x+n._t.x)/2+P/E*10,ct=(n._s.y+n._t.y)/2-_/E*10;d+=`<text x="${dt}" y="${ct}" text-anchor="middle" fill="${w}" font-size="8" font-weight="700" opacity="${f?1:.6}">${n.risk_score}</text>`}}),u.nodes.forEach(n=>{if(n._hidden)return;let p=n._cfg,f=u.selectedNode===n.id,m=u.hoveredNode===n.id,w=u.hoveredNode&&!m&&!u.edges.some(_=>_._s.id===u.hoveredNode&&_._t.id===n.id||_._t.id===u.hoveredNode&&_._s.id===n.id),x=w?.12:1,$=n._r;(f||m)&&(d+=`<circle cx="${n.x}" cy="${n.y}" r="${$+8}" fill="none" stroke="${p.color}" stroke-width="2" stroke-dasharray="4,3" opacity="0.6"><animate attributeName="stroke-dashoffset" from="0" to="14" dur="1s" repeatCount="indefinite"/></circle>`),d+=`<g class="scng-node" data-id="${n.id}" opacity="${x}" style="cursor:pointer">`,d+=`<circle cx="${n.x}" cy="${n.y}" r="${$}" fill="${p.color}" fill-opacity="0.12" stroke="${p.color}" stroke-width="${f?3:2}" filter="url(#ns)"/>`,d+=`<circle cx="${n.x}" cy="${n.y}" r="${$-2}" fill="${p.color}" fill-opacity="${n.isCenter?.7:.2}"/>`,d+=`<text x="${n.x}" y="${n.y+1}" text-anchor="middle" dominant-baseline="central" font-size="${n.isCenter?16:13}">${p.icon}</text>`;let M=(n.label||"").length>18?(n.label||"").substring(0,16)+"\u2026":n.label||"";if(d+=`<text x="${n.x}" y="${n.y+$+13}" text-anchor="middle" fill="var(--text)" font-size="8.5" font-weight="600">${M}</text>`,n.trustScore&&!n.isCenter){let _=q(n.trustScore);d+=`<rect x="${n.x+$-4}" y="${n.y-$-4}" width="24" height="14" rx="4" fill="${_}" fill-opacity="0.9"/>`,d+=`<text x="${n.x+$+8}" y="${n.y-$+7}" text-anchor="middle" fill="#fff" font-size="8" font-weight="800">${n.trustScore}</text>`}n.country&&!w&&(d+=`<text x="${n.x}" y="${n.y+$+23}" text-anchor="middle" fill="var(--text-muted)" font-size="7">${n.country}</text>`),n.isNetworkMember&&(d+=`<circle cx="${n.x+$-3}" cy="${n.y+$-3}" r="7" fill="#6366f1" stroke="var(--card-bg)" stroke-width="2"/>`,d+=`<text x="${n.x+$-3}" y="${n.y+$}" text-anchor="middle" fill="white" font-size="7" font-weight="800">\u2713</text>`),d+="</g>"}),d+="</g>",a.innerHTML=d}function xt(t,s){let a=document.getElementById("scng-svg"),e=document.getElementById("scng-canvas");if(!a||!e)return;a.addEventListener("click",o=>{let d=o.target.closest(".scng-node");if(d){let b=d.dataset.id;u.selectedNode=u.selectedNode===b?null:b,C(t,s),$t(b)}else u.selectedNode=null,document.getElementById("scng-detail").style.display="none",C(t,s)}),a.addEventListener("mouseover",o=>{let d=o.target.closest(".scng-node");d&&(u.hoveredNode=d.dataset.id,C(t,s))}),a.addEventListener("mouseout",o=>{o.target.closest(".scng-node")&&(u.hoveredNode=null,C(t,s))}),e.addEventListener("wheel",o=>{o.preventDefault(),u.transform.scale=Math.max(.3,Math.min(3,u.transform.scale*(o.deltaY>0?.9:1.1))),C(t,s)},{passive:!1});let i=!1,l={x:0,y:0};e.addEventListener("mousedown",o=>{o.target.closest(".scng-node")||(i=!0,l={x:o.clientX-u.transform.x,y:o.clientY-u.transform.y},e.style.cursor="grabbing")}),window.addEventListener("mousemove",o=>{i&&(u.transform.x=o.clientX-l.x,u.transform.y=o.clientY-l.y,C(t,s))}),window.addEventListener("mouseup",()=>{i=!1,e.style.cursor="grab"})}function $t(t){let s=document.getElementById("scng-detail"),a=u.nodes.find(o=>o.id===t);if(!s||!a){s&&(s.style.display="none");return}let e=a._cfg,i=u.edges.filter(o=>o._t.id===t),l=u.edges.filter(o=>o._s.id===t);s.style.display="block",s.innerHTML=`
    <div class="scng-dh"><span class="scng-di" style="background:${e.color}">${e.icon}</span><div><div class="scng-dn">${a.label}</div><div class="scng-dt">${e.label}${a.country?" \xB7 "+a.country:""}</div></div><button class="scng-dc" onclick="this.closest('.scng-detail').style.display='none'">\u2715</button></div>
    ${a.trustScore?`<div class="scng-dr"><span>Trust Score</span><span style="font-size:1.2rem;font-weight:800;color:${q(a.trustScore)}">${a.trustScore}</span></div>`:""}
    ${a.riskLevel?`<div class="scng-dr"><span>Risk Level</span><span class="scng-rb scng-rb-${(a.riskLevel||"").toLowerCase()}">${a.riskLevel}</span></div>`:""}
    <div style="margin-top:10px">
      <div class="scng-st">\u2B06 Inbound (${i.length})</div>
      ${i.map(o=>`<div class="scng-cr"><span>${o._s.label}</span><span class="scng-crel">${o.relationship||"\u2014"}</span>${o.risk_score!=null?`<span style="color:${V(o.risk_score)};font-weight:700;font-size:0.72rem">Risk ${o.risk_score}</span>`:""}</div>`).join("")||'<div style="font-size:0.72rem;color:var(--text-muted);font-style:italic">None</div>'}
      <div class="scng-st" style="margin-top:8px">\u2B07 Outbound (${l.length})</div>
      ${l.map(o=>`<div class="scng-cr"><span>${o._t.label}</span><span class="scng-crel">${o.relationship||"\u2014"}</span>${o.risk_score!=null?`<span style="color:${V(o.risk_score)};font-weight:700;font-size:0.72rem">Risk ${o.risk_score}</span>`:""}</div>`).join("")||'<div style="font-size:0.72rem;color:var(--text-muted);font-style:italic">None</div>'}
    </div>`}function wt(){return`<style>
#scm-network-root { padding:0; }
.scng-stats-row { display:flex; gap:12px; padding:16px 24px 8px; flex-wrap:wrap; }
.scng-stat-card { flex:1; min-width:110px; background:var(--card-bg); border:1px solid var(--border); border-radius:12px; padding:14px 16px; text-align:center; }
.scng-stat-value { font-size:1.5rem; font-weight:800; color:var(--text); }
.scng-stat-label { font-size:0.7rem; color:var(--text-muted); margin-top:2px; text-transform:uppercase; letter-spacing:.5px; }
.scng-graph-container { margin:8px 24px 16px; background:var(--card-bg); border:1px solid var(--border); border-radius:16px; overflow:hidden; position:relative; }
.scng-toolbar { display:flex; justify-content:space-between; align-items:center; padding:10px 16px; border-bottom:1px solid var(--border); background:color-mix(in srgb,var(--card-bg) 95%,var(--primary) 5%); }
.scng-toolbar-left { display:flex; gap:10px; align-items:center; }
.scng-toolbar-right { display:flex; gap:4px; }
.scng-search { width:170px; padding:6px 12px; border-radius:8px; border:1px solid var(--border); background:var(--bg); color:var(--text); font-size:.78rem; outline:none; }
.scng-search:focus { border-color:var(--primary); box-shadow:0 0 0 2px color-mix(in srgb,var(--primary) 20%,transparent); }
.scng-filter-group { display:flex; gap:2px; background:var(--bg); border-radius:8px; padding:2px; }
.scng-filter-btn { padding:4px 10px; border:none; background:transparent; color:var(--text-muted); font-size:.72rem; border-radius:6px; cursor:pointer; font-weight:600; transition:all .2s; }
.scng-filter-btn:hover { color:var(--text); }
.scng-filter-btn.active { background:var(--primary); color:#fff; }
.scng-icon-btn { width:30px; height:30px; border-radius:8px; border:1px solid var(--border); background:var(--bg); color:var(--text); font-size:1rem; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:700; transition:all .2s; }
.scng-icon-btn:hover { background:var(--primary); color:#fff; border-color:var(--primary); }
.scng-canvas { width:100%; height:520px; overflow:hidden; cursor:grab; position:relative; background:radial-gradient(circle at 30% 40%,color-mix(in srgb,var(--primary) 5%,transparent) 0%,transparent 50%),radial-gradient(circle at 70% 60%,color-mix(in srgb,#22c55e 4%,transparent) 0%,transparent 50%),var(--bg); }
#scng-svg { width:100%; height:100%; }
.scng-legend { display:flex; gap:10px; padding:8px 16px; border-top:1px solid var(--border); flex-wrap:wrap; align-items:center; font-size:.7rem; color:var(--text-muted); }
.scng-legend-item { display:flex; align-items:center; gap:4px; }
.scng-legend-dot { width:8px; height:8px; border-radius:50%; }
.scng-legend-line { width:16px; height:3px; border-radius:2px; }
.scng-legend-sep { color:var(--border); margin:0 4px; }
.scng-detail { position:fixed; right:24px; top:140px; width:320px; background:var(--card-bg); border:1px solid var(--border); border-radius:14px; box-shadow:0 12px 40px rgba(0,0,0,.2); padding:16px; z-index:100; max-height:400px; overflow-y:auto; }
.scng-dh { display:flex; gap:10px; align-items:center; margin-bottom:12px; }
.scng-di { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:18px; }
.scng-dn { font-weight:700; font-size:.95rem; color:var(--text); }
.scng-dt { font-size:.72rem; color:var(--text-muted); }
.scng-dc { margin-left:auto; background:none; border:none; color:var(--text-muted); font-size:1rem; cursor:pointer; padding:4px 8px; border-radius:6px; }
.scng-dc:hover { background:var(--bg); }
.scng-dr { display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid var(--border); font-size:.8rem; color:var(--text-muted); }
.scng-rb { padding:2px 8px; border-radius:6px; font-size:.68rem; font-weight:700; text-transform:uppercase; }
.scng-rb-low { background:#22c55e20; color:#22c55e; }
.scng-rb-medium { background:#f59e0b20; color:#f59e0b; }
.scng-rb-high { background:#ef444420; color:#ef4444; }
.scng-st { font-size:.72rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; }
.scng-cr { display:flex; justify-content:space-between; align-items:center; padding:4px 0; font-size:.78rem; color:var(--text); border-bottom:1px solid color-mix(in srgb,var(--border) 50%,transparent); gap:6px; }
.scng-crel { background:var(--bg); padding:1px 6px; border-radius:4px; font-size:.66rem; color:var(--text-muted); font-weight:600; white-space:nowrap; }
</style>`}var u,Q,Y=I(()=>{B();U();u={selectedNode:null,hoveredNode:null,transform:{x:0,y:0,scale:1},nodes:[],edges:[],filter:"all"},Q={farm:{icon:"\u{1F33F}",color:"#4ade80",label:"Farm",tier:0},processor:{icon:"\u2699\uFE0F",color:"#f59e0b",label:"Processor",tier:1},warehouse:{icon:"\u{1F4E6}",color:"#60a5fa",label:"Warehouse",tier:2},port:{icon:"\u{1F6A2}",color:"#a78bfa",label:"Port",tier:3},hub:{icon:"\u{1F500}",color:"#6366f1",label:"Hub",tier:4},distributor:{icon:"\u{1F3EA}",color:"#f472b6",label:"Distributor",tier:5},organization:{icon:"\u{1F3E2}",color:"#6366f1",label:"Organization",tier:2.5},supplier:{icon:"\u{1F3ED}",color:"#14b8a6",label:"Supplier",tier:1},manufacturer:{icon:"\u{1F3ED}",color:"#f97316",label:"Manufacturer",tier:1},logistics:{icon:"\u{1F69B}",color:"#8b5cf6",label:"Logistics",tier:3}};window._scngSearch=function(t){let s=t.toLowerCase(),a=document.getElementById("scng-canvas"),e=a?.clientWidth||900,i=a?.clientHeight||520;if(s){let l=u.nodes.find(o=>(o.label||"").toLowerCase().includes(s));u.hoveredNode=l?.id||null}else u.hoveredNode=null;C(e,i)};window._scngFilter=function(t){u.filter=t,document.querySelectorAll(".scng-filter-btn").forEach(i=>i.classList.remove("active")),document.querySelector(`.scng-filter-btn[onclick*="${t}"]`)?.classList.add("active");let s=document.getElementById("scng-canvas"),a=s?.clientWidth||900,e=s?.clientHeight||520;u.nodes.forEach(i=>{if(t==="all"){i._hidden=!1;return}let l=u.edges.some(o=>!o._partner&&(o._s.id===i.id||o._t.id===i.id));i._hidden=t==="supply_chain"?!l&&!i.isCenter:l&&!i.isCenter}),C(a,e)};window._scngZoom=function(t){u.transform.scale=Math.max(.3,Math.min(3,u.transform.scale*t));let s=document.getElementById("scng-canvas");C(s?.clientWidth||900,s?.clientHeight||520)};window._scngReset=function(){u.transform={x:0,y:0,scale:1},u.hoveredNode=null,u.selectedNode=null,document.getElementById("scng-detail").style.display="none";let t=document.getElementById("scng-canvas");C(t?.clientWidth||900,t?.clientHeight||520)}});function j(t){return t==null?"":String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function _t(t){if(!t||typeof t!="string")return"";let s=t.trim();if(s.startsWith("/")||s.startsWith("./")||s.startsWith("#"))return s;try{let a=new URL(s,window.location.origin);if(["http:","https:","mailto:"].includes(a.protocol))return s}catch{}return""}var Z=I(()=>{window.escapeHTML=j;window.sanitizeURL=_t});function A(t,s="info"){let a=Date.now();k.toasts.push({id:a,msg:t,type:s}),X(),setTimeout(()=>{k.toasts=k.toasts.filter(e=>e.id!==a),X()},4e3)}function X(){let t=document.getElementById("toast-container");t||(t=document.createElement("div"),t.id="toast-container",t.className="toast-container",document.body.appendChild(t)),t.innerHTML=k.toasts.map(s=>`<div class="toast ${j(s.type)}">${j(s.msg)}</div>`).join("")}var tt=I(()=>{B();Z();window.showToast=A});function kt(t){if(!t)return"";let s=Math.floor((Date.now()-new Date(t).getTime())/1e3);return s<60?"just now":s<3600?Math.floor(s/60)+"m ago":s<86400?Math.floor(s/3600)+"h ago":s<2592e3?Math.floor(s/86400)+"d ago":new Date(t).toLocaleDateString()}function St(t){return t?t.slice(0,8)+"\u2026"+t.slice(-6):"\u2014"}function F(t){return t>=80?"var(--emerald)":t>=50?"var(--amber)":"var(--rose)"}function Pt(t){return{scan:"\u{1F4F1}",fraud_alert:"\u{1F6A8}",product_registered:"\u{1F4E6}",blockchain_seal:"\u{1F517}",kyc_verified:'<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span>',evidence_uploaded:"\u{1F512}",scm_event:"\u{1F3ED}",user_login:"\u{1F464}",system:"\u2699\uFE0F"}[t]||"\u{1F4CC}"}function Ct(t,s){let a=new Blob([JSON.stringify(t,null,2)],{type:"application/json"}),e=document.createElement("a");e.href=URL.createObjectURL(a),e.download=s,e.click(),URL.revokeObjectURL(e.href)}var st=I(()=>{window.timeAgo=kt;window.shortHash=St;window.scoreColor=F;window.eventIcon=Pt;window.downloadJSON=Ct});var at={};W(at,{renderPage:()=>Mt});function Mt(){let t=k.supplierProfile?.profile||null,s=k.supplierScores||[],a=k.supplierImprovements?.suggestions||[],e=s[0]||{},i=[{label:"Compliance",val:e.compliance_factor,icon:"\u{1F4CB}",color:"#6366f1"},{label:"Delivery",val:e.delivery_factor||e.consistency_factor,icon:"\u{1F69A}",color:"#06b6d4"},{label:"Quality",val:e.quality_factor||e.fraud_factor,icon:"\u2705",color:"#22c55e"},{label:"Financial",val:e.financial_factor||e.history_factor,icon:"\u{1F4B0}",color:"#f59e0b"}];return`
    <style>
      .sup-hero { text-align: center; margin-bottom: 30px; }
      .sup-hero h1 { font-size: 1.6rem; font-weight: 800; margin-bottom: 4px; }
      .sup-hero p { color: var(--text-muted); font-size: 0.82rem; }

      .sup-score-ring { position: relative; width: 180px; height: 180px; margin: 20px auto; }
      .sup-score-ring svg { width: 100%; height: 100%; }
      .sup-score-val { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
      .sup-score-num { font-size: 3rem; font-weight: 800; }
      .sup-score-label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; }

      .sup-factors { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
      @media (max-width: 700px) { .sup-factors { grid-template-columns: repeat(2, 1fr); } }
      .sup-factor { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 16px; text-align: center; }
      .sup-factor-icon { font-size: 1.4rem; margin-bottom: 6px; }
      .sup-factor-val { font-size: 1.6rem; font-weight: 800; }
      .sup-factor-label { font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

      .sup-sections { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      @media (max-width: 900px) { .sup-sections { grid-template-columns: 1fr; } }

      .sup-panel { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 20px; }
      .sup-panel-title { font-size: 0.92rem; font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }

      .sup-profile-field { margin-bottom: 12px; }
      .sup-profile-field label { display: block; font-size: 0.72rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
      .sup-profile-field input, .sup-profile-field textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; font-size: 0.82rem; color: var(--text); font-family: inherit; }
      .sup-profile-field textarea { resize: vertical; min-height: 60px; }

      .sup-save-btn { background: linear-gradient(135deg, #6366f1, #818cf8); color: #fff; border: none; border-radius: 8px; padding: 10px 20px; font-weight: 600; font-size: 0.82rem; cursor: pointer; }

      .sup-improvement { padding: 12px 14px; background: var(--bg); border-radius: 10px; margin-bottom: 8px; }
      .sup-improvement-title { font-weight: 600; font-size: 0.82rem; margin-bottom: 4px; }
      .sup-improvement-desc { font-size: 0.75rem; color: var(--text-muted); line-height: 1.5; }
      .sup-improvement-impact { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.65rem; font-weight: 600; margin-top: 4px; background: rgba(34,197,94,0.15); color: #22c55e; }

      .sup-empty { text-align: center; padding: 30px; color: var(--text-muted); font-size: 0.82rem; }
    
      .sup-my-badge { display: inline-flex; align-items: center; gap: 12px; padding: 12px 24px; border-radius: 14px; font-size: 0.85rem; text-align: left; }
      .sup-my-badge-premium { background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.1)); border: 1px solid rgba(245,158,11,0.3); color: #fbbf24; }
      .sup-my-badge-trusted { background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25); color: #818cf8; }
      .sup-my-badge-verified { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2); color: #4ade80; }
      .sup-my-badge-none { background: rgba(100,116,139,0.1); border: 1px solid rgba(100,116,139,0.2); color: #94a3b8; }
    </style>

    <!-- Hero -->
    <div class="sup-hero">
      <h1>${t?.public_name||"My Supplier Profile"}</h1>
      <p>${t?.country||""} ${t?.is_published?"\u2022 \u{1F310} Public Profile":"\u2022 \u{1F512} Private"}</p>
    </div>

    <!-- Trust Score Ring -->
    <div class="sup-score-ring">
      <svg viewBox="0 0 180 180">
        <circle cx="90" cy="90" r="78" fill="none" stroke="var(--border)" stroke-width="8"/>
        <circle cx="90" cy="90" r="78" fill="none" stroke="${F(e.score||t?.public_trust_score||0)}" stroke-width="8"
          stroke-dasharray="${(e.score||t?.public_trust_score||0)/100*490} 490"
          stroke-linecap="round" transform="rotate(-90 90 90)" style="transition: stroke-dasharray 1s ease"/>
      </svg>
      <div class="sup-score-val">
        <div class="sup-score-num" style="color:${F(e.score||t?.public_trust_score||0)}">${e.score||t?.public_trust_score||"\u2014"}</div>
        <div class="sup-score-label">Trust Score</div>
      </div>
    </div>

    
    <!-- My Badge -->
    <div style="text-align:center;margin-bottom:24px">
      ${(()=>{let l=e.score||t?.public_trust_score||0,o=t?.kyc_status||"pending";return l>=92?'<div class="sup-my-badge sup-my-badge-premium"><span style="font-size:1.5rem">\u2B50</span><div><strong>Premium Partner</strong><div style="font-size:0.7rem;opacity:0.7">Top-tier verified supplier</div></div></div>':l>=80&&o==="verified"?'<div class="sup-my-badge sup-my-badge-trusted"><span style="font-size:1.5rem">\u{1F6E1}\uFE0F</span><div><strong>Trusted</strong><div style="font-size:0.7rem;opacity:0.7">Verified & reliable partner</div></div></div>':o==="verified"?'<div class="sup-my-badge sup-my-badge-verified"><span style="font-size:1.5rem">\u2705</span><div><strong>Verified</strong><div style="font-size:0.7rem;opacity:0.7">Identity confirmed</div></div></div>':'<div class="sup-my-badge sup-my-badge-none"><span style="font-size:1.5rem">\u{1F513}</span><div><strong>Unverified</strong><div style="font-size:0.7rem;opacity:0.7">Complete your profile to earn badges</div></div></div>'})()}
    </div>

    <!-- Factors -->
    <div class="sup-factors">
      ${i.map(l=>`
        <div class="sup-factor">
          <div class="sup-factor-icon">${l.icon}</div>
          <div class="sup-factor-val" style="color:${l.color}">${l.val!=null?Math.round(l.val*100):"\u2014"}</div>
          <div class="sup-factor-label">${l.label}</div>
        </div>
      `).join("")}
    </div>

    <!-- Profile + Improvements -->
    <div class="sup-sections">
      <div class="sup-panel">
        <div class="sup-panel-title">\u{1F3ED} My Profile</div>
        <form onsubmit="saveSupplierProfile(event)">
          <div class="sup-profile-field">
            <label>Company Name</label>
            <input type="text" id="sp-name" value="${t?.public_name||""}" />
          </div>
          <div class="sup-profile-field">
            <label>Description</label>
            <textarea id="sp-desc">${t?.description||""}</textarea>
          </div>
          <div class="sup-profile-field">
            <label>Website</label>
            <input type="url" id="sp-website" value="${t?.website||""}" placeholder="https://" />
          </div>
          <div class="sup-profile-field">
            <label>Country</label>
            <input type="text" id="sp-country" value="${t?.country||""}" />
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <label style="font-size:0.78rem;cursor:pointer">
              <input type="checkbox" id="sp-public" ${t?.is_published?"checked":""} /> Make profile public
            </label>
          </div>
          <button type="submit" class="sup-save-btn">Save Profile</button>
        </form>
      </div>

      <div class="sup-panel">
        <div class="sup-panel-title">\u{1F4A1} Improvement Plan</div>
        ${a.length===0?'<div class="sup-empty">Complete your profile to receive AI-powered improvement suggestions</div>':a.map(l=>`
            <div class="sup-improvement">
              <div class="sup-improvement-title">${l.title||l.area||"Suggestion"}</div>
              <div class="sup-improvement-desc">${l.description||l.recommendation||""}</div>
              ${l.impact?'<span class="sup-improvement-impact">+'+l.impact+" score impact</span>":""}
            </div>
          `).join("")}
      </div>
    </div>
  `}var et=I(()=>{B();U();tt();st();window.saveSupplierProfile=async function(t){t.preventDefault();try{let s=await H.put("/supplier-portal/my/profile",{public_name:document.getElementById("sp-name").value.trim(),description:document.getElementById("sp-desc").value.trim(),website:document.getElementById("sp-website").value.trim(),country:document.getElementById("sp-country").value.trim(),is_published:document.getElementById("sp-public").checked});s.status==="saved"?(A("Profile saved successfully","success"),k.supplierProfile={profile:s.profile}):A("Failed to save profile","error")}catch(s){A(s.message||"Failed to save profile","error")}}});var c={base:window.location.origin+"/api",token:localStorage.getItem("tc_token"),refreshToken:localStorage.getItem("tc_refresh"),_refreshing:null,async request(t,s,a,e){let i={method:t,headers:{"Content-Type":"application/json"}};this.token&&(i.headers.Authorization=`Bearer ${this.token}`),a&&(i.body=JSON.stringify(a));let l=await fetch(this.base+s,i),o=await l.json();if(l.status===401&&o.code==="TOKEN_EXPIRED"&&!e&&this.refreshToken)return await this.doRefresh(),this.request(t,s,a,!0);if(!l.ok)throw new Error(o.error||"Request failed");return o},async doRefresh(){if(this._refreshing)return this._refreshing;this._refreshing=(async()=>{try{let t=await fetch(this.base+"/auth/refresh",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refresh_token:this.refreshToken})}),s=await t.json();if(!t.ok)throw new Error(s.error);this.setToken(s.token,s.refresh_token)}catch(t){console.error("Token refresh failed:",t),this.clearToken(),r.user=null,h()}})(),await this._refreshing,this._refreshing=null},get(t){return this.request("GET",t)},post(t,s){return this.request("POST",t,s)},put(t,s){return this.request("PUT",t,s)},delete(t){return this.request("DELETE",t)},setToken(t,s){this.token=t,localStorage.setItem("tc_token",t),s&&(this.refreshToken=s,localStorage.setItem("tc_refresh",s))},clearToken(){this.token=null,this.refreshToken=null,localStorage.removeItem("tc_token"),localStorage.removeItem("tc_refresh"),localStorage.removeItem("tc_user")}},r={page:"dashboard",user:JSON.parse(localStorage.getItem("tc_user")||"null"),dashboardStats:null,products:[],fraudAlerts:[],scanHistory:[],blockchain:null,events:[],ws:null,modal:null,scanResult:null,toasts:[],scmDashboard:null,scmInventory:null,scmShipments:null,scmPartners:null,scmLeaks:null,scmGraph:null,scmOptimization:null,scmForecast:null,scmSlaViolations:null,kycData:null,evidenceData:null,stakeholderData:null,billingData:null,publicData:null,notifications:JSON.parse(localStorage.getItem("tc_notifications")||"[]"),notifOpen:!1,searchOpen:!1,searchQuery:"",searchResults:null,integrationsSchema:null,integrationsData:null,featureFlags:JSON.parse(localStorage.getItem("tc_features")||"{}"),branding:JSON.parse(localStorage.getItem("tc_branding")||"null"),plan:"free",org:null},Et={fraud:"fraud",reports:"reports","scm-dashboard":"scm_tracking","scm-inventory":"inventory","scm-logistics":"logistics","scm-partners":"partners","scm-leaks":"leaks","scm-trustgraph":"trust_graph","scm-epcis":"epcis","scm-ai":"ai_forecast","scm-risk-radar":"risk_radar","scm-carbon":"carbon","scm-twin":"digital_twin",kyc:"kyc",evidence:"evidence",sustainability:"sustainability",compliance:"compliance",anomaly:"anomaly",nft:"nft",wallet:"wallet",branding:"branding",blockchain:"blockchain",integrations:"integrations"},rt={free:"Free",core:"Core \u2014 $29/mo",pro:"Pro \u2014 $79/mo",enterprise:"Enterprise \u2014 $199/mo"},Tt={products:"free",qr:"free",dashboard:"free",trust_network:"free",supplier_portal:"free",fraud:"core",reports:"core",scm_tracking:"core",support:"core",inventory:"pro",logistics:"pro",partners:"pro",ai_forecast:"pro",demand_sensing:"pro",risk_radar:"pro",anomaly:"pro",kyc:"pro",compliance:"pro",evidence:"pro",sustainability:"pro",leaks:"pro",trust_graph:"pro",what_if:"pro",monte_carlo:"pro",carbon:"enterprise",digital_twin:"enterprise",epcis:"enterprise",blockchain:"enterprise",nft:"enterprise",branding:"enterprise",wallet:"enterprise",webhooks:"enterprise",integrations:"enterprise",white_label:"enterprise"};function It(t){return!t||r.user?.role==="admin"?!0:r.featureFlags[t]===!0}function zt(t){return Tt[t]||"enterprise"}function nt(){let t=location.protocol==="https:"?"wss:":"ws:";r.ws=new WebSocket(`${t}//${location.host}/ws`),r.ws.onmessage=s=>{try{let a=JSON.parse(s.data);r.events.unshift(a),r.events.length>100&&r.events.pop();let e=document.getElementById("event-feed");e&&(e.innerHTML=J());let i={id:Date.now(),type:a.type,title:a.type==="FraudFlagged"?"\u{1F6A8} Fraud Alert":a.type==="ScanEvent"?"\u{1F4F1} New Scan":"\u{1F4E2} "+a.type,message:a.data?.description||a.data?.product_name||a.type,time:new Date().toISOString(),read:!1};r.notifications.unshift(i),r.notifications.length>50&&r.notifications.pop(),localStorage.setItem("tc_notifications",JSON.stringify(r.notifications)),Bt(),a.type==="FraudFlagged"&&Rt("\u{1F6A8} Fraud Alert: "+(a.data?.description||a.data?.type||"New alert"),"error")}catch{}},r.ws.onclose=()=>setTimeout(nt,3e3)}function Rt(t,s="info"){let a=Date.now();r.toasts.push({id:a,msg:t,type:s}),it(),setTimeout(()=>{r.toasts=r.toasts.filter(e=>e.id!==a),it()},4e3)}function it(){let t=document.getElementById("toast-container");t||(t=document.createElement("div"),t.id="toast-container",t.className="toast-container",document.body.appendChild(t)),t.innerHTML=r.toasts.map(s=>`<div class="toast ${escapeHTML(s.type)}">${s.msg}</div>`).join("")}function Bt(){let t=document.getElementById("notif-badge"),s=r.notifications.filter(a=>!a.read).length;t&&(t.textContent=s>9?"9+":s,t.style.display=s>0?"flex":"none")}var Ks=(()=>{let s=window.location.pathname.match(/^(\/[^/]+\/)/);return s&&s[1]!=="/api/"&&s[1]!=="/ws/"?s[1].replace(/\/$/,""):""})();async function At(t){try{if(t==="dashboard")r.dashboardStats=await c.get("/qr/dashboard-stats"),h(),setTimeout(()=>Vt(),50);else if(t==="products"){let s=await c.get("/products");r.products=s.products||[],h()}else if(t==="fraud"){let s=await c.get("/qr/fraud-alerts?status=open&limit=50");r.fraudAlerts=s.alerts||[],h()}else if(t==="scans"){let s=await c.get("/qr/scan-history?limit=50");r.scanHistory=s.scans||[],h()}else if(t==="blockchain")r.blockchain=await c.get("/qr/blockchain"),h();else if(t==="scm-dashboard")r.scmDashboard=await c.get("/scm/dashboard"),h();else if(t==="scm-inventory")r.scmInventory=await c.get("/scm/inventory"),r.scmForecast=await c.get("/scm/inventory/forecast"),h();else if(t==="scm-logistics"){let[s,a,e]=await Promise.all([c.get("/scm/shipments"),c.get("/scm/sla/violations"),c.get("/scm/optimization")]);r.scmShipments=s,r.scmSlaViolations=a,r.scmOptimization=e,h()}else if(t==="scm-partners"){let s=await c.get("/scm/partners");r.scmPartners=s.partners||[],h()}else if(t==="scm-leaks")r.scmLeaks=await c.get("/scm/leaks/stats"),h();else if(t==="scm-trustgraph")r.scmGraph=await c.get("/scm/graph/analysis"),h();else if(t==="kyc"){let[s,a]=await Promise.all([c.get("/kyc/stats"),c.get("/kyc/businesses")]);r.kycData={stats:s,businesses:a.businesses||[]},h()}else if(t==="evidence"){let[s,a]=await Promise.all([c.get("/evidence/stats"),c.get("/evidence")]);r.evidenceData={stats:s,items:a.items||[]},h()}else if(t==="stakeholder"){let[s,a,e]=await Promise.all([c.get("/trust/dashboard"),c.get("/trust/certifications"),c.get("/trust/compliance")]);r.stakeholderData={dashboard:s,certifications:a.certifications||[],compliance:e.records||[]},h()}else if(t==="billing"){let[s,a,e]=await Promise.all([c.get("/billing/plan"),c.get("/billing/usage"),c.get("/billing/invoices")]);r.billingData={plan:s.plan,available:s.available_plans,period:a.period,usage:a.usage,invoices:e.invoices},h()}else if(t==="pricing"){try{let s=await fetch(c.base+"/billing/pricing");if(s.ok)r.pricingData=await s.json();else throw new Error("HTTP "+s.status)}catch(s){console.warn("[app] Pricing fetch failed, using static fallback:",s.message),r.pricingData={plans:{free:{name:"Free",slug:"free",tagline:"Get started with product verification",price_monthly:0,price_annual:0,limits:{scans:500,api_calls:1e3,storage_mb:100,nft_mints:0,carbon_calcs:0},features:["Basic QR verification","Public trust check page"],sla:null,badge:null},starter:{name:"Starter",slug:"starter",tagline:"For growing brands building trust",price_monthly:49,price_annual:470,limits:{scans:5e3,api_calls:1e4,storage_mb:1024,nft_mints:10,carbon_calcs:100},features:["Everything in Free","Fraud detection alerts"],sla:"99%",badge:null},pro:{name:"Pro",slug:"pro",tagline:"Advanced trust infrastructure for scale",price_monthly:199,price_annual:1910,limits:{scans:25e3,api_calls:1e5,storage_mb:10240,nft_mints:100,carbon_calcs:1e3},features:["Everything in Starter","AI anomaly detection"],sla:"99.5%",badge:"POPULAR"},business:{name:"Business",slug:"business",tagline:"Full-stack trust for enterprise brands",price_monthly:499,price_annual:4790,limits:{scans:1e5,api_calls:5e5,storage_mb:51200,nft_mints:500,carbon_calcs:5e3},features:["Everything in Pro","Digital twin simulation"],sla:"99.9%",badge:null},enterprise:{name:"Enterprise",slug:"enterprise",tagline:"Custom deployment with white-glove service",price_monthly:null,price_annual:null,limits:{scans:-1,api_calls:-1,storage_mb:-1,nft_mints:-1,carbon_calcs:-1},features:["Everything in Business","On-premise deployment"],sla:"99.95%",badge:null}},usage_pricing:{scans:{name:"QR Scans",unit:"scan",tiers:[{up_to:1e3,price:.05},{up_to:1e4,price:.03},{up_to:5e4,price:.02},{up_to:null,price:.01}]},nft_mints:{name:"NFT Certificate Mints",unit:"mint",tiers:[{up_to:50,price:2},{up_to:200,price:1.5},{up_to:null,price:.5}]},carbon_calcs:{name:"Carbon Calculations",unit:"calculation",tiers:[{up_to:null,price:.01}],bundle:{size:1e3,price:10}},api_calls:{name:"API Calls",unit:"call",tiers:[{up_to:null,price:.001}]}},currency:"USD",annual_discount_percent:20,free_trial_days:14}}h()}else if(t==="public-dashboard"){let[s,a,e,i,l]=await Promise.all([fetch("/api/public/stats").then(o=>o.json()),fetch("/api/public/scan-trends").then(o=>o.json()),fetch("/api/public/trust-distribution").then(o=>o.json()),fetch("/api/public/scan-results").then(o=>o.json()),fetch("/api/public/alert-severity").then(o=>o.json())]);r.publicData={stats:s,trends:a,trustDist:e,scanResults:i,alertSev:l},h(),setTimeout(()=>cs(),50)}else if(t==="api-docs")h();else if(t==="settings"){h(),us();return}else if(t==="admin-users"){h(),fs();return}else if(t==="integrations")try{let[s,a]=await Promise.all([c.get("/integrations/schema"),c.get("/integrations")]);r.integrationsSchema=s,r.integrationsData=a}catch{}else if(t==="scm-epcis"){let[s,a]=await Promise.all([c.get("/scm/epcis/events"),c.get("/scm/epcis/stats")]);r.epcisData={events:s.events||[],stats:a},h()}else if(t==="scm-ai"){let[s,a]=await Promise.all([c.get("/scm/ai/forecast-demand"),c.get("/scm/ai/demand-sensing")]);r.aiData={forecast:s,sensing:a},h()}else if(t==="scm-risk-radar"){let[s,a,e]=await Promise.all([c.get("/scm/risk/radar"),c.get("/scm/risk/heatmap"),c.get("/scm/risk/alerts")]);r.riskRadarData={radar:s,heatmap:a,alerts:e},h()}else if(t==="scm-carbon"){let[s,a,e]=await Promise.all([c.get("/scm/carbon/scope"),c.get("/scm/carbon/leaderboard"),c.get("/scm/carbon/report")]);r.carbonData={scope:s,leaderboard:a,report:e},h()}else if(t==="scm-twin"){let[s,a,e]=await Promise.all([c.get("/scm/twin/model"),c.get("/scm/twin/kpis"),c.get("/scm/twin/anomalies")]);r.twinData={model:s,kpis:a,anomalies:e}}else if(t==="scm-network"){let[s,a,e,i]=await Promise.all([c.get("/trust-network/graph"),c.get("/trust-network/stats"),c.get("/trust-network/shared-scores"),c.get("/trust-network/invitations")]);r.networkGraph=s,r.networkStats=a,r.networkScores=e,r.networkInvitations=i}else if(t==="supplier-dashboard"){let[s,a,e]=await Promise.all([c.get("/supplier-portal/my/profile"),c.get("/supplier-portal/my/scores").catch(()=>[]),c.get("/supplier-portal/my/improvements").catch(()=>({suggestions:[]}))]);r.supplierProfile=s,r.supplierScores=Array.isArray(a)?a:a?.scores||[],r.supplierImprovements=e,h()}else if(t==="sustainability"){let[s,a]=await Promise.all([c.get("/sustainability/stats"),c.get("/sustainability/leaderboard")]);r.sustainData={stats:s,scores:a.scores||[]},h()}else if(t==="compliance"){let[s,a,e]=await Promise.all([c.get("/compliance/stats"),c.get("/compliance/records"),c.get("/compliance/retention")]);r.complianceData={stats:s,records:a.records||[],policies:e.policies||[]},h()}else if(t==="anomaly"){let s=await c.get("/anomaly?limit=50");r.anomalyData=s,h()}else if(t==="reports"){let s=await c.get("/reports/templates");r.reportsData=s,h()}else if(t==="nft"){let s=await c.get("/nft");r.nftData=s,h()}else if(t==="wallet"){let[s,a]=await Promise.all([c.get("/wallet/wallets"),c.get("/wallet/transactions")]);r.walletData={wallets:s.wallets||[],transactions:a.transactions||[]},h()}else if(t==="branding"){let s=await c.get("/branding");r.brandingData=s,h()}}catch(s){console.error("Load data error:",s)}}function S(t){if(!t)return"\u2014";let s=new Date(t);if(isNaN(s.getTime())&&(s=new Date(t+"Z")),isNaN(s.getTime()))return"\u2014";let a=Math.floor((Date.now()-s.getTime())/1e3);if(a<0){let e=Math.abs(a);return e<3600?"in "+Math.floor(e/60)+"m":e<86400?"in "+Math.floor(e/3600)+"h":"in "+Math.floor(e/86400)+"d"}return a<60?a+"s ago":a<3600?Math.floor(a/60)+"m ago":a<86400?Math.floor(a/3600)+"h ago":Math.floor(a/86400)+"d ago"}function R(t){return t?t.substring(0,12)+"...":"\u2014"}function L(t){return t>=80?"var(--emerald)":t>=60?"var(--amber)":"var(--rose)"}function Lt(t){return{QRScanned:"\u{1F4F1}",QRValidated:'<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span>',QRInvalid:'<span class="status-icon status-fail" aria-label="Fail">\u2717</span>',FraudFlagged:"\u{1F6A8}",FraudResolved:"\u2714\uFE0F",TrustScoreUpdated:"\u{1F4CA}",ProductRegistered:"\u{1F4E6}",BlockchainSealed:"\u{1F517}",UserLogin:"\u{1F464}",CONNECTED:"\u{1F50C}",SystemAlert:"\u26A1"}[t]||"\u{1F4CB}"}function h(){let t=document.getElementById("app");if(!r.user||!c.token){t.innerHTML=Nt();return}if(t.innerHTML=`
    <div class="app-layout">
      ${Ft()}
      <div class="main-content">
        ${Ot()}
        <div class="page-body">${Ht()}</div>
      </div>
    </div>
  `,r.modal){let s=document.createElement("div");s.className="modal-overlay",s.onclick=a=>{a.target===s&&(r.modal=null,h())},s.innerHTML=r.modal,document.body.appendChild(s)}}var Dt=null;function Nt(){return Dt?`
      <div class="login-page">
        <div class="login-card">
          <div class="login-logo">\u{1F510}</div>
          <div class="login-title">Two-Factor Authentication</div>
          <div class="login-subtitle">Enter the 6-digit code from your authenticator app</div>
          <div id="login-error" class="login-error" style="display:none"></div>
          <div class="input-group">
            <label>MFA Code</label>
            <input class="input mfa-code-input" id="mfa-code" type="text" maxlength="6" placeholder="000000" autocomplete="one-time-code" autofocus
              oninput="if(this.value.length===6) doMfaVerify()" onkeydown="if(event.key==='Enter') doMfaVerify()">
          </div>
          <button class="btn btn-primary" style="width:100%;padding:12px;margin-top:8px" onclick="doMfaVerify()"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span> Verify</button>
          <button class="btn btn-sm" style="width:100%;margin-top:8px;opacity:0.7" onclick="_mfaToken=null;render()">\u2190 Back to Login</button>
        </div>
      </div>
    `:`
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">\u{1F6E1}\uFE0F</div>
        <div class="login-title">TrustChecker</div>
        <div class="login-subtitle">Digital Trust Infrastructure v9.0.0</div>
        <div id="login-error" class="login-error" style="display:none"></div>
        <div class="input-group">
          <label>Email</label>
          <input class="input" id="login-user" type="email" placeholder="admin@company.com" autocomplete="email">
        </div>
        <div class="input-group">
          <label>Password</label>
          <input class="input" id="login-pass" type="password" placeholder="Enter password"
            onkeydown="if(event.key==='Enter') doLogin()">
        </div>
        <button class="btn btn-primary" style="width:100%;padding:12px;margin-top:8px" onclick="doLogin()">\u{1F510} Sign In</button>
        <div style="margin-top:16px;font-size:0.7rem;color:var(--text-muted)">Enterprise Identity System</div>
      </div>
    </div>
  `}var y=(t,s=20)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${t}</svg>`,jt={dashboard:t=>y('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="14" y="11" width="7" height="10" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',t),scanner:t=>y('<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/>',t),products:t=>y('<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',t),search:t=>y('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',t),alert:t=>y('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',t),blockchain:t=>y('<rect x="14" y="14" width="8" height="8" rx="2"/><rect x="2" y="2" width="8" height="8" rx="2"/><path d="M7 14v1a2 2 0 0 0 2 2h1"/><path d="M14 7h1a2 2 0 0 1 2 2v1"/>',t),building:t=>y('<rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',t),lock:t=>y('<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',t),star:t=>y('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',t),factory:t=>y('<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>',t),clipboard:t=>y('<rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',t),truck:t=>y('<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',t),handshake:t=>y('<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>',t),network:t=>y('<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',t),satellite:t=>y('<path d="M13 7 9 3 5 7l4 4"/><path d="m17 11 4 4-4 4-4-4"/><path d="m8 12 4 4 6-6-4-4Z"/><path d="m16 8 3-3"/><path d="M9 21a6 6 0 0 0-6-6"/>',t),brain:t=>y('<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>',t),target:t=>y('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',t),leaf:t=>y('<path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',t),mirror:t=>y('<path d="M9.5 2A5.5 5.5 0 0 0 5 9.5a5.5 5.5 0 0 0 4.5 5.41V22h5v-7.09A5.5 5.5 0 0 0 19 9.5 5.5 5.5 0 0 0 14.5 4H14V2Z"/>',t),recycle:t=>y('<path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/><path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12"/><path d="m14 16-3 3 3 3"/><path d="M8.293 13.596 7.196 9.5 3.1 10.598"/><path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843"/><path d="m13.378 9.633 4.096 1.098 1.097-4.096"/>',t),scroll:t=>y('<path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/>',t),zap:t=>y('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',t),barChart:t=>y('<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',t),palette:t=>y('<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z"/>',t),wallet:t=>y('<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',t),plug:t=>y('<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-6 6v0a6 6 0 0 1-6-6V8Z"/>',t),radio:t=>y('<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>',t),creditCard:t=>y('<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',t),tag:t=>y('<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',t),globe:t=>y('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',t),book:t=>y('<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',t),settings:t=>y('<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',t),users:t=>y('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',t),logout:t=>y('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',t),shield:t=>y('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',t)};function g(t,s){return(jt[t]||(()=>""))(s)}function z(t){let s=Et[t.id],a=s&&!It(s),e=r.page===t.id?"active":"",i=a?"nav-locked":"";if(a){let l=zt(s);return`
      <div class="nav-item ${i}" onclick="showUpgradeModal('${s}')" title="Requires ${rt[l]||l} plan">
        <span class="nav-icon">${t.icon}</span>
        <span>${t.label}</span>
        <span class="nav-lock-icon">${g("lock",14)}</span>
      </div>
    `}return`
    <div class="nav-item ${e}" onclick="navigate('${t.id}')">
      <span class="nav-icon">${t.icon}</span>
      <span>${t.label}</span>
      ${t.badge?`<span class="nav-badge">${t.badge}</span>`:""}
    </div>
  `}function Ft(){let t={super_admin:"*",platform_security:["dashboard","fraud","kyc","evidence","scm-leaks","scm-trustgraph","compliance","anomaly","reports"],data_gov_officer:["dashboard","sustainability","compliance","reports","scm-carbon"],ggc_member:["dashboard","scm-trustgraph","sustainability","compliance","reports"],risk_committee:["dashboard","fraud","kyc","evidence","scm-trustgraph","scm-risk-radar","scm-ai","compliance","anomaly","reports"],compliance_officer:["dashboard","evidence","scm-carbon","sustainability","compliance","anomaly","reports"],ivu_validator:["dashboard","scm-trustgraph","scm-risk-radar","scm-ai","compliance","anomaly","reports"],org_owner:"*",company_admin:"*",admin:"*",security_officer:["dashboard","fraud","evidence","scm-leaks","scm-trustgraph","compliance","anomaly","reports"],executive:["dashboard","stakeholder","scm-dashboard","scm-risk-radar","sustainability","compliance","reports"],carbon_officer:["dashboard","scm-carbon","sustainability","reports"],ops_manager:["dashboard","scanner","products","scans","fraud","blockchain","kyc","evidence","stakeholder","scm-dashboard","scm-inventory","scm-logistics","scm-partners","scm-leaks","scm-trustgraph","scm-epcis","scm-ai","scm-risk-radar","scm-carbon","scm-twin","sustainability","compliance","anomaly","reports","nft","wallet","branding"],risk_officer:["dashboard","fraud","kyc","evidence","scm-leaks","scm-trustgraph","scm-ai","scm-risk-radar","compliance","anomaly","reports"],scm_analyst:["dashboard","products","stakeholder","scm-dashboard","scm-inventory","scm-logistics","scm-partners","scm-leaks","scm-trustgraph","scm-epcis","scm-ai","scm-risk-radar","scm-carbon","scm-twin","sustainability","reports"],developer:["dashboard","blockchain","scm-epcis","reports"],blockchain_operator:["dashboard","blockchain","scm-carbon","nft"],operator:["dashboard","scanner","products","scans","evidence","scm-dashboard","scm-inventory","scm-logistics","reports"],auditor:["dashboard","compliance","reports"],viewer:["dashboard","products","scans","reports"]},s=r.user?.role||"viewer",a=t[s]||t.viewer,e=a==="*",i=e?null:new Set(a),l=x=>e?x:x.filter($=>i.has($.id)),o=l([{id:"dashboard",icon:g("dashboard"),label:"Dashboard"},{id:"scanner",icon:g("scanner"),label:"QR Scanner"},{id:"products",icon:g("products"),label:"Products"},{id:"scans",icon:g("search"),label:"Scan History"},{id:"fraud",icon:g("alert"),label:"Fraud Center",badge:r.dashboardStats?.open_alerts||""},{id:"blockchain",icon:g("blockchain"),label:"Blockchain"},{id:"kyc",icon:g("building"),label:"KYC Business"},{id:"evidence",icon:g("lock"),label:"Evidence Vault"},{id:"stakeholder",icon:g("star"),label:"Trust & Ratings"}]),d=l([{id:"scm-dashboard",icon:g("factory"),label:"Supply Chain"},{id:"scm-inventory",icon:g("clipboard"),label:"Inventory"},{id:"scm-logistics",icon:g("truck"),label:"Logistics"},{id:"scm-partners",icon:g("handshake"),label:"Partners"},{id:"scm-leaks",icon:g("search"),label:"Leak Monitor"},{id:"scm-trustgraph",icon:g("network"),label:"TrustGraph"}]),b=l([{id:"scm-epcis",icon:g("satellite"),label:"EPCIS 2.0"},{id:"scm-ai",icon:g("brain"),label:"AI Analytics"},{id:"scm-risk-radar",icon:g("target"),label:"Risk Radar"},{id:"scm-carbon",icon:g("leaf"),label:"Carbon / ESG"},{id:"scm-twin",icon:g("mirror"),label:"Digital Twin"}]),v=l([{id:"sustainability",icon:g("recycle"),label:"Sustainability"},{id:"compliance",icon:g("scroll"),label:"GDPR Compliance"},{id:"anomaly",icon:g("zap"),label:"Anomaly Monitor"},{id:"reports",icon:g("barChart"),label:"Reports"}]),n=l([{id:"nft",icon:g("palette"),label:"NFT Certificates"},{id:"wallet",icon:g("wallet"),label:"Wallet / Payment"},{id:"branding",icon:g("palette"),label:"White-Label"}]),p=r.org?.name||"",f=rt[r.plan]||r.plan,m=r.branding?.app_name||"TrustChecker",w=`v9.6.0 \u2022 ${r.plan==="enterprise"?"Enterprise":f}`;return`
    <div class="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div class="logo-icon">${g("shield",22)}</div>
          <div>
            <div class="logo-text">${m}</div>
            <div class="logo-version">${w}</div>
          </div>
        </div>
        ${p?`<div class="sidebar-org" title="Organization: ${p}">
          <span style="font-size:11px;color:var(--text-secondary)">${g("building",12)} ${p}</span>
        </div>`:""}
      </div>
      <div class="sidebar-nav">
        ${o.length?`<div class="nav-section">
          <div class="nav-section-label">Main</div>
          ${o.map(x=>z(x)).join("")}
        </div>`:""}
        ${d.length?`<div class="nav-section">
          <div class="nav-section-label">Supply Chain</div>
          ${d.map(x=>z(x)).join("")}
        </div>`:""}
        ${b.length?`<div class="nav-section">
          <div class="nav-section-label">SCM Intelligence</div>
          ${b.map(x=>z(x)).join("")}
        </div>`:""}
        ${v.length?`<div class="nav-section">
          <div class="nav-section-label">Compliance & Reports</div>
          ${v.map(x=>z(x)).join("")}
        </div>`:""}
        ${n.length?`<div class="nav-section">
          <div class="nav-section-label">Commerce</div>
          ${n.map(x=>z(x)).join("")}
        </div>`:""}
        ${e||["ops_manager","executive","developer"].includes(s)?`<div class="nav-section">
          <div class="nav-section-label">System</div>
          ${e||s==="ops_manager"?`
          <div class="nav-item ${r.page==="events"?"active":""}" onclick="navigate('events')">
            <span class="nav-icon">${g("radio")}</span><span>Event Stream</span>
          </div>`:""}
          <div class="nav-item ${r.page==="billing"?"active":""}" onclick="navigate('billing')">
            <span class="nav-icon">${g("creditCard")}</span><span>Billing</span>
          </div>
          <div class="nav-item ${r.page==="pricing"?"active":""}" onclick="navigate('pricing')">
            <span class="nav-icon">${g("tag")}</span><span>Pricing</span>
          </div>
          ${e?`
          <div class="nav-item ${r.page==="public-dashboard"?"active":""}" onclick="navigate('public-dashboard')">
            <span class="nav-icon">${g("globe")}</span><span>Public Insights</span>
          </div>`:""}
          ${e||s==="developer"?`
          <div class="nav-item ${r.page==="api-docs"?"active":""}" onclick="navigate('api-docs')">
            <span class="nav-icon">${g("book")}</span><span>API Docs</span>
          </div>`:""}
          <div class="nav-item ${r.page==="settings"?"active":""}" onclick="navigate('settings')">
            <span class="nav-icon">${g("settings")}</span><span>Settings</span>
          </div>
          ${s==="admin"||s==="super_admin"?`
          <div class="nav-item ${r.page==="admin-users"?"active":""}" onclick="navigate('admin-users')">
            <span class="nav-icon">${g("users")}</span><span>User Management</span>
          </div>
          ${z({id:"integrations",icon:g("plug"),label:"Integrations"})}`:""}
        </div>`:""}
      </div>
      <div class="sidebar-footer">
        <div class="user-avatar role-${r.user?.role||"operator"}">${(r.user?.email||"U")[0].toUpperCase()}</div>
        <div class="user-info">
          <div class="user-name">${r.user?.email||"User"}</div>
          <div class="user-role"><span class="role-badge role-${r.user?.role||"operator"}">${r.user?.role||"operator"}</span></div>
        </div>
        <button class="btn btn-sm" onclick="doLogout()" title="Logout" aria-label="Logout">${g("logout",18)}</button>
      </div>
    </div>
  `}function Ot(){let t={dashboard:["Dashboard","Real-time overview of trust infrastructure"],scanner:["QR Scanner","Validate products in real-time"],products:["Products","Manage registered products and QR codes"],scans:["Scan History","Audit trail of all scan events"],fraud:["Fraud Center","Monitor and investigate fraud alerts"],blockchain:["Blockchain","Immutable hash seal verification"],events:["Event Stream","Real-time system events"],"scm-dashboard":["Supply Chain","End-to-end supply chain visibility"],"scm-inventory":["Inventory","Stock levels, alerts & AI forecasting"],"scm-logistics":["Logistics","Shipments, IoT & SLA monitoring"],"scm-partners":["Partners","KYC, trust scoring & connector sync"],"scm-leaks":["Leak Monitor","Marketplace scanning & gray market detection"],"scm-trustgraph":["TrustGraph","Network analysis & toxic supplier detection"],kyc:["KYC Business","Business verification, sanction screening & GDPR"],evidence:["Evidence Vault","Tamper-proof digital evidence & blockchain anchoring"],stakeholder:["Trust & Ratings","Community ratings, certifications & compliance"],billing:["Billing & Usage","Plan management, usage metering & invoices"],"public-dashboard":["Public Insights","Platform-wide statistics & transparency dashboard"],"api-docs":["API Documentation","REST API endpoints & integration guide"],settings:["Settings","Security, MFA, password & session management"],"admin-users":["User Management","Manage users, roles & permissions"],integrations:["Integrations","API keys & external service configuration"],"scm-epcis":["EPCIS 2.0","GS1 EPCIS event tracking & compliance"],"scm-ai":["AI Analytics","Holt-Winters forecasting, Monte Carlo risk & demand sensing"],"scm-risk-radar":["Risk Radar","8-dimensional supply chain threat assessment"],"scm-carbon":["Carbon / ESG","Scope 1/2/3 emissions, carbon passport & GRI reporting"],"scm-twin":["Digital Twin","Virtual supply chain model, KPIs & anomaly detection"],sustainability:["Sustainability","Environmental scoring & green certification"],compliance:["GDPR Compliance","Data protection, consent & retention management"],anomaly:["Anomaly Monitor","Real-time anomaly detection & AI scoring"],reports:["Reports","Custom report builder & data export"],nft:["NFT Certificates","Mint, transfer & verify product authentication NFTs"],wallet:["Wallet / Payment","Cryptocurrency wallets & payment management"],branding:["White-Label","Custom branding, themes & logo configuration"]},[s,a]=t[r.page]||["Page",""],e=r.notifications.filter(i=>!i.read).length;return`
    <div class="page-header">
      <div>
        <div class="page-title">${s}</div>
        <div class="page-subtitle">${a}</div>
      </div>
      <div class="header-actions">
        <button class="header-icon-btn" onclick="toggleSearch()" title="Search">
          \u{1F50D}
        </button>
        <div style="position:relative">
          <button class="header-icon-btn" onclick="toggleNotifications()" title="Notifications">
            \u{1F514}
            <span class="notif-count" id="notif-badge" style="display:${e>0?"flex":"none"}">${e>9?"9+":e}</span>
          </button>
          <div class="dropdown-panel" id="notif-panel" style="display:none"></div>
        </div>
        <span class="status-dot green"></span>
        <span style="font-size:0.75rem;color:var(--text-muted)">System Online</span>
      </div>
    </div>
    <div class="dropdown-panel search-panel" id="search-panel" style="display:none;position:fixed;top:60px;left:50%;transform:translateX(-50%);width:560px;z-index:1000">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border)">
        <input class="form-input" id="global-search-input" placeholder="Search products, scans, evidence\u2026" oninput="globalSearch(this.value)" style="width:100%;background:var(--surface)">
      </div>
      <div id="search-results"><div style="padding:20px;text-align:center;color:var(--text-muted);font-size:0.82rem">Type to search\u2026</div></div>
    </div>
  `}function Ht(){switch(r.page){case"dashboard":return Ut();case"scanner":return qt();case"products":return Wt();case"scans":return Gt();case"fraud":return Qt();case"blockchain":return Kt();case"events":return Yt();case"scm-dashboard":return Zt();case"scm-inventory":return Xt();case"scm-logistics":return ts();case"scm-partners":return ss();case"scm-leaks":return as();case"scm-trustgraph":return es();case"kyc":return is();case"evidence":return rs();case"stakeholder":return ns();case"billing":return ls();case"pricing":return os();case"public-dashboard":return ds();case"api-docs":return vs();case"settings":return ps();case"admin-users":return gs();case"integrations":return hs();case"scm-epcis":return ys();case"scm-ai":return bs();case"scm-risk-radar":return xs();case"scm-carbon":return $s();case"scm-twin":return ws();case"scm-network":return Ts();case"supplier-dashboard":return Is();case"sustainability":return _s();case"compliance":return ks();case"anomaly":return Ss();case"reports":return Ps();case"nft":return Cs();case"wallet":return Ms();case"branding":return Es();default:return'<div class="empty-state"><div class="empty-icon">\u{1F50D}</div><div class="empty-text">Page not found</div></div>'}}function Ut(){let t=r.dashboardStats;return t?`
    <div class="stats-grid">
      <div class="stat-card cyan">
        <div class="stat-icon">\u{1F4E6}</div>
        <div class="stat-value">${t.total_products}</div>
        <div class="stat-label">Registered Products</div>
      </div>
      <div class="stat-card violet">
        <div class="stat-icon">\u{1F4F1}</div>
        <div class="stat-value">${t.total_scans}</div>
        <div class="stat-label">Total Scans</div>
        <div class="stat-change up">\u2197 ${t.today_scans} today</div>
      </div>
      <div class="stat-card ${t.open_alerts>0?"rose":"emerald"}">
        <div class="stat-icon">\u{1F6A8}</div>
        <div class="stat-value">${t.open_alerts}</div>
        <div class="stat-label">Open Alerts</div>
      </div>
      <div class="stat-card emerald">
        <div class="stat-icon">\u{1F4CA}</div>
        <div class="stat-value">${t.avg_trust_score}</div>
        <div class="stat-label">Avg Trust Score</div>
      </div>
      <div class="stat-card amber">
        <div class="stat-icon">\u{1F517}</div>
        <div class="stat-value">${t.total_blockchain_seals}</div>
        <div class="stat-label">Blockchain Seals</div>
      </div>
    </div>

    <div class="grid-2-1">
      <div class="card">
        <div class="card-header">
          <div class="card-title">\u{1F4E1} Recent Activity</div>
        </div>
        <div class="table-container">
          <table>
            <tr><th>Product</th><th>Result</th><th>Fraud</th><th>Trust</th><th>Time</th></tr>
            ${(t.recent_activity||[]).map(s=>`
              <tr>
                <td style="font-weight:600;color:var(--text-primary)">${s.product_name||"\u2014"}</td>
                <td><span class="badge ${s.result}">${s.result}</span></td>
                <td style="font-family:'JetBrains Mono';font-size:0.75rem;color:${s.fraud_score>.5?"var(--rose)":"var(--emerald)"}">${(s.fraud_score*100).toFixed(0)}%</td>
                <td style="font-family:'JetBrains Mono';font-size:0.75rem;color:${L(s.trust_score)}">${Math.round(s.trust_score)}</td>
                <td class="event-time">${S(s.scanned_at)}</td>
              </tr>
            `).join("")}
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">\u{1F4E1} Live Events</div>
        </div>
        <div class="event-feed" id="event-feed">${J()}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">\u{1F4C8} Scan Results Distribution</div></div>
        <div style="position:relative;height:260px;padding:10px"><canvas id="scanDoughnutChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><span class="status-icon status-warn" aria-label="Warning">!</span> Alert Severity</div></div>
        <div style="position:relative;height:260px;padding:10px"><canvas id="alertPolarChart"></canvas></div>
      </div>
    </div>
  `:'<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading dashboard...</span></div>'}function Vt(){let t=r.dashboardStats;if(!t)return;let s=t.scans_by_result||[],a=document.getElementById("scanDoughnutChart");if(a&&s.length){let l={valid:"#00d264",warning:"#ffa500",suspicious:"#ff6b6b",counterfeit:"#ff3366",pending:"#636e7b"};new Chart(a,{type:"doughnut",data:{labels:s.map(o=>o.result),datasets:[{data:s.map(o=>o.count),backgroundColor:s.map(o=>l[o.result]||"#00d2ff"),borderWidth:0,borderRadius:4}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom",labels:{color:"#c8d6e5",padding:12,usePointStyle:!0,font:{family:"Inter",size:11}}}},cutout:"65%"}})}let e=t.alerts_by_severity||[],i=document.getElementById("alertPolarChart");if(i&&e.length){let l={critical:"#ff3366",high:"#ffa500",medium:"#a855f7",low:"#00d2ff"};new Chart(i,{type:"polarArea",data:{labels:e.map(o=>o.severity),datasets:[{data:e.map(o=>o.count),backgroundColor:e.map(o=>(l[o.severity]||"#00d2ff")+"99"),borderWidth:0}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom",labels:{color:"#c8d6e5",padding:12,usePointStyle:!0,font:{family:"Inter",size:11}}}},scales:{r:{ticks:{display:!1},grid:{color:"rgba(255,255,255,0.06)"}}}}})}}function J(){return r.events.length?r.events.slice(0,20).map(t=>`
    <div class="event-item">
      <div class="event-icon">${Lt(t.type)}</div>
      <div class="event-content">
        <div class="event-title">${t.type}</div>
        <div class="event-desc">${t.data?.product_name||t.data?.message||t.data?.type||JSON.stringify(t.data||{}).substring(0,60)}</div>
      </div>
      <div class="event-time">${t.timestamp?S(t.timestamp):"now"}</div>
    </div>
  `).join(""):'<div class="empty-state"><div class="empty-icon">\u{1F4E1}</div><div class="empty-text">Waiting for events...</div></div>'}function qt(){return`
    <div class="grid-2">
      <div>
        <div class="card" style="margin-bottom:20px">
          <div class="card-header"><div class="card-title">\u{1F4F1} Scan QR Code</div></div>
          <div class="qr-scanner-area" id="scanner-area">
            <div class="scanner-icon">\u{1F4F7}</div>
            <div class="scanner-text">Enter QR data below or paste a product ID to validate</div>
          </div>
          <div style="margin-top:16px">
            <div class="input-group">
              <label>QR Data / Product Code</label>
              <input class="input" id="qr-input" type="text" placeholder="Paste or type QR code data here...">
            </div>
            <div style="display:flex;gap:10px">
              <button class="btn btn-primary" onclick="validateQR()" style="flex:1">\u{1F50D} Validate</button>
              <button class="btn" onclick="simulateRandomScan()">\u{1F3B2} Random Test</button>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div class="card">
          <div class="card-header"><div class="card-title">\u{1F4CB} Validation Result</div></div>
          <div id="scan-result">${r.scanResult?Jt(r.scanResult):'<div class="empty-state"><div class="empty-icon">\u{1F50D}</div><div class="empty-text">Scan a QR code to see results</div></div>'}</div>
        </div>
      </div>
    </div>
  `}function Jt(t){return t?`
    <div class="qr-result ${t.result}">
      <div style="font-size:1.5rem;font-weight:900;margin-bottom:8px">${t.message}</div>
      <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:12px">
        Response: ${t.response_time_ms}ms \u2022 Scan ID: ${t.scan_id?.substring(0,8)||"\u2014"}
      </div>
    </div>
    ${t.product?`
    <div style="margin-top:16px">
      <div style="font-weight:700;margin-bottom:8px">\u{1F4E6} Product Details</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.8rem">
        <div style="color:var(--text-muted)">Name</div><div>${t.product.name}</div>
        <div style="color:var(--text-muted)">SKU</div><div style="font-family:'JetBrains Mono'">${t.product.sku}</div>
        <div style="color:var(--text-muted)">Manufacturer</div><div>${t.product.manufacturer||"\u2014"}</div>
        <div style="color:var(--text-muted)">Origin</div><div>${t.product.origin_country||"\u2014"}</div>
      </div>
    </div>`:""}
    <div style="margin-top:16px">
      <div style="font-weight:700;margin-bottom:8px">\u{1F50D} Fraud Analysis</div>
      <div class="factor-bar-container">
        <div class="factor-bar-label"><span>Fraud Score</span><span style="color:${t.fraud?.score>.5?"var(--rose)":"var(--emerald)"}">${(t.fraud?.score*100).toFixed(1)}%</span></div>
        <div class="factor-bar"><div class="fill" style="width:${t.fraud?.score*100}%;background:${t.fraud?.score>.5?"var(--rose)":t.fraud?.score>.2?"var(--amber)":"var(--emerald)"}"></div></div>
      </div>
      ${(t.fraud?.details||[]).map(s=>`<div style="font-size:0.75rem;padding:4px 0;color:var(--text-secondary)"><span class="badge ${s.severity}" style="margin-right:6px">${s.severity}</span>${s.description}</div>`).join("")}
    </div>
    <div style="margin-top:16px">
      <div style="font-weight:700;margin-bottom:8px">\u{1F4CA} Trust Score</div>
      <div class="trust-gauge" style="flex-direction:row;gap:16px;justify-content:flex-start">
        <div class="gauge-circle" style="width:70px;height:70px;font-size:1.3rem">${t.trust?.score||0}</div>
        <div><div class="gauge-grade" style="font-size:1.2rem">${t.trust?.grade||"\u2014"}</div><div class="gauge-label">Trust Grade</div></div>
      </div>
    </div>
    <div style="margin-top:16px">
      <div style="font-weight:700;margin-bottom:8px">\u{1F517} Blockchain Seal</div>
      <div style="font-size:0.75rem;color:var(--text-secondary)">
        <span class="badge sealed"><span class="status-icon status-pass" aria-label="Pass">\u2713</span> Sealed</span> Block #${t.blockchain?.block_index||"\u2014"}<br>
        <span style="font-family:'JetBrains Mono';font-size:0.68rem;color:var(--text-muted)">Hash: ${R(t.blockchain?.data_hash)}</span>
      </div>
    </div>
  `:""}function Wt(){return`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;gap:12px">
      <input class="input" style="max-width:300px" placeholder="Search products..." oninput="searchProducts(this.value)">
      <div style="display:flex;gap:8px">
        <button class="btn" onclick="exportProductsCSV()" title="Export CSV">\u{1F4CA} Export CSV</button>
        <button class="btn btn-primary" onclick="showAddProduct()">+ Add Product</button>
      </div>
    </div>
    <div class="product-grid" id="product-grid">
      ${r.products.length?r.products.map(t=>`
        <div class="product-card" onclick="showProductDetail('${t.id}')">
          <div class="product-name">${t.name}</div>
          <div class="product-sku">${t.sku}</div>
          <div class="product-meta">
            <span class="product-category">${t.category||"General"}</span>
            <div class="trust-gauge" style="flex-direction:row;gap:8px">
              <span style="font-family:'JetBrains Mono';font-weight:800;color:${L(t.trust_score)}">${Math.round(t.trust_score)}</span>
              <span style="font-size:0.65rem;color:var(--text-muted)">Trust</span>
            </div>
          </div>
          <div style="margin-top:8px;font-size:0.7rem;color:var(--text-muted)">
            ${t.manufacturer?"\u{1F3ED} "+t.manufacturer:""} ${t.origin_country?"\u{1F30D} "+t.origin_country:""}
          </div>
          <div style="margin-top:6px"><span class="badge ${t.status==="active"?"valid":"warning"}">${t.status}</span></div>
        </div>
      `).join(""):'<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">\u{1F4E6}</div><div class="empty-text">No products yet</div></div>'}
    </div>
  `}function Gt(){return`
    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-title">\u{1F50D} All Scan Events</div>
        <button class="btn btn-sm" onclick="exportScansCSV()">\u{1F4CA} Export CSV</button>
      </div>
      <div class="table-container">
        <table>
          <tr><th>Product</th><th>Result</th><th>Fraud %</th><th>Trust</th><th>City</th><th>Response</th><th>Time</th></tr>
          ${(r.scanHistory||[]).map(t=>`
            <tr>
              <td style="font-weight:600;color:var(--text-primary)">${t.product_name||"\u2014"}</td>
              <td><span class="badge ${t.result}">${t.result}</span></td>
              <td style="font-family:'JetBrains Mono';font-size:0.75rem;color:${t.fraud_score>.5?"var(--rose)":"var(--emerald)"}">${(t.fraud_score*100).toFixed(0)}%</td>
              <td style="font-family:'JetBrains Mono';font-size:0.75rem;color:${L(t.trust_score)}">${Math.round(t.trust_score)}</td>
              <td style="font-size:0.75rem">${t.geo_city||"\u2014"}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${t.response_time_ms}ms</td>
              <td class="event-time">${S(t.scanned_at)}</td>
            </tr>
          `).join("")}
        </table>
      </div>
    </div>
  `}function Qt(){return`
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
      <div class="stat-card rose"><div class="stat-icon"><span class="status-dot red"></span></div><div class="stat-value">${r.fraudAlerts.filter(t=>t.severity==="critical").length}</div><div class="stat-label">Critical</div></div>
      <div class="stat-card amber"><div class="stat-icon"><span class="status-dot amber"></span></div><div class="stat-value">${r.fraudAlerts.filter(t=>t.severity==="high").length}</div><div class="stat-label">High</div></div>
      <div class="stat-card violet"><div class="stat-icon">\u{1F7E3}</div><div class="stat-value">${r.fraudAlerts.filter(t=>t.severity==="medium").length}</div><div class="stat-label">Medium</div></div>
      <div class="stat-card cyan"><div class="stat-icon"><span class="status-dot blue"></span></div><div class="stat-value">${r.fraudAlerts.filter(t=>t.severity==="low").length}</div><div class="stat-label">Low</div></div>
    </div>
    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-title">\u{1F6A8} Active Fraud Alerts</div>
        <button class="btn btn-sm" onclick="exportFraudCSV()">\u{1F4CA} Export CSV</button>
      </div>
      <div class="table-container">
        <table>
          <tr><th>Severity</th><th>Type</th><th>Product</th><th>Description</th><th>Time</th></tr>
          ${(r.fraudAlerts||[]).map(t=>`
            <tr>
              <td><span class="badge ${t.severity}">${t.severity}</span></td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${t.alert_type}</td>
              <td style="font-weight:600">${t.product_name||"\u2014"}</td>
              <td style="font-size:0.78rem;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.description}</td>
              <td class="event-time">${S(t.created_at)}</td>
            </tr>
          `).join("")}
        </table>
      </div>
      ${r.fraudAlerts.length?"":'<div class="empty-state"><div class="empty-icon"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span></div><div class="empty-text">No active fraud alerts</div></div>'}
    </div>
  `}function Kt(){let t=r.blockchain;return t?`
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card emerald">
        <div class="stat-icon">\u{1F517}</div>
        <div class="stat-value">${t.stats?.total_seals||0}</div>
        <div class="stat-label">Total Blocks</div>
      </div>
      <div class="stat-card ${t.stats?.chain_integrity?.valid?"emerald":"rose"}">
        <div class="stat-icon">${t.stats?.chain_integrity?.valid?'<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span>':'<span class="status-icon status-fail" aria-label="Fail">\u2717</span>'}</div>
        <div class="stat-value">${t.stats?.chain_integrity?.valid?"VALID":"BROKEN"}</div>
        <div class="stat-label">Chain Integrity</div>
      </div>
      <div class="stat-card violet">
        <div class="stat-icon">\u{1F333}</div>
        <div class="stat-value">${R(t.stats?.latest_merkle_root)}</div>
        <div class="stat-label" style="font-size:0.6rem">Latest Merkle Root</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><div class="card-title">\u26D3 Chain Visualization</div></div>
      <div style="overflow-x:auto;padding:10px 0;display:flex;align-items:center;flex-wrap:wrap">
        ${(t.recent_seals||[]).slice(0,10).reverse().map((s,a)=>`
          ${a>0?'<span class="chain-arrow">\u2192</span>':""}
          <div class="chain-block">
            <div class="block-index">Block #${s.block_index}</div>
            <div class="block-hash">\u{1F511} ${R(s.data_hash)}</div>
            <div style="font-size:0.65rem;color:var(--text-muted);margin-top:4px">${s.event_type}</div>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">\u{1F4DC} Recent Seals</div></div>
      <div class="table-container">
        <table>
          <tr><th>Block</th><th>Event</th><th>Data Hash</th><th>Prev Hash</th><th>Merkle Root</th><th>Time</th></tr>
          ${(t.recent_seals||[]).map(s=>`
            <tr>
              <td style="font-family:'JetBrains Mono';font-weight:700;color:var(--cyan)">#${s.block_index}</td>
              <td>${s.event_type}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.7rem">${R(s.data_hash)}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.7rem">${R(s.prev_hash)}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.7rem">${R(s.merkle_root)}</td>
              <td class="event-time">${S(s.sealed_at)}</td>
            </tr>
          `).join("")}
        </table>
      </div>
    </div>
  `:'<div class="loading"><div class="spinner"></div></div>'}function Yt(){return`
    <div class="card">
      <div class="card-header">
        <div class="card-title">\u{1F4E1} Real-Time Event Stream</div>
        <span style="font-size:0.7rem;color:var(--text-muted)">${r.events.length} events captured</span>
      </div>
      <div class="event-feed" style="max-height:600px" id="event-feed">${J()}</div>
    </div>
  `}function Zt(){let t=r.scmDashboard;return t?`
    <div class="stats-grid">
      <div class="stat-card cyan"><div class="stat-icon">\u{1F4E6}</div><div class="stat-value">${t.total_batches}</div><div class="stat-label">Batches</div></div>
      <div class="stat-card violet"><div class="stat-icon">\u{1F517}</div><div class="stat-value">${t.total_events}</div><div class="stat-label">SCM Events</div></div>
      <div class="stat-card emerald"><div class="stat-icon">\u{1F91D}</div><div class="stat-value">${t.total_partners}</div><div class="stat-label">Partners</div></div>
      <div class="stat-card amber"><div class="stat-icon">\u{1F69A}</div><div class="stat-value">${t.active_shipments}</div><div class="stat-label">Active Shipments</div></div>
      <div class="stat-card ${t.open_leaks>0?"rose":"emerald"}"><div class="stat-icon">\u{1F50D}</div><div class="stat-value">${t.open_leaks}</div><div class="stat-label">Open Leaks</div></div>
      <div class="stat-card ${t.sla_violations>0?"amber":"emerald"}"><div class="stat-icon"><span class="status-icon status-warn" aria-label="Warning">!</span></div><div class="stat-value">${t.sla_violations}</div><div class="stat-label">SLA Violations</div></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">\u{1F4CA} Events by Type</div></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${(t.events_by_type||[]).map(s=>`
            <div class="factor-bar-container">
              <div class="factor-bar-label"><span><span class="badge valid">${s.event_type}</span></span><span>${s.count}</span></div>
              <div class="factor-bar"><div class="fill" style="width:${Math.min(100,s.count/Math.max(...t.events_by_type.map(a=>a.count))*100)}%;background:var(--cyan)"></div></div>
            </div>
          `).join("")}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">\u{1F4E1} Recent SCM Events</div></div>
        <div class="table-container">
          <table>
            <tr><th>Type</th><th>Product</th><th>Partner</th></tr>
            ${(t.recent_events||[]).slice(0,8).map(s=>`
              <tr>
                <td><span class="badge valid">${s.event_type}</span></td>
                <td style="font-size:0.78rem">${s.product_name||"\u2014"}</td>
                <td style="font-size:0.78rem">${s.partner_name||"\u2014"}</td>
              </tr>
            `).join("")}
          </table>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F4C8} SCM Health</div></div>
      <div class="scm-health">
        <div class="scm-health-item">
          <div class="scm-health-value" style="color:var(--emerald)">${t.avg_partner_trust}</div>
          <div class="scm-health-label">Avg Partner Trust</div>
        </div>
        <div class="scm-health-item">
          <div class="scm-health-value" style="color:var(--cyan)">${t.total_shipments}</div>
          <div class="scm-health-label">Total Shipments</div>
        </div>
        <div class="scm-health-item">
          <div class="scm-health-value" style="color:${t.open_leaks>5?"var(--rose)":"var(--emerald)"}">${t.open_leaks>0?'<span class="status-icon status-warn" aria-label="Warning">!</span>':'<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span>'}</div>
          <div class="scm-health-label">${t.open_leaks>0?"Leaks Detected":"No Leaks"}</div>
        </div>
      </div>
    </div>
  `:'<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading supply chain data...</span></div>'}function Xt(){let t=r.scmInventory,s=r.scmForecast;if(!t)return'<div class="loading"><div class="spinner"></div></div>';let a=t.inventory||[];return`
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card cyan"><div class="stat-icon">\u{1F4CB}</div><div class="stat-value">${a.length}</div><div class="stat-label">Inventory Records</div></div>
      <div class="stat-card emerald"><div class="stat-icon">\u{1F4E6}</div><div class="stat-value">${a.reduce((e,i)=>e+i.quantity,0)}</div><div class="stat-label">Total Units</div></div>
      <div class="stat-card ${s?.alert?"amber":"emerald"}"><div class="stat-icon">${s?.alert?'<span class="status-icon status-warn" aria-label="Warning">!</span>':"\u{1F4C8}"}</div><div class="stat-value">${s?.trend||"stable"}</div><div class="stat-label">Forecast Trend</div></div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">\u{1F4E6} Current Stock</div></div>
        <div class="table-container">
          <table>
            <tr><th>Product</th><th>Location</th><th>Qty</th><th>Min</th><th>Max</th><th>Status</th></tr>
            ${a.map(e=>{let i=e.quantity<=e.min_stock?"low":e.quantity>=e.max_stock?"high":"ok";return`
              <tr>
                <td style="font-weight:600">${e.product_name||e.sku||"\u2014"}</td>
                <td style="font-size:0.78rem">${e.location||"\u2014"}</td>
                <td style="font-family:'JetBrains Mono';font-weight:700;color:${i==="low"?"var(--rose)":i==="high"?"var(--amber)":"var(--emerald)"}">${e.quantity}</td>
                <td style="font-family:'JetBrains Mono';font-size:0.72rem">${e.min_stock}</td>
                <td style="font-family:'JetBrains Mono';font-size:0.72rem">${e.max_stock}</td>
                <td><span class="badge ${i==="low"?"suspicious":i==="high"?"warning":"valid"}">${i==="low"?"Understock":i==="high"?"Overstock":"Normal"}</span></td>
              </tr>
            `}).join("")}
          </table>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">\u{1F916} AI Forecast</div></div>
        ${s?`
          <div class="forecast-panel">
            <div class="forecast-row">
              <span>Trend: <strong style="color:var(--cyan)">${s.trend}</strong></span>
              <span>Confidence: <strong>${Math.round((s.confidence||0)*100)}%</strong></span>
            </div>
            ${s.alert?`<div class="forecast-alert"><span class="status-icon status-warn" aria-label="Warning">!</span> ${s.alert.message} (${s.alert.severity})</div>`:""}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${(s.forecast||[]).map(e=>`
              <div class="factor-bar-container">
                <div class="factor-bar-label"><span>Day ${e.period}</span><span style="font-family:'JetBrains Mono'">${e.predicted} units</span></div>
                <div class="factor-bar"><div class="fill" style="width:${Math.min(100,e.predicted/Math.max(...(s.forecast||[]).map(i=>i.upper||1))*100)}%;background:var(--cyan)"></div></div>
              </div>
            `).join("")}
          </div>
        `:'<div class="empty-state"><div class="empty-text">Insufficient data for forecast</div></div>'}
      </div>
    </div>
  `}function ts(){let t=r.scmShipments,s=r.scmSlaViolations,a=r.scmOptimization;if(!t)return'<div class="loading"><div class="spinner"></div></div>';let e=t.shipments||[],i=s?.violations||[];return`
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card cyan"><div class="stat-icon">\u{1F69A}</div><div class="stat-value">${e.length}</div><div class="stat-label">Shipments</div></div>
      <div class="stat-card emerald"><div class="stat-icon"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span></div><div class="stat-value">${e.filter(l=>l.status==="delivered").length}</div><div class="stat-label">Delivered</div></div>
      <div class="stat-card amber"><div class="stat-icon">\u{1F69B}</div><div class="stat-value">${e.filter(l=>l.status==="in_transit").length}</div><div class="stat-label">In Transit</div></div>
      <div class="stat-card ${i.length>0?"rose":"emerald"}"><div class="stat-icon"><span class="status-icon status-warn" aria-label="Warning">!</span></div><div class="stat-value">${i.length}</div><div class="stat-label">SLA Breaches</div></div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><div class="card-title">\u{1F69A} Active Shipments</div></div>
      <div class="table-container">
        <table>
          <tr><th>Tracking</th><th>From</th><th>To</th><th>Carrier</th><th>Status</th><th>ETA</th></tr>
          ${e.map(l=>`
            <tr>
              <td class="shipment-tracking">${l.tracking_number||"\u2014"}</td>
              <td style="font-size:0.78rem">${l.from_name||"\u2014"}</td>
              <td style="font-size:0.78rem">${l.to_name||"\u2014"}</td>
              <td style="font-size:0.78rem">${l.carrier||"\u2014"}</td>
              <td><span class="badge ${l.status==="delivered"?"valid":l.status==="in_transit"?"warning":"suspicious"}">${l.status}</span></td>
              <td class="shipment-eta">${l.estimated_delivery?S(l.estimated_delivery):"\u2014"}</td>
            </tr>
          `).join("")}
        </table>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title"><span class="status-icon status-warn" aria-label="Warning">!</span> SLA Violations</div></div>
        ${i.length?`
          <div class="table-container">
            <table>
              <tr><th>Partner</th><th>Type</th><th>Actual</th><th>Threshold</th><th>Penalty</th></tr>
              ${i.map(l=>`
                <tr>
                  <td style="font-weight:600">${l.partner_name||"\u2014"}</td>
                  <td><span class="badge warning">${l.violation_type}</span></td>
                  <td style="font-family:'JetBrains Mono';color:var(--rose)">${Math.round(l.actual_value)}h</td>
                  <td style="font-family:'JetBrains Mono'">${l.threshold_value}h</td>
                  <td style="font-family:'JetBrains Mono';color:var(--amber)">$${l.penalty_amount}</td>
                </tr>
              `).join("")}
            </table>
          </div>
        `:'<div class="empty-state"><div class="empty-icon"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span></div><div class="empty-text">No SLA violations</div></div>'}
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">\u{1F916} AI Optimization</div></div>
         ${a?`
          <div class="ai-panel">
            <div class="ai-panel-title">\u{1F9E0} Delay Prediction</div>
            <div class="ai-panel-grid">
              <div>Predicted Delay: <strong style="color:${a.delay_prediction?.risk==="high"?"var(--rose)":"var(--emerald)"}">${a.delay_prediction?.predicted_delay_hours||0}h</strong></div>
              <div>Risk: <span class="badge ${a.delay_prediction?.risk==="high"?"suspicious":a.delay_prediction?.risk==="medium"?"warning":"valid"}">${a.delay_prediction?.risk||"low"}</span></div>
              <div>Confidence: ${Math.round((a.delay_prediction?.confidence||0)*100)}%</div>
              <div>Samples: ${a.delay_prediction?.samples||0}</div>
            </div>
          </div>
          <div class="ai-panel">
            <div class="ai-panel-title">\u{1F4CA} Bottleneck Detection</div>
            <div class="ai-panel-grid">
              <div>Network Health: <span class="badge ${a.bottlenecks?.health==="healthy"?"valid":a.bottlenecks?.health==="warning"?"warning":"suspicious"}">${a.bottlenecks?.health||"unknown"}</span></div>
              <div>Bottlenecks: <strong>${a.bottlenecks?.bottleneck_count||0}</strong> / ${a.bottlenecks?.total_nodes||0} nodes</div>
            </div>
          </div>
        `:""}
      </div>
    </div>
  `}function ss(){let t=r.scmPartners||[];return`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div style="font-size:0.82rem;color:var(--text-muted)">${t.length} partners onboarded</div>
      <div style="display:flex;gap:10px">
        <button class="btn" onclick="syncConnectors()">\u{1F504} Sync Connectors</button>
        <button class="btn" onclick="checkConnectorStatus()">\u{1F50C} Connector Status</button>
      </div>
    </div>

    <div class="product-grid">
      ${t.map((s,a)=>`
        <div class="partner-card scm-animate" data-type="${(s.type||"").toLowerCase()}" onclick="showPartnerDetail('${s.id}')">
          <div class="partner-header">
            <div>
              <div class="partner-name">${s.name}</div>
              <div class="partner-type">${s.type} \u2022 ${s.country||"\u2014"}</div>
            </div>
            <span class="badge ${s.kyc_status==="verified"?"valid":s.kyc_status==="pending"?"warning":"suspicious"}">${s.kyc_status==="verified"?'<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span> KYC':s.kyc_status==="pending"?"\u23F3 Pending":'<span class="status-icon status-fail" aria-label="Fail">\u2717</span> Failed'}</span>
          </div>
          <div class="partner-meta">
            <div class="partner-trust">
              <span class="partner-trust-score" style="color:${L(s.trust_score)}">${s.trust_score}</span>
              <span class="partner-trust-label">Trust</span>
            </div>
            <span class="badge ${s.risk_level==="low"?"valid":s.risk_level==="medium"?"warning":"suspicious"}">${s.risk_level||"\u2014"} risk</span>
          </div>
          <div class="partner-email">${s.contact_email||""}</div>
        </div>
      `).join("")}
    </div>
  `}function as(){let t=r.scmLeaks;return t?`
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat-card rose"><div class="stat-icon">\u{1F50D}</div><div class="stat-value">${t.open}</div><div class="stat-label">Open Leaks</div></div>
      <div class="stat-card emerald"><div class="stat-icon"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span></div><div class="stat-value">${t.resolved}</div><div class="stat-label">Resolved</div></div>
      <div class="stat-card cyan"><div class="stat-icon">\u{1F4CA}</div><div class="stat-value">${t.total}</div><div class="stat-label">Total Alerts</div></div>
    </div>

    <div style="margin-bottom:20px">
      <button class="leak-scan-btn" onclick="runLeakScan()">\u{1F50D} Run Marketplace Scan</button>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header"><div class="card-title">\u{1F6D2} By Platform</div></div>
        ${(t.by_platform||[]).length?`
          <div style="display:flex;flex-direction:column;gap:8px">
            ${(t.by_platform||[]).map(s=>`
              <div class="factor-bar-container leak-platform-bar">
                <div class="factor-bar-label"><span>${s.platform}</span><span>${s.count} alerts (risk: ${Math.round((s.avg_risk||0)*100)}%)</span></div>
                <div class="factor-bar"><div class="fill" style="width:${Math.min(100,s.count/Math.max(...(t.by_platform||[]).map(a=>a.count))*100)}%"></div></div>
              </div>
            `).join("")}
          </div>
        `:'<div class="empty-state"><div class="empty-text">No leaks detected</div></div>'}
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">\u{1F4E6} Top Leaked Products</div></div>
        ${(t.top_products||[]).length?`
          <div class="table-container">
            <table>
              <tr><th>Product</th><th>Leaks</th><th>Avg Risk</th></tr>
              ${(t.top_products||[]).map(s=>`
                <tr>
                  <td style="font-weight:600">${s.product_name||"\u2014"}</td>
                  <td style="font-family:'JetBrains Mono'">${s.leak_count}</td>
                  <td style="font-family:'JetBrains Mono';color:var(--rose)">${Math.round((s.avg_risk||0)*100)}%</td>
                </tr>
              `).join("")}
            </table>
          </div>
        `:'<div class="empty-state"><div class="empty-text">No product leaks</div></div>'}
      </div>
    </div>

    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F3E2} Distributor Risk</div></div>
      ${(t.distributor_risk||[]).length?`
        <div class="table-container">
          <table>
            <tr><th>Distributor</th><th>Leak Count</th><th>Avg Risk</th></tr>
            ${(t.distributor_risk||[]).map(s=>`
              <tr>
                <td style="font-weight:600">${s.name||"\u2014"}</td>
                <td style="font-family:'JetBrains Mono'">${s.leak_count}</td>
                <td style="font-family:'JetBrains Mono';color:${(s.avg_risk||0)>.7?"var(--rose)":"var(--amber)"}">${Math.round((s.avg_risk||0)*100)}%</td>
              </tr>
            `).join("")}
          </table>
        </div>
      `:'<div class="empty-state"><div class="empty-text">No distributor risk data</div></div>'}
    </div>
  `:'<div class="loading"><div class="spinner"></div></div>'}function es(){let t=r.scmGraph;if(!t)return'<div class="loading"><div class="spinner"></div></div>';let s=t.nodes||[],a=s.filter(e=>e.is_toxic);return`
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="stat-card cyan"><div class="stat-icon">\u{1F578}\uFE0F</div><div class="stat-value">${t.total_nodes}</div><div class="stat-label">Nodes</div></div>
      <div class="stat-card violet"><div class="stat-icon">\u{1F517}</div><div class="stat-value">${t.total_edges}</div><div class="stat-label">Edges</div></div>
      <div class="stat-card ${t.network_health==="healthy"?"emerald":"rose"}"><div class="stat-icon">${t.network_health==="healthy"?'<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span>':'<span class="status-icon status-warn" aria-label="Warning">!</span>'}</div><div class="stat-value">${t.network_health}</div><div class="stat-label">Network Health</div></div>
      <div class="stat-card ${a.length>0?"rose":"emerald"}"><div class="stat-icon">\u2620\uFE0F</div><div class="stat-value">${t.toxic_count}</div><div class="stat-label">Toxic Nodes</div></div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><div class="card-title">\u{1F4CA} Risk Distribution</div></div>
      <div class="risk-pills">
        ${Object.entries(t.risk_distribution||{}).map(([e,i])=>`
          <div class="risk-pill ${e}">
            <div class="risk-pill-value">${i}</div>
            <div class="risk-pill-label">${e}</div>
          </div>
        `).join("")}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">\u{1F578}\uFE0F Network Nodes (PageRank Analysis)</div></div>
      <div class="table-container">
        <table>
          <tr><th>Node</th><th>Type</th><th>PageRank</th><th>Centrality</th><th>Trust</th><th>Alerts</th><th>Toxicity</th><th>Risk</th></tr>
          ${s.slice(0,20).map(e=>`
            <tr class="${e.is_toxic?"toxic-node":""}">
              <td style="font-weight:600">${e.name||e.id?.substring(0,8)}</td>
              <td><span class="badge ${(e.type||"").toLowerCase()}">${e.type}</span></td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${e.pagerank}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${e.centrality}</td>
              <td class="stock-qty" style="color:${L(e.trust_score)}">${e.trust_score}</td>
              <td style="font-family:'JetBrains Mono';color:${e.alert_count>0?"var(--rose)":"var(--text-muted)"}">${e.alert_count}</td>
              <td style="font-family:'JetBrains Mono';font-weight:700;color:${e.toxicity_score>.5?"var(--rose)":e.toxicity_score>.3?"var(--amber)":"var(--emerald)"}">${e.toxicity_score}</td>
              <td><span class="badge ${e.risk_level==="critical"?"suspicious":e.risk_level==="high"?"warning":"valid"}">${e.risk_level}</span></td>
            </tr>
          `).join("")}
        </table>
      </div>
    </div>
  `}function is(){let t=r.kycData;if(!t)return'<div class="empty-state"><div class="empty-icon">\u23F3</div><div class="empty-text">Loading KYC data\u2026</div></div>';let s=t.stats;return`
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${s.total_businesses}</div><div class="stat-label">Total Businesses</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--emerald)">${s.verified}</div><div class="stat-label">Verified</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--amber)">${s.pending}</div><div class="stat-label">Pending</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--rose)">${s.high_risk}</div><div class="stat-label">High Risk</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--rose)">${s.pending_sanctions}</div><div class="stat-label">Sanction Hits</div></div>
      <div class="stat-card"><div class="stat-value">${s.verification_rate}%</div><div class="stat-label">Verification Rate</div></div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">\u{1F3E2} Registered Businesses</div>
        <button class="btn btn-primary" onclick="showKycVerify()">+ Verify Business</button>
      </div>
      <div class="table-container">
        <table>
          <tr><th>Business</th><th>Reg #</th><th>Country</th><th>Industry</th><th>Risk</th><th>Status</th><th>Checks</th><th>Sanctions</th><th>Actions</th></tr>
          ${t.businesses.map(a=>`
            <tr>
              <td style="font-weight:600">${a.name}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${a.registration_number||"\u2014"}</td>
              <td>${a.country}</td>
              <td>${a.industry}</td>
              <td><span class="badge ${a.risk_level==="low"?"valid":a.risk_level==="high"||a.risk_level==="critical"?"suspicious":"warning"}">${a.risk_level}</span></td>
              <td><span class="badge ${a.verification_status==="verified"?"valid":a.verification_status==="rejected"?"suspicious":"warning"}">${a.verification_status}</span></td>
              <td style="text-align:center">${a.check_count||0}</td>
              <td style="text-align:center;color:${a.pending_sanctions>0?"var(--rose)":"var(--text-muted)"}">${a.pending_sanctions||0}</td>
              <td>
                ${a.verification_status==="pending"?`
                  <button class="btn btn-sm" onclick="kycApprove('${a.id}')"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span> Approve</button>
                  <button class="btn btn-sm" onclick="kycReject('${a.id}')" style="margin-left:4px"><span class="status-icon status-fail" aria-label="Fail">\u2717</span> Reject</button>
                `:"\u2014"}
              </td>
            </tr>
          `).join("")}
        </table>
      </div>
    </div>
  `}function rs(){let t=r.evidenceData;if(!t)return'<div class="empty-state"><div class="empty-icon">\u23F3</div><div class="empty-text">Loading Evidence Vault\u2026</div></div>';let s=t.stats,a=e=>e>=1048576?(e/1048576).toFixed(1)+" MB":e>=1024?(e/1024).toFixed(0)+" KB":e+" B";return`
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${s.total_items}</div><div class="stat-label">Total Evidence</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--emerald)">${s.anchored}</div><div class="stat-label">Anchored</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--cyan)">${s.verified}</div><div class="stat-label">Verified</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--rose)">${s.tampered}</div><div class="stat-label">Tampered</div></div>
      <div class="stat-card"><div class="stat-value">${s.total_size_mb} MB</div><div class="stat-label">Storage Used</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--emerald)">${s.integrity_rate}%</div><div class="stat-label">Integrity Rate</div></div>
    </div>

    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-title">\u{1F512} Evidence Items</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm" onclick="exportEvidenceCSV()">\u{1F4CA} Export CSV</button>
          <button class="btn btn-primary" onclick="showUploadEvidence()">+ Upload Evidence</button>
        </div>
      </div>
      <div class="table-container">
        <table>
          <tr><th>Title</th><th>Description</th><th>Type</th><th>Size</th><th>SHA-256</th><th>Status</th><th>Uploaded</th><th>Actions</th></tr>
          ${t.items.map(e=>`
            <tr>
              <td style="font-weight:600">${e.title}</td>
              <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.description}</td>
              <td><span class="badge">${e.file_type?.split("/")[1]||"file"}</span></td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${a(e.file_size)}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.68rem;color:var(--cyan)">${e.sha256_hash?.substring(0,12)}\u2026</td>
              <td><span class="badge ${e.verification_status==="anchored"||e.verification_status==="verified"?"valid":"suspicious"}">${e.verification_status}</span></td>
              <td style="font-size:0.75rem;color:var(--text-muted)">${S(e.created_at)}</td>
              <td>
                <button class="btn btn-sm" onclick="verifyEvidence('${e.id}')">\u{1F50D} Verify</button>
                <button class="btn btn-sm" onclick="exportEvidence('${e.id}')" style="margin-left:4px">\u{1F4C4} Export</button>
                <button class="btn btn-sm" onclick="downloadForensicReport('${e.id}')" style="margin-left:4px">\u{1F4CB} Forensic</button>
              </td>
            </tr>
          `).join("")}
        </table>
      </div>
    </div>
  `}function ns(){let t=r.stakeholderData;if(!t)return'<div class="empty-state"><div class="empty-icon">\u23F3</div><div class="empty-text">Loading Trust data\u2026</div></div>';let s=t.dashboard,a=(i,l)=>{let o=l>0?i/l*100:0;return`<div style="display:flex;align-items:center;gap:8px">
      <span style="width:10px;font-size:0.75rem">${i}</span>
      <div style="flex:1;height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden">
        <div style="width:${o}%;height:100%;background:var(--amber);border-radius:4px"></div>
      </div>
    </div>`},e=Math.max(...Object.values(s.ratings.distribution||{}),1);return`
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value" style="color:var(--amber)">\u2B50 ${s.ratings.average}</div><div class="stat-label">${s.ratings.total} Ratings</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--emerald)">${s.certifications.active}</div><div class="stat-label">Active Certs</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--rose)">${s.certifications.expired}</div><div class="stat-label">Expired Certs</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--emerald)">${s.compliance.rate}%</div><div class="stat-label">Compliance Rate</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--rose)">${s.compliance.non_compliant}</div><div class="stat-label">Non-Compliant</div></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 2fr;gap:var(--gap)">
      <div class="card">
        <div class="card-header"><div class="card-title">\u2B50 Rating Distribution</div></div>
        <div style="padding:0 var(--gap) var(--gap);display:flex;flex-direction:column;gap:6px">
          ${[5,4,3,2,1].map(i=>`
            <div style="display:flex;align-items:center;gap:8px">
              <span style="width:14px;font-size:0.8rem;color:var(--amber)">${"\u2605".repeat(i)}</span>
              ${a(s.ratings.distribution?.[i]||0,e)}
              <span style="font-size:0.72rem;color:var(--text-muted);width:20px">${s.ratings.distribution?.[i]||0}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">\u{1F4DC} Certifications</div></div>
        <div class="table-container">
          <table>
            <tr><th>Certification</th><th>Issuing Body</th><th>Cert #</th><th>Issued</th><th>Expires</th><th>Status</th></tr>
            ${t.certifications.map(i=>`
              <tr>
                <td style="font-weight:600">${i.cert_name}</td>
                <td>${i.cert_body}</td>
                <td style="font-family:'JetBrains Mono';font-size:0.72rem">${i.cert_number}</td>
                <td style="font-size:0.75rem">${i.issued_date||"\u2014"}</td>
                <td style="font-size:0.75rem">${i.expiry_date||"\u2014"}</td>
                <td><span class="badge ${i.status==="active"?"valid":"suspicious"}">${i.status}</span></td>
              </tr>
            `).join("")}
          </table>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">\u{1F4CB} Compliance Records</div></div>
      <div class="table-container">
        <table>
          <tr><th>Framework</th><th>Requirement</th><th>Status</th><th>Next Review</th></tr>
          ${t.compliance.map(i=>`
            <tr>
              <td style="font-weight:600">${i.framework}</td>
              <td>${i.requirement}</td>
              <td><span class="badge ${i.status==="compliant"?"valid":"suspicious"}">${i.status}</span></td>
              <td style="font-size:0.75rem;color:var(--text-muted)">${i.next_review||"\u2014"}</td>
            </tr>
          `).join("")}
        </table>
      </div>
    </div>
  `}function ls(){let t=r.billingData;if(!t)return'<div class="empty-state"><div class="empty-icon">\u23F3</div><div class="empty-text">Loading Billing\u2026</div></div>';let s=t.plan,a=t.usage,e={free:"var(--text-muted)",starter:"var(--cyan)",pro:"var(--violet)",enterprise:"var(--amber)"},i={free:"\u{1F193}",starter:"\u{1F680}",pro:"\u26A1",enterprise:"\u{1F3E2}"},l=(o,d,b)=>{let v=d==="\u221E"||d<0,n=v?5:Math.min(o/d*100,100),p=n>90?"var(--rose)":n>70?"var(--amber)":"var(--emerald)";return`
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:0.8rem;font-weight:600">${b}</span>
          <span style="font-size:0.75rem;color:var(--text-muted)">${typeof o=="number"?o.toLocaleString():o} / ${v?"\u221E":typeof d=="number"?d.toLocaleString():d}</span>
        </div>
        <div style="height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden">
          <div style="width:${n}%;height:100%;background:${p};border-radius:4px;transition:width 0.3s"></div>
        </div>
      </div>
    `};return`
    <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:var(--gap);margin-bottom:var(--gap)">
      ${Object.entries(t.available).map(([o,d])=>`
        <div class="card" style="border:${s?.plan_name===o?"2px solid "+e[o]:"1px solid var(--border)"};cursor:pointer;position:relative" onclick="${s?.plan_name!==o&&r.user?.role==="admin"?`upgradePlan('${o}')`:""}">
          ${s?.plan_name===o?'<div style="position:absolute;top:8px;right:8px;font-size:0.65rem;background:var(--emerald);color:#000;padding:2px 8px;border-radius:99px;font-weight:700">CURRENT</div>':""}
          <div style="padding:var(--gap);text-align:center">
            <div style="font-size:2rem">${i[o]}</div>
            <div style="font-size:1.1rem;font-weight:700;color:${e[o]};margin:8px 0">${d.name}</div>
            <div style="font-size:1.5rem;font-weight:800">$${d.price}<span style="font-size:0.75rem;font-weight:400;color:var(--text-muted)">/mo</span></div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:12px;text-align:left">
              <div>\u{1F4F1} ${d.scan_limit<0?"Unlimited":d.scan_limit.toLocaleString()} scans</div>
              <div>\u{1F50C} ${d.api_limit<0?"Unlimited":d.api_limit.toLocaleString()} API calls</div>
              <div>\u{1F4BE} ${d.storage_mb<0?"Unlimited":d.storage_mb.toLocaleString()} MB storage</div>
            </div>
          </div>
        </div>
      `).join("")}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--gap)">
      <div class="card">
        <div class="card-header"><div class="card-title">\u{1F4CA} Current Usage (${t.period})</div></div>
        <div style="padding:0 var(--gap) var(--gap)">
          ${a?`
            ${l(a.scans.used,a.scans.limit,"\u{1F4F1} Scans")}
            ${l(a.api_calls.used,a.api_calls.limit,"\u{1F50C} API Calls")}
            ${l(a.storage_mb.used,a.storage_mb.limit,"\u{1F4BE} Storage (MB)")}
          `:'<div class="empty-state">No usage data</div>'}
        </div>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">\u{1F9FE} Invoice History</div></div>
        <div class="table-container">
          <table>
            <tr><th>Plan</th><th>Amount</th><th>Status</th><th>Period</th></tr>
            ${t.invoices.map(o=>`
              <tr>
                <td style="font-weight:600;text-transform:capitalize">${o.plan_name}</td>
                <td style="font-family:'JetBrains Mono'">$${o.amount}</td>
                <td><span class="badge valid">${o.status}</span></td>
                <td style="font-size:0.72rem;color:var(--text-muted)">${o.period_start?.substring(0,7)||"\u2014"}</td>
              </tr>
            `).join("")}
            ${t.invoices.length===0?'<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No invoices</td></tr>':""}
          </table>
        </div>
      </div>
    </div>
  `}function os(){let t=r.pricingData;if(!t)return'<div class="empty-state"><div class="empty-icon">\u23F3</div><div class="empty-text">Loading Pricing\u2026</div></div>';let s=r.pricingAnnual||!1,a=t.plans,e=["free","starter","pro","business","enterprise"],i={free:"#6b7280",starter:"#06b6d4",pro:"#8b5cf6",business:"#f59e0b",enterprise:"#ef4444"},l={free:"\u{1F193}",starter:"\u{1F680}",pro:"\u26A1",business:"\u{1F3E2}",enterprise:"\u{1F451}"},o=()=>{r.pricingAnnual=!r.pricingAnnual,h()};window._toggleBilling=o;let d=v=>v===-1?"\u221E":typeof v=="number"?v.toLocaleString():v,b=r.billingData?.plan?.plan_name||"free";return`
    <div style="max-width:1200px;margin:0 auto">
      <!-- Header -->
      <div style="text-align:center;margin-bottom:40px">
        <h2 style="font-size:2rem;font-weight:800;background:linear-gradient(135deg, var(--cyan), var(--violet));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px">
          Simple, Transparent Pricing
        </h2>
        <p style="color:var(--text-muted);font-size:1rem;max-width:600px;margin:0 auto">
          Start free, scale as you grow. Usage-based add-ons so you only pay for what you use.
        </p>

        <!-- Billing Toggle -->
        <div style="display:inline-flex;align-items:center;gap:12px;margin-top:24px;padding:6px;background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border)">
          <button onclick="_toggleBilling()" style="padding:8px 20px;border-radius:8px;border:none;cursor:pointer;font-weight:600;font-size:0.85rem;
            background:${s?"transparent":"var(--cyan)"};
            color:${s?"var(--text-muted)":"#000"}">
            Monthly
          </button>
          <button onclick="_toggleBilling()" style="padding:8px 20px;border-radius:8px;border:none;cursor:pointer;font-weight:600;font-size:0.85rem;position:relative;
            background:${s?"var(--cyan)":"transparent"};
            color:${s?"#000":"var(--text-muted)"}">
            Annual
            <span style="position:absolute;top:-8px;right:-12px;background:var(--emerald);color:#000;font-size:0.6rem;padding:2px 6px;border-radius:99px;font-weight:700">-20%</span>
          </button>
        </div>
      </div>

      <!-- Plan Cards -->
      <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:16px;margin-bottom:40px">
        ${e.map(v=>{let n=a[v];if(!n)return"";let p=n.price_monthly,f=n.price_annual,m=n.badge==="POPULAR",w=v===b,x=v==="enterprise",$=x?null:s?Math.round((f||0)/12):p;return`
            <div class="card" style="position:relative;border:${m?"2px solid var(--violet)":w?"2px solid var(--emerald)":"1px solid var(--border)"};
              ${m?"transform:scale(1.03);box-shadow:0 8px 32px rgba(139,92,246,0.2)":""};transition:transform 0.2s,box-shadow 0.2s"
              onmouseenter="this.style.transform='scale(1.05)'" onmouseleave="this.style.transform='${m?"scale(1.03)":"scale(1)"}'"
            >
              ${m?'<div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--violet);color:#fff;font-size:0.65rem;padding:4px 14px;border-radius:99px;font-weight:700;letter-spacing:0.5px">MOST POPULAR</div>':""}
              ${w?'<div style="position:absolute;top:8px;right:8px;background:var(--emerald);color:#000;font-size:0.6rem;padding:2px 8px;border-radius:99px;font-weight:700">CURRENT</div>':""}

              <div style="padding:24px;text-align:center">
                <div style="font-size:2.5rem;margin-bottom:8px">${l[v]}</div>
                <div style="font-size:1.1rem;font-weight:700;color:${i[v]}">${n.name}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin:4px 0 16px;min-height:32px">${n.tagline}</div>

                <div style="margin:16px 0">
                  ${x?'<div style="font-size:1.8rem;font-weight:800">Custom</div><div style="font-size:0.75rem;color:var(--text-muted)">Contact sales</div>':`<div style="font-size:2.2rem;font-weight:800">$${$}<span style="font-size:0.75rem;font-weight:400;color:var(--text-muted)">/mo</span></div>
                       ${s&&p?'<div style="font-size:0.7rem;color:var(--emerald)">Save $'+(p*12-f)+"/year</div>":""}`}
                </div>

                <!-- Key Limits -->
                <div style="text-align:left;font-size:0.72rem;margin:16px 0;padding:12px;background:var(--bg-secondary);border-radius:8px">
                  <div style="margin-bottom:6px">\u{1F4F1} <strong>${d(n.limits.scans)}</strong> scans/mo</div>
                  <div style="margin-bottom:6px">\u{1F50C} <strong>${d(n.limits.api_calls)}</strong> API calls</div>
                  <div style="margin-bottom:6px">\u{1F4BE} <strong>${d(n.limits.storage_mb)}</strong> MB storage</div>
                  <div style="margin-bottom:6px">\u{1F396}\uFE0F <strong>${d(n.limits.nft_mints)}</strong> NFT mints</div>
                  <div>\u{1F33F} <strong>${d(n.limits.carbon_calcs)}</strong> carbon calcs</div>
                </div>

                ${w?'<button disabled style="width:100%;padding:10px;border:1px solid var(--border);background:var(--bg-secondary);color:var(--text-muted);border-radius:8px;font-weight:600">Current Plan</button>':x?'<button onclick="requestEnterpriseQuote()" style="width:100%;padding:10px;border:none;background:linear-gradient(135deg, #ef4444, #dc2626);color:#fff;border-radius:8px;cursor:pointer;font-weight:600">Contact Sales</button>':`<button onclick="upgradePlan('${v}')" style="width:100%;padding:10px;border:none;background:${i[v]};color:#000;border-radius:8px;cursor:pointer;font-weight:700">
                        ${e.indexOf(v)>e.indexOf(b)?"Upgrade":"Switch"}
                      </button>`}
              </div>
            </div>
          `}).join("")}
      </div>

      <!-- Usage-Based Add-ons Section -->
      <div class="card" style="margin-bottom:24px;padding:24px">
        <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px">
          <span>\u{1F4CA}</span> Usage-Based Add-ons
          <span style="font-size:0.7rem;color:var(--text-muted);font-weight:400">Pay only for what you use beyond your plan</span>
        </h3>
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:16px">
          ${Object.entries(t.usage_pricing).map(([v,n])=>`
              <div style="padding:16px;background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border)">
                <div style="font-size:1.5rem;margin-bottom:8px">${v==="scans"?"\u{1F4F1}":v==="nft_mints"?"\u{1F396}\uFE0F":v==="carbon_calcs"?"\u{1F33F}":"\u{1F50C}"}</div>
                <div style="font-weight:700;font-size:0.85rem;margin-bottom:4px">${n.name}</div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:12px">Per ${n.unit} overage</div>
                <div style="font-size:0.72rem">
                  ${n.tiers.map(f=>`
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                      <span style="color:var(--text-muted)">${f.up_to==null||f.up_to===1/0?"Volume":"First "+f.up_to.toLocaleString()}</span>
                      <span style="font-weight:700;color:var(--emerald)">$${f.price}/${n.unit}</span>
                    </div>
                  `).join("")}
                  ${n.bundle?`<div style="margin-top:8px;padding:8px;background:rgba(0,210,255,0.1);border-radius:6px;text-align:center"><strong>Bundle:</strong> ${n.bundle.size} for $${n.bundle.price}</div>`:""}
                </div>
              </div>
            `).join("")}
        </div>
      </div>

      <!-- Feature Comparison Matrix -->
      <div class="card" style="padding:24px">
        <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:16px">\u{1F4CB} Feature Comparison</h3>
        <div class="table-container">
          <table>
            <tr>
              <th style="text-align:left">Feature</th>
              ${e.map(v=>`<th style="color:${i[v]}">${a[v]?.name||v}</th>`).join("")}
            </tr>
            ${[["SLA Guarantee",...e.map(v=>a[v]?.sla||"\u2014")],["Support Level","Community","Email","Priority","Dedicated","Dedicated+Slack"],["Fraud Detection","\u2014",'<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>'],["AI Anomaly Detection","\u2014","\u2014",'<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>'],["Digital Twin","\u2014","\u2014","\u2014",'<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>'],["Carbon Tracking","\u2014","\u2014",'<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>'],["NFT Certificates","\u2014",'<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>'],["Custom Branding","\u2014","\u2014",'<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>'],["SSO / SAML","\u2014","\u2014","\u2014",'<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>'],["On-Premise","\u2014","\u2014","\u2014","\u2014",'<span class="status-icon status-pass" aria-label="Pass">\u2713</span>'],["GS1 Certified Partner","\u2014",'<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>'],["SOC 2 Type II","\u2014","\u2014","\u2014",'<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>'],["ISO 27001:2022","\u2014","\u2014","\u2014",'<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>'],["GDPR Compliant",'<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>','<span class="status-icon status-pass" aria-label="Pass">\u2713</span>']].map(v=>`
              <tr>
                <td style="font-weight:600;font-size:0.8rem">${v[0]}</td>
                ${v.slice(1).map(n=>`<td style="text-align:center;font-size:0.75rem;${n==='<span class="status-icon status-pass" aria-label="Pass">\u2713</span>'?"color:var(--emerald)":n==="\u2014"?"color:var(--text-muted)":""}">${n}</td>`).join("")}
              </tr>
            `).join("")}
          </table>
        </div>
      </div>

      <!-- Trust Badges Footer -->
      <div style="margin-top:24px;text-align:center;padding:24px;background:var(--bg-secondary);border-radius:16px;border:1px solid var(--border)">
        <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:16px;font-weight:600;letter-spacing:1px">TRUSTED BY ENTERPRISE CUSTOMERS WORLDWIDE</div>
        <div style="display:flex;justify-content:center;gap:24px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(59,130,246,0.1);border-radius:8px;border:1px solid rgba(59,130,246,0.2)">
            <span style="font-size:1.2rem">\u{1F6E1}\uFE0F</span>
            <div><div style="font-size:0.75rem;font-weight:700;color:#3b82f6">SOC 2 Type II</div><div style="font-size:0.6rem;color:var(--text-muted)">Audited by Deloitte</div></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(16,185,129,0.1);border-radius:8px;border:1px solid rgba(16,185,129,0.2)">
            <span style="font-size:1.2rem">\u{1F4CB}</span>
            <div><div style="font-size:0.75rem;font-weight:700;color:#10b981">ISO 27001:2022</div><div style="font-size:0.6rem;color:var(--text-muted)">BSI Certified</div></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(245,158,11,0.1);border-radius:8px;border:1px solid rgba(245,158,11,0.2)">
            <span style="font-size:1.2rem">\u{1F3C5}</span>
            <div><div style="font-size:0.75rem;font-weight:700;color:#f59e0b">GS1 Partner</div><div style="font-size:0.6rem;color:var(--text-muted)">EPCIS 2.0 Compliant</div></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;background:rgba(99,102,241,0.1);border-radius:8px;border:1px solid rgba(99,102,241,0.2)">
            <span style="font-size:1.2rem">\u{1F1EA}\u{1F1FA}</span>
            <div><div style="font-size:0.75rem;font-weight:700;color:#6366f1">GDPR</div><div style="font-size:0.6rem;color:var(--text-muted)">Full Compliance</div></div>
          </div>
        </div>
      </div>

    </div>
  `}function ds(){let t=r.publicData;if(!t)return'<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading public data\u2026</span></div>';let s=t.stats;return`
    <div class="card" style="margin-bottom:24px;padding:20px;background:linear-gradient(135deg, rgba(0,210,255,0.08), rgba(168,85,247,0.08));border:1px solid rgba(0,210,255,0.15)">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:2rem">\u{1F310}</span>
        <div>
          <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary)">TrustChecker Public Transparency Dashboard</div>
          <div style="font-size:0.85rem;color:var(--text-muted)">Real-time platform statistics \u2022 No authentication required \u2022 Last updated: ${new Date(s.last_updated).toLocaleString()}</div>
        </div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card cyan">
        <div class="stat-icon">\u{1F4E6}</div>
        <div class="stat-value">${s.total_products}</div>
        <div class="stat-label">Products Protected</div>
      </div>
      <div class="stat-card violet">
        <div class="stat-icon">\u{1F4F1}</div>
        <div class="stat-value">${s.total_scans?.toLocaleString()}</div>
        <div class="stat-label">Scans Performed</div>
        <div class="stat-change up">\u2197 ${s.today_scans} today</div>
      </div>
      <div class="stat-card emerald">
        <div class="stat-icon"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span></div>
        <div class="stat-value">${s.verification_rate}%</div>
        <div class="stat-label">Verification Rate</div>
      </div>
      <div class="stat-card amber">
        <div class="stat-icon">\u{1F517}</div>
        <div class="stat-value">${s.blockchain_seals}</div>
        <div class="stat-label">Blockchain Seals</div>
      </div>
      <div class="stat-card cyan">
        <div class="stat-icon">\u{1F4CA}</div>
        <div class="stat-value">${s.avg_trust_score}</div>
        <div class="stat-label">Avg Trust Score</div>
      </div>
      <div class="stat-card violet">
        <div class="stat-icon">\u{1F91D}</div>
        <div class="stat-value">${s.total_partners}</div>
        <div class="stat-label">Verified Partners</div>
      </div>
      <div class="stat-card emerald">
        <div class="stat-icon">\u{1F3C5}</div>
        <div class="stat-value">${s.active_certifications}</div>
        <div class="stat-label">Active Certs</div>
      </div>
      <div class="stat-card rose">
        <div class="stat-icon">\u{1F6A8}</div>
        <div class="stat-value">${s.open_alerts}</div>
        <div class="stat-label">Active Alerts</div>
      </div>
    </div>

    <div class="grid-2" style="margin-top:24px">
      <div class="card">
        <div class="card-header"><div class="card-title">\u{1F4C8} Scan Volume Trend (7 Days)</div></div>
        <div style="position:relative;height:280px;padding:10px"><canvas id="publicTrendChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">\u{1F3AF} Scan Results Breakdown</div></div>
        <div style="position:relative;height:280px;padding:10px"><canvas id="publicScanChart"></canvas></div>
      </div>
    </div>

    <div class="grid-2" style="margin-top:16px">
      <div class="card">
        <div class="card-header"><div class="card-title">\u{1F6E1}\uFE0F Trust Score Distribution</div></div>
        <div style="position:relative;height:280px;padding:10px"><canvas id="publicTrustChart"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title"><span class="status-icon status-warn" aria-label="Warning">!</span> Alert Severity</div></div>
        <div style="position:relative;height:280px;padding:10px"><canvas id="publicAlertChart"></canvas></div>
      </div>
    </div>

    <div class="card" style="margin-top:16px;padding:16px;text-align:center">
      <div style="color:var(--text-muted);font-size:0.85rem">
        \u{1F513} This data is publicly accessible via <code style="background:rgba(0,210,255,0.1);padding:2px 8px;border-radius:4px;color:var(--cyan)">GET /api/public/stats</code>
        \u2022 Platform uptime: <span style="color:var(--emerald)">${s.platform_uptime}</span>
        \u2022 <a href="/api/docs/html" target="_blank" style="color:var(--cyan);text-decoration:none">View Full API Docs \u2192</a>
      </div>
    </div>
  `}function cs(){let t=r.publicData;if(!t)return;let s=t.trends||[],a=document.getElementById("publicTrendChart");a&&s.length&&new Chart(a,{type:"line",data:{labels:s.map(v=>v.date?.substring(5)),datasets:[{label:"Total",data:s.map(v=>v.total),borderColor:"#00d2ff",backgroundColor:"rgba(0,210,255,0.1)",fill:!0,tension:.4,borderWidth:2},{label:"Valid",data:s.map(v=>v.valid),borderColor:"#00d264",backgroundColor:"transparent",tension:.4,borderWidth:2,borderDash:[5,3]},{label:"Suspicious",data:s.map(v=>v.suspicious),borderColor:"#ff6b6b",backgroundColor:"transparent",tension:.4,borderWidth:2,borderDash:[5,3]}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom",labels:{color:"#c8d6e5",padding:12,usePointStyle:!0,font:{family:"Inter",size:11}}}},scales:{x:{ticks:{color:"#636e7b",font:{family:"Inter",size:10}},grid:{color:"rgba(255,255,255,0.04)"}},y:{ticks:{color:"#636e7b",font:{family:"Inter",size:10}},grid:{color:"rgba(255,255,255,0.04)"},beginAtZero:!0}}}});let e=t.scanResults||[],i=document.getElementById("publicScanChart");if(i&&e.length){let v={valid:"#00d264",warning:"#ffa500",suspicious:"#ff6b6b",counterfeit:"#ff3366",pending:"#636e7b"};new Chart(i,{type:"doughnut",data:{labels:e.map(n=>n.result),datasets:[{data:e.map(n=>n.count),backgroundColor:e.map(n=>v[n.result]||"#00d2ff"),borderWidth:0,borderRadius:4}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom",labels:{color:"#c8d6e5",padding:12,usePointStyle:!0,font:{family:"Inter",size:11}}}},cutout:"60%"}})}let l=t.trustDist||[],o=document.getElementById("publicTrustChart");if(o&&l.length){let v=["#00d264","#00d2ff","#ffa500","#ff6b6b","#ff3366"];new Chart(o,{type:"bar",data:{labels:l.map(n=>n.bracket),datasets:[{label:"Products",data:l.map(n=>n.count),backgroundColor:v.slice(0,l.length),borderWidth:0,borderRadius:6}]},options:{responsive:!0,maintainAspectRatio:!1,indexAxis:"y",plugins:{legend:{display:!1}},scales:{x:{ticks:{color:"#636e7b",font:{family:"Inter",size:10}},grid:{color:"rgba(255,255,255,0.04)"},beginAtZero:!0},y:{ticks:{color:"#c8d6e5",font:{family:"Inter",size:10}},grid:{display:!1}}}}})}let d=t.alertSev||[],b=document.getElementById("publicAlertChart");if(b&&d.length){let v={critical:"#ff3366",high:"#ffa500",medium:"#a855f7",low:"#00d2ff"};new Chart(b,{type:"polarArea",data:{labels:d.map(n=>n.severity),datasets:[{data:d.map(n=>n.count),backgroundColor:d.map(n=>(v[n.severity]||"#00d2ff")+"99"),borderWidth:0}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{position:"bottom",labels:{color:"#c8d6e5",padding:12,usePointStyle:!0,font:{family:"Inter",size:11}}}},scales:{r:{ticks:{display:!1},grid:{color:"rgba(255,255,255,0.06)"}}}}})}}function vs(){return`
    <div class="card" style="margin-bottom:16px;padding:20px;background:linear-gradient(135deg, rgba(0,210,255,0.08), rgba(168,85,247,0.08));border:1px solid rgba(0,210,255,0.15)">
      <div style="display:flex;align-items:center;gap:12px;justify-content:space-between;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:2rem">\u{1F4D6}</span>
          <div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary)">TrustChecker REST API v8.8.6</div>
            <div style="font-size:0.85rem;color:var(--text-muted)">Full endpoint reference \u2022 JWT Authentication \u2022 JSON responses</div>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <a href="/api/docs" target="_blank" class="btn-action" style="text-decoration:none">\u{1F4CB} JSON Spec</a>
          <a href="/api/docs/html" target="_blank" class="btn-action primary" style="text-decoration:none">\u{1F517} Open Full Docs</a>
        </div>
      </div>
    </div>
    <div class="card" style="padding:0;overflow:hidden;border-radius:12px;height:calc(100vh - 240px)">
      <iframe src="/api/docs/html" style="width:100%;height:100%;border:none;background:#0a0e1a"></iframe>
    </div>
  `}function ps(){return`
    <div class="settings-grid">
      <!-- MFA Section -->
      <div class="card settings-card">
        <div class="card-header"><div class="card-title">\u{1F510} Two-Factor Authentication</div></div>
        <div class="card-body">
          <div id="mfa-status" class="mfa-status">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>

      <!-- Password Change -->
      <div class="card settings-card">
        <div class="card-header"><div class="card-title">\u{1F511} Change Password</div></div>
        <div class="card-body">
          <div id="pw-msg" class="settings-msg" style="display:none"></div>
          <div class="input-group">
            <label>Current Password</label>
            <input class="input" id="pw-current" type="password" placeholder="Current password">
          </div>
          <div class="input-group">
            <label>New Password</label>
            <input class="input" id="pw-new" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number">
          </div>
          <div class="input-group">
            <label>Confirm New Password</label>
            <input class="input" id="pw-confirm" type="password" placeholder="Confirm new password">
          </div>
          <button class="btn btn-primary" style="margin-top:8px" onclick="changePassword()">Update Password</button>
        </div>
      </div>

      <!-- Active Sessions -->
      <div class="card settings-card" style="grid-column:1/-1">
        <div class="card-header">
          <div class="card-title">\u{1F4F1} Active Sessions</div>
          <button class="btn btn-sm" onclick="revokeAllSessions()">Revoke All Others</button>
        </div>
        <div class="card-body">
          <div id="sessions-list" class="sessions-list">
            <div class="loading"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
    </div>
  `}async function us(){try{let t=await c.get("/auth/me"),s=document.getElementById("mfa-status");s&&(s.innerHTML=t.user.mfa_enabled?`
        <div class="mfa-enabled">
          <div class="mfa-icon"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span></div>
          <div class="mfa-text">MFA is <strong>enabled</strong></div>
          <div style="margin-top:12px">
            <div class="input-group">
              <label>Enter password to disable MFA</label>
              <input class="input" id="mfa-disable-pw" type="password" placeholder="Your password">
            </div>
            <button class="btn btn-sm" style="background:var(--rose);color:#fff" onclick="disableMfa()">Disable MFA</button>
          </div>
        </div>
      `:`
        <div class="mfa-disabled">
          <div class="mfa-icon">\u{1F513}</div>
          <div class="mfa-text">MFA is <strong>not enabled</strong></div>
          <button class="btn btn-primary" style="margin-top:12px" onclick="setupMfa()">Enable MFA</button>
        </div>
      `);let a=await c.get("/auth/sessions"),e=document.getElementById("sessions-list");e&&a.sessions&&(e.innerHTML=a.sessions.length?a.sessions.map((i,l)=>`
        <div class="session-card ${l===0?"current":""}">
          <div class="session-info">
            <div class="session-device">${ms(i.user_agent)}</div>
            <div class="session-meta">${escapeHTML(i.ip_address)} \u2022 Created ${S(i.created_at)} \u2022 Active ${S(i.last_active)}</div>
          </div>
          <div class="session-actions">
            ${l===0?'<span class="badge valid">Current</span>':`<button class="btn btn-sm" onclick="revokeSession('${escapeHTML(i.id)}')">Revoke</button>`}
          </div>
        </div>
      `).join(""):'<div class="empty-state"><div class="empty-text">No active sessions</div></div>')}catch(t){console.error("Settings load error:",t)}}function ms(t){return t?t.includes("Chrome")?"\u{1F310} Chrome":t.includes("Firefox")?"\u{1F98A} Firefox":t.includes("Safari")?"\u{1F9ED} Safari":t.includes("curl")?"\u{1F4DF} CLI (curl)":"\u{1F5A5}\uFE0F "+escapeHTML(t.substring(0,40)):"\u{1F5A5}\uFE0F Unknown Device"}function gs(){return r.user?.role!=="admin"?'<div class="empty-state"><div class="empty-icon">\u{1F512}</div><div class="empty-text">Admin access required</div></div>':`
    <div class="card">
      <div class="card-header"><div class="card-title">\u{1F465} All Users</div></div>
      <div class="card-body">
        <div id="admin-users-list">
          <div class="loading"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  `}async function fs(){try{let t=await c.get("/auth/users"),s=document.getElementById("admin-users-list");if(!s)return;s.innerHTML=`
      <table class="data-table">
        <thead><tr><th>User</th><th>Email</th><th>Role</th><th>MFA</th><th>Last Login</th><th>Action</th></tr></thead>
        <tbody>
          ${t.users.map(a=>`
            <tr>
              <td style="font-weight:600">${escapeHTML(a.email)}</td>
              <td style="font-family:'JetBrains Mono';font-size:0.72rem">${escapeHTML(a.email)}</td>
              <td>
                <select class="input" style="width:120px;padding:4px 8px;font-size:0.72rem"
                  onchange="changeUserRole('${escapeHTML(a.id)}', this.value)" ${a.id===r.user.id?"disabled":""}>
                  ${["admin","manager","operator","viewer"].map(e=>`<option value="${e}" ${a.role===e?"selected":""}>${e}</option>`).join("")}
                </select>
              </td>
              <td>${a.mfa_enabled?'<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span>':"\u2014"}</td>
              <td style="font-size:0.72rem;color:var(--text-muted)">${a.last_login?S(a.last_login):"Never"}</td>
              <td>${a.id===r.user.id?'<span class="badge valid">You</span>':""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `}catch(t){console.error("Admin users error:",t)}}function hs(){let t=r.integrationsSchema,s=r.integrationsData||{};return t?`
    <div class="integrations-container">
      <div class="card" style="margin-bottom:20px;padding:16px;background:linear-gradient(135deg, rgba(0,210,255,0.08), rgba(88,86,214,0.08))">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:2rem">\u{1F510}</span>
          <div>
            <strong>API Key Security</strong>
            <div style="font-size:0.82rem;color:var(--text-muted);margin-top:2px">
              All secret keys are encrypted with AES-256 at rest. Only admins can view/modify these settings.
              Values with \u{1F512} are stored securely and shown masked.
            </div>
          </div>
        </div>
      </div>
      ${Object.entries(t).map(([e,i])=>{let l=s[e]||{},o=l.enabled?.value==="true",d=Object.keys(l).length>0,b=Object.values(l).find(v=>v.updated_at)?.updated_at;return`
      <div class="integration-card ${o?"integration-active":""}" id="integ-${e}">
        <div class="integration-header" onclick="toggleIntegSection('${e}')">
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:1.8rem">${i.icon}</span>
            <div>
              <div class="integration-title">${i.label}</div>
              <div class="integration-desc">${i.description}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            ${o?'<span class="integration-status status-active">\u25CF Active</span>':d?'<span class="integration-status status-configured">\u25CF Configured</span>':'<span class="integration-status status-inactive">\u25CB Not configured</span>'}
            <span class="integration-chevron" id="chevron-${e}">\u25B6</span>
          </div>
        </div>
        <div class="integration-body" id="body-${e}" style="display:none">
          <div class="integration-fields">
            ${i.settings.map(v=>{let n=l[v.key],p=n?.value||"";return`
              <div class="integration-field">
                <label class="integration-label">
                  ${v.label}
                  ${v.secret?'<span class="secret-badge">\u{1F512} ENCRYPTED</span>':""}
                </label>
                <div style="display:flex;gap:8px">
                  <input class="input integration-input" 
                    id="integ-${e}-${v.key}"
                    type="${v.secret?"password":"text"}" 
                    placeholder="${v.placeholder}"
                    value="${p}"
                    autocomplete="off"
                  >
                  ${v.secret?`<button class="btn btn-sm" onclick="toggleIntegSecret('integ-${e}-${v.key}')" title="Show/Hide" style="min-width:36px">\u{1F441}</button>`:""}
                </div>
                ${n?.updated_at?`<div class="integration-meta">Last updated: ${new Date(n.updated_at).toLocaleString()} by ${n.updated_by||"admin"}</div>`:""}
              </div>`}).join("")}
          </div>
          <div class="integration-actions">
            <button class="btn btn-primary" onclick="saveIntegration('${e}')">\u{1F4BE} Save</button>
            <button class="btn btn-secondary" onclick="testIntegration('${e}')">\u{1F517} Test Connection</button>
            <button class="btn btn-danger" onclick="clearIntegration('${e}')">\u{1F5D1}\uFE0F Clear All</button>
          </div>
          <div id="integ-test-${e}" class="integration-test-result" style="display:none"></div>
          ${b?`<div class="integration-meta" style="margin-top:8px;text-align:right">Last saved: ${new Date(b).toLocaleString()}</div>`:""}
        </div>
      </div>`}).join("")}
    </div>`:'<div class="empty-state"><div class="empty-icon">\u{1F50C}</div><div class="empty-text">Loading integrations...</div></div>'}function ys(){let t=r.epcisData;if(!t)return'<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading EPCIS data...</span></div>';let s=t.stats||{};return`
    <div class="stats-grid">
      <div class="stat-card cyan"><div class="stat-icon">\u{1F4E1}</div><div class="stat-value">${s.total_events||0}</div><div class="stat-label">EPCIS Events</div></div>
      <div class="stat-card emerald"><div class="stat-icon">\u{1F517}</div><div class="stat-value">${s.blockchain_sealed_pct||0}%</div><div class="stat-label">Blockchain Sealed</div></div>
      <div class="stat-card violet"><div class="stat-icon">\u{1F4E6}</div><div class="stat-value">${s.products_tracked||0}</div><div class="stat-label">Products Tracked</div></div>
      <div class="stat-card amber"><div class="stat-icon">\u{1F91D}</div><div class="stat-value">${s.partners_tracked||0}</div><div class="stat-label">Partners Tracked</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F4CB} Event Types (GS1 CBV)</div></div>
      <table class="data-table"><thead><tr><th>Internal Type</th><th>EPCIS Type</th><th>Biz Step</th><th>Count</th></tr></thead><tbody>
        ${(s.event_types||[]).map(a=>`<tr><td>${a.internal_type}</td><td><span class="badge">${a.epcis_type}</span></td><td>${a.cbv_biz_step}</td><td>${a.count}</td></tr>`).join("")}
      </tbody></table>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F4E1} Recent EPCIS Events</div>
        <button class="btn btn-sm" onclick="exportEpcisDoc()">\u{1F4C4} Export Document</button>
      </div>
      <table class="data-table"><thead><tr><th>Time</th><th>EPCIS Type</th><th>Biz Step</th><th>Location</th><th>Sealed</th></tr></thead><tbody>
        ${(t.events||[]).slice(0,20).map(a=>`<tr><td>${S(a.eventTime||a.created_at)}</td><td>${a.epcis_type||"\u2014"}</td><td>${a.cbv_biz_step||"\u2014"}</td><td>${a.readPointId||a.location||"\u2014"}</td><td>${a.blockchain_seal_id?'<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span>':"\u2014"}</td></tr>`).join("")}
      </tbody></table>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span> GS1 Compliance</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;padding:16px">
        ${Object.entries(s.compliance||{}).map(([a,e])=>`<div style="padding:12px;background:var(--bg-tertiary);border-radius:8px"><div style="font-size:0.75rem;color:var(--text-muted)">${a.replace(/_/g," ")}</div><div style="font-size:1.1rem;font-weight:700;color:${e?"var(--emerald)":"var(--rose)"}">${e?'<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span> Yes':'<span class="status-icon status-fail" aria-label="Fail">\u2717</span> No'}</div></div>`).join("")}
      </div>
    </div>`}function bs(){let t=r.aiData;if(!t)return'<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading AI models...</span></div>';let s=t.forecast||{},a=t.sensing||{};return`
    <div class="stats-grid">
      <div class="stat-card cyan"><div class="stat-icon">\u{1F9E0}</div><div class="stat-value">${s.algorithm?"Active":"Off"}</div><div class="stat-label">Holt-Winters</div></div>
      <div class="stat-card violet"><div class="stat-icon">\u{1F4C8}</div><div class="stat-value">${(s.forecast||[]).length}</div><div class="stat-label">Forecast Periods</div></div>
      <div class="stat-card ${a.change_detected?"rose":"emerald"}"><div class="stat-icon">\u26A1</div><div class="stat-value">${a.change_detected?"Detected!":"Stable"}</div><div class="stat-label">Demand Shift</div></div>
      <div class="stat-card amber"><div class="stat-icon">\u{1F3AF}</div><div class="stat-value">${a.data_points||0}</div><div class="stat-label">Data Points</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F4C8} Demand Forecast (Holt-Winters)</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-sm" onclick="runMonteCarlo()">\u{1F3B2} Monte Carlo</button>
          <button class="btn btn-sm" onclick="runRootCause()">\u{1F50D} Root Cause</button>
          <button class="btn btn-sm" onclick="runWhatIf()">\u{1F52E} What-If</button>
        </div>
      </div>
      <div style="padding:16px">
        <div style="display:flex;gap:24px;margin-bottom:16px;flex-wrap:wrap">
          <div><span style="color:var(--text-muted);font-size:0.8rem">MAE</span><br><strong>${s.model_fit?.MAE?.toFixed(2)||"\u2014"}</strong></div>
          <div><span style="color:var(--text-muted);font-size:0.8rem">MAPE</span><br><strong>${s.model_fit?.MAPE?.toFixed(1)||"\u2014"}%</strong></div>
          <div><span style="color:var(--text-muted);font-size:0.8rem">Season Length</span><br><strong>${s.season_length||"\u2014"}</strong></div>
        </div>
        <div class="mini-chart-row">
          ${(s.forecast||[]).slice(0,14).map((e,i)=>`<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><div style="width:20px;height:${Math.max(5,Math.min(60,e/2))}px;background:var(--cyan);border-radius:4px" title="Period ${i+1}: ${e.toFixed(1)}"></div><span style="font-size:0.6rem;color:var(--text-muted)">${i+1}</span></div>`).join("")}
        </div>
      </div>
    </div>
    <div id="ai-result" class="card" style="margin-top:20px;display:none">
      <div class="card-header"><div class="card-title" id="ai-result-title">\u2014</div></div>
      <pre id="ai-result-data" style="padding:16px;font-size:0.8rem;max-height:400px;overflow:auto;background:var(--bg-tertiary);border-radius:8px;color:var(--text-primary)"></pre>
    </div>`}function xs(){let t=r.riskRadarData;if(!t)return'<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Computing risk vectors...</span></div>';let s=t.radar||{},a=s.threat_level==="critical"?"var(--rose)":s.threat_level==="high"?"var(--amber)":s.threat_level==="medium"?"var(--warning)":"var(--emerald)";return`
    <div class="stats-grid">
      <div class="stat-card" style="border-color:${a}"><div class="stat-icon">\u{1F3AF}</div><div class="stat-value" style="color:${a}">${s.overall_threat_index||0}</div><div class="stat-label">Threat Index</div><div class="stat-change" style="color:${a}">\u2B24 ${(s.threat_level||"unknown").toUpperCase()}</div></div>
      <div class="stat-card rose"><div class="stat-icon">\u{1F6A8}</div><div class="stat-value">${t.alerts?.total_active||0}</div><div class="stat-label">Active Alerts</div></div>
      <div class="stat-card amber"><div class="stat-icon">\u{1F525}</div><div class="stat-value">${(t.heatmap?.regions||[]).filter(e=>e.risk_level==="hot").length}</div><div class="stat-label">Hot Zones</div></div>
      <div class="stat-card cyan"><div class="stat-icon">\u{1F4CA}</div><div class="stat-value">8</div><div class="stat-label">Risk Vectors</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F3AF} 8-Vector Risk Assessment</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;padding:16px">
        ${Object.entries(s.vectors||{}).map(([e,i])=>{let l=i.level==="high"?"var(--rose)":i.level==="medium"?"var(--amber)":"var(--emerald)",o={partner_risk:"\u{1F91D}",geographic_risk:"\u{1F30D}",route_risk:"\u{1F69A}",financial_risk:"\u{1F4B0}",compliance_risk:"\u{1F4DC}",cyber_risk:"\u{1F510}",environmental_risk:"\u{1F331}",supply_disruption:"\u26A1"}[e]||"\u{1F4CA}";return`<div style="padding:16px;background:var(--bg-tertiary);border-radius:12px;border-left:4px solid ${l}">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <span style="font-weight:600">${o} ${e.replace(/_/g," ").replace(/\b\w/g,d=>d.toUpperCase())}</span>
              <span style="font-weight:700;color:${l}">${i.score}</span>
            </div>
            <div style="background:var(--bg-secondary);border-radius:4px;height:6px;overflow:hidden"><div style="width:${i.score}%;height:100%;background:${l};border-radius:4px"></div></div>
            <div style="font-size:0.72rem;color:var(--text-muted);margin-top:8px">${Object.entries(i.details||{}).slice(0,3).map(([d,b])=>`${d}: ${b}`).join(" \u2022 ")}</div>
          </div>`}).join("")}
      </div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F5FA}\uFE0F Regional Risk Heatmap</div></div>
      <table class="data-table"><thead><tr><th>Region</th><th>Heat Score</th><th>Level</th><th>Partners</th><th>Leak Alerts</th></tr></thead><tbody>
        ${(t.heatmap?.regions||[]).map(e=>`<tr><td style="font-weight:600">${e.region}</td><td><span style="color:${e.risk_level==="hot"?"var(--rose)":e.risk_level==="warm"?"var(--amber)":"var(--emerald)"};font-weight:700">${e.heat_score}</span></td><td><span class="badge ${e.risk_level==="hot"?"badge-red":e.risk_level==="warm"?"badge-amber":"badge-green"}">${e.risk_level}</span></td><td>${e.partners}</td><td>${e.leak_alerts}</td></tr>`).join("")}
      </tbody></table>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F6A8} Active Alerts by Source</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;padding:16px">
        ${Object.entries(t.alerts?.by_source||{}).map(([e,i])=>`<div style="text-align:center;padding:12px;background:var(--bg-tertiary);border-radius:8px"><div style="font-size:1.4rem;font-weight:700;color:${i>0?"var(--rose)":"var(--emerald)"}">${i}</div><div style="font-size:0.75rem;color:var(--text-muted)">${e}</div></div>`).join("")}
      </div>
    </div>`}function $s(){let t=r.carbonData;if(!t)return'<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading carbon data...</span></div>';let s=t.scope||{},a=t.report||{};return`
    <div class="stats-grid">
      <div class="stat-card cyan"><div class="stat-icon">\u{1F30D}</div><div class="stat-value">${s.total_emissions_kgCO2e||0}</div><div class="stat-label">Total kgCO\u2082e</div></div>
      <div class="stat-card emerald"><div class="stat-icon">\u{1F4E6}</div><div class="stat-value">${s.products_assessed||0}</div><div class="stat-label">Products Assessed</div></div>
      <div class="stat-card violet"><div class="stat-icon">\u{1F3AF}</div><div class="stat-value">${s.reduction_targets?.paris_aligned_2030||0}</div><div class="stat-label">2030 Target kgCO\u2082e</div></div>
      <div class="stat-card amber"><div class="stat-icon">\u{1F4CA}</div><div class="stat-value">${a.overall_esg_grade||"N/A"}</div><div class="stat-label">ESG Grade</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F4CA} Scope 1 / 2 / 3 Breakdown</div></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:16px">
        ${[["Scope 1 \u2014 Manufacturing",s.scope_1,"var(--rose)"],["Scope 2 \u2014 Energy/Warehousing",s.scope_2,"var(--amber)"],["Scope 3 \u2014 Transport",s.scope_3,"var(--cyan)"]].map(([e,i,l])=>`
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:12px;text-align:center;border-top:3px solid ${l}">
            <div style="font-size:0.8rem;color:var(--text-muted)">${e}</div>
            <div style="font-size:1.8rem;font-weight:700;color:${l};margin:8px 0">${i?.total||0}</div>
            <div style="font-size:0.9rem">kgCO\u2082e (${i?.pct||0}%)</div>
            <div style="background:var(--bg-secondary);border-radius:4px;height:8px;margin-top:8px"><div style="width:${i?.pct||0}%;height:100%;background:${l};border-radius:4px"></div></div>
          </div>`).join("")}
      </div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F3C6} Partner ESG Leaderboard</div></div>
      <table class="data-table"><thead><tr><th>Partner</th><th>Country</th><th>ESG Score</th><th>Grade</th><th>Reliability</th><th>Violations</th></tr></thead><tbody>
        ${(t.leaderboard?.leaderboard||[]).map(e=>`<tr><td style="font-weight:600">${e.name}</td><td>${e.country}</td><td><strong style="color:${e.esg_score>=80?"var(--emerald)":e.esg_score>=60?"var(--cyan)":"var(--rose)"}">${e.esg_score}</strong></td><td><span class="badge ${e.grade==="A"?"badge-green":e.grade==="B"?"badge-cyan":e.grade==="C"?"badge-amber":"badge-red"}">${e.grade}</span></td><td>${e.metrics?.shipment_reliability||"N/A"}</td><td>${e.metrics?.sla_violations||0}</td></tr>`).join("")}
      </tbody></table>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F4CB} GRI Disclosures</div></div>
      <table class="data-table"><thead><tr><th>GRI Code</th><th>Disclosure</th><th>Value</th><th>Unit</th></tr></thead><tbody>
        ${Object.entries(a.disclosures||{}).map(([e,i])=>`<tr><td><strong>${e}</strong></td><td>${i.title}</td><td style="font-weight:700">${i.value}</td><td>${i.unit}</td></tr>`).join("")}
      </tbody></table>
    </div>`}function ws(){let t=r.twinData;if(!t)return'<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Building digital twin...</span></div>';let s=t.model||{},a=t.kpis||{},e=t.anomalies||{},i=s.health?.overall==="healthy"?"var(--emerald)":s.health?.overall==="warning"?"var(--amber)":"var(--rose)";return`
    <div class="stats-grid">
      <div class="stat-card" style="border-color:${i}"><div class="stat-icon">\u{1FA9E}</div><div class="stat-value" style="color:${i}">${(s.health?.overall||"unknown").toUpperCase()}</div><div class="stat-label">Twin Health</div></div>
      <div class="stat-card cyan"><div class="stat-icon">\u{1F517}</div><div class="stat-value">${s.topology?.nodes||0}/${s.topology?.edges||0}</div><div class="stat-label">Nodes / Edges</div></div>
      <div class="stat-card violet"><div class="stat-icon">\u{1F4CA}</div><div class="stat-value">${a.overall_score||0}%</div><div class="stat-label">KPI Score</div></div>
      <div class="stat-card ${e.total_anomalies>0?"rose":"emerald"}"><div class="stat-icon">\u26A1</div><div class="stat-value">${e.total_anomalies||0}</div><div class="stat-label">Anomalies</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F4CA} KPI Dashboard</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;padding:16px">
        ${Object.entries(a.kpis||{}).map(([l,o])=>{let d=o.status==="excellent"?"var(--emerald)":o.status==="good"||o.status==="normal"||o.status==="high"?"var(--cyan)":"var(--amber)";return`<div style="padding:16px;background:var(--bg-tertiary);border-radius:12px">
            <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase">${l.replace(/_/g," ")}</div>
            <div style="font-size:1.6rem;font-weight:700;color:${d};margin:4px 0">${o.value}${o.unit}</div>
            <div style="font-size:0.7rem;display:flex;justify-content:space-between"><span>Benchmark: ${o.benchmark}${o.unit}</span><span style="color:${d}">${o.status}</span></div>
          </div>`}).join("")}
      </div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F3D7}\uFE0F Supply Chain State</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;padding:16px">
        ${Object.entries(s.state||{}).map(([l,o])=>`<div style="text-align:center;padding:12px;background:var(--bg-tertiary);border-radius:8px"><div style="font-size:1.2rem;font-weight:700">${o}</div><div style="font-size:0.7rem;color:var(--text-muted)">${l.replace(/_/g," ")}</div></div>`).join("")}
      </div>
    </div>
    ${e.total_anomalies>0?`<div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u26A1 Detected Anomalies</div></div>
      <table class="data-table"><thead><tr><th>Type</th><th>Severity</th><th>Entity</th><th>Message</th><th>Action</th></tr></thead><tbody>
        ${(e.anomalies||[]).map(l=>`<tr><td>${l.type}</td><td><span class="badge ${l.severity==="critical"?"badge-red":l.severity==="high"?"badge-amber":"badge-cyan"}">${l.severity}</span></td><td>${l.entity_type}/${l.entity_id?.slice(0,8)||"\u2014"}</td><td style="font-size:0.8rem">${l.message}</td><td style="font-size:0.75rem;color:var(--text-muted)">${l.recommended_action}</td></tr>`).join("")}
      </tbody></table>
    </div>`:""}`}function _s(){let t=r.sustainData;if(!t)return'<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading sustainability data...</span></div>';let s=t.stats||{};return`
    <div class="stats-grid">
      <div class="stat-card emerald"><div class="stat-icon">\u267B\uFE0F</div><div class="stat-value">${s.products_assessed||0}</div><div class="stat-label">Products Assessed</div></div>
      <div class="stat-card cyan"><div class="stat-icon">\u{1F4CA}</div><div class="stat-value">${s.avg_score?.toFixed(1)||0}</div><div class="stat-label">Avg Score</div></div>
      <div class="stat-card violet"><div class="stat-icon">\u{1F3C5}</div><div class="stat-value">${s.certifications_issued||0}</div><div class="stat-label">Green Certs</div></div>
      <div class="stat-card amber"><div class="stat-icon">\u{1F30D}</div><div class="stat-value">${s.avg_carbon_footprint?.toFixed(1)||0}</div><div class="stat-label">Avg Carbon</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F331} Sustainability Scores</div></div>
      <table class="data-table"><thead><tr><th>Product</th><th>Carbon</th><th>Water</th><th>Recycl.</th><th>Ethical</th><th>Overall</th><th>Grade</th></tr></thead><tbody>
        ${(t.scores||[]).map(a=>`<tr><td>${a.product_id?.slice(0,8)||"\u2014"}</td><td>${a.carbon_footprint}</td><td>${a.water_usage}</td><td>${a.recyclability}</td><td>${a.ethical_sourcing}</td><td style="font-weight:700">${a.overall_score}</td><td><span class="badge ${a.grade==="A"?"badge-green":a.grade==="B"?"badge-cyan":a.grade==="C"?"badge-amber":"badge-red"}">${a.grade}</span></td></tr>`).join("")}
      </tbody></table>
    </div>`}function ks(){let t=r.complianceData;if(!t)return'<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading compliance data...</span></div>';let s=t.stats||{};return`
    <div class="stats-grid">
      <div class="stat-card emerald"><div class="stat-icon">\u{1F4DC}</div><div class="stat-value">${s.compliance_rate||0}%</div><div class="stat-label">Compliance Rate</div></div>
      <div class="stat-card rose"><div class="stat-icon"><span class="status-icon status-warn" aria-label="Warning">!</span></div><div class="stat-value">${s.non_compliant||0}</div><div class="stat-label">Non-Compliant</div></div>
      <div class="stat-card cyan"><div class="stat-icon">\u{1F4CB}</div><div class="stat-value">${s.total_records||0}</div><div class="stat-label">Total Records</div></div>
      <div class="stat-card violet"><div class="stat-icon">\u{1F5C2}\uFE0F</div><div class="stat-value">${(t.policies||[]).length}</div><div class="stat-label">Retention Policies</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F4CB} Compliance Records</div></div>
      <table class="data-table"><thead><tr><th>Entity</th><th>Framework</th><th>Requirement</th><th>Status</th><th>Next Review</th></tr></thead><tbody>
        ${(t.records||[]).map(a=>`<tr><td>${a.entity_type}/${a.entity_id?.slice(0,8)||"\u2014"}</td><td><strong>${a.framework}</strong></td><td>${a.requirement||"\u2014"}</td><td><span class="badge ${a.status==="compliant"?"badge-green":"badge-red"}">${a.status}</span></td><td>${a.next_review?S(a.next_review):"\u2014"}</td></tr>`).join("")}
      </tbody></table>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F5C2}\uFE0F Data Retention Policies</div></div>
      <table class="data-table"><thead><tr><th>Table</th><th>Retention</th><th>Action</th><th>Active</th><th>Last Run</th></tr></thead><tbody>
        ${(t.policies||[]).map(a=>`<tr><td><code>${a.table_name}</code></td><td>${a.retention_days} days</td><td>${a.action}</td><td>${a.is_active?'<span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span>':'<span class="status-icon status-fail" aria-label="Fail">\u2717</span>'}</td><td>${a.last_run?S(a.last_run):"Never"}</td></tr>`).join("")}
      </tbody></table>
    </div>`}function Ss(){let t=r.anomalyData;return t?`
    <div class="stats-grid">
      <div class="stat-card rose"><div class="stat-icon">\u26A1</div><div class="stat-value">${t.total||0}</div><div class="stat-label">Total Anomalies</div></div>
      <div class="stat-card amber"><div class="stat-icon"><span class="status-dot red"></span></div><div class="stat-value">${t.by_severity?.critical||0}</div><div class="stat-label">Critical</div></div>
      <div class="stat-card violet"><div class="stat-icon"><span class="status-dot amber"></span></div><div class="stat-value">${t.by_severity?.high||0}</div><div class="stat-label">High</div></div>
      <div class="stat-card emerald"><div class="stat-icon"><span class="status-dot green"></span></div><div class="stat-value">${t.by_severity?.medium||0}</div><div class="stat-label">Medium</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u26A1 Anomaly Detections</div></div>
      <table class="data-table"><thead><tr><th>Time</th><th>Type</th><th>Severity</th><th>Source</th><th>Score</th><th>Description</th><th>Status</th></tr></thead><tbody>
        ${(t.detections||[]).map(s=>`<tr><td>${S(s.detected_at)}</td><td>${s.anomaly_type}</td><td><span class="badge ${s.severity==="critical"?"badge-red":s.severity==="high"?"badge-amber":"badge-cyan"}">${s.severity}</span></td><td>${s.source_type}</td><td>${s.score?.toFixed(2)||"\u2014"}</td><td style="font-size:0.8rem;max-width:200px;overflow:hidden;text-overflow:ellipsis">${s.description}</td><td><span class="badge ${s.status==="open"?"badge-red":"badge-green"}">${s.status}</span></td></tr>`).join("")}
      </tbody></table>
    </div>`:'<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading anomaly data...</span></div>'}function Ps(){let t=r.reportsData;return t?`
    <div class="stats-grid">
      <div class="stat-card cyan"><div class="stat-icon">\u{1F4CA}</div><div class="stat-value">${(t.templates||[]).length}</div><div class="stat-label">Report Templates</div></div>
      <div class="stat-card violet"><div class="stat-icon">\u{1F4CB}</div><div class="stat-value">${t.formats?.length||3}</div><div class="stat-label">Export Formats</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F4CA} Report Templates</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;padding:16px">
        ${(t.templates||[]).map(s=>`
          <div style="padding:20px;background:var(--bg-tertiary);border-radius:12px;cursor:pointer" onclick="generateReport('${s.id}')">
            <div style="font-weight:700;margin-bottom:4px">${s.name||s.id}</div>
            <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:12px">${s.description||""}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">${(s.sections||[]).map(a=>`<span class="badge">${a}</span>`).join("")}</div>
            <button class="btn btn-sm" style="margin-top:12px;width:100%">\u{1F4C4} Generate</button>
          </div>`).join("")}
      </div>
    </div>`:'<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading reports...</span></div>'}function Cs(){let t=r.nftData;return t?`
    <div class="stats-grid">
      <div class="stat-card violet"><div class="stat-icon">\u{1F3A8}</div><div class="stat-value">${t.total||(t.certificates||[]).length}</div><div class="stat-label">Total NFTs</div></div>
      <div class="stat-card emerald"><div class="stat-icon"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span></div><div class="stat-value">${(t.certificates||[]).filter(s=>s.status==="active").length}</div><div class="stat-label">Active</div></div>
      <div class="stat-card cyan"><div class="stat-icon">\u{1F517}</div><div class="stat-value">${(t.certificates||[]).filter(s=>s.blockchain_seal_id).length}</div><div class="stat-label">On-Chain</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F3A8} NFT Certificate Registry</div></div>
      <table class="data-table"><thead><tr><th>Token ID</th><th>Type</th><th>Product</th><th>Owner</th><th>Status</th><th>Minted</th></tr></thead><tbody>
        ${(t.certificates||[]).map(s=>`<tr><td><strong>#${s.token_id||"\u2014"}</strong></td><td>${s.certificate_type}</td><td>${s.product_id?.slice(0,8)||"\u2014"}</td><td>${s.owner?.slice(0,12)||"\u2014"}</td><td><span class="badge ${s.status==="active"?"badge-green":"badge-red"}">${s.status}</span></td><td>${S(s.minted_at)}</td></tr>`).join("")}
      </tbody></table>
    </div>`:'<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading NFT certificates...</span></div>'}function Ms(){let t=r.walletData;return t?`
    <div class="stats-grid">
      <div class="stat-card cyan"><div class="stat-icon">\u{1F4B0}</div><div class="stat-value">${(t.wallets||[]).length}</div><div class="stat-label">Wallets</div></div>
      <div class="stat-card violet"><div class="stat-icon">\u{1F4B8}</div><div class="stat-value">${(t.transactions||[]).length}</div><div class="stat-label">Transactions</div></div>
      <div class="stat-card emerald"><div class="stat-icon"><span class="status-icon status-pass" aria-label="Pass"><span class="status-icon status-pass" aria-label="Pass">\u2713</span></span></div><div class="stat-value">${(t.transactions||[]).filter(s=>s.status==="completed").length}</div><div class="stat-label">Completed</div></div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F4B0} Wallets</div></div>
      <table class="data-table"><thead><tr><th>Address</th><th>Network</th><th>Balance</th><th>Status</th></tr></thead><tbody>
        ${(t.wallets||[]).map(s=>`<tr><td><code>${s.address?.slice(0,16)||"\u2014"}...</code></td><td>${s.network||"ETH"}</td><td style="font-weight:700">${s.balance||0} ${s.currency||"ETH"}</td><td><span class="badge badge-green">${s.status||"active"}</span></td></tr>`).join("")}
      </tbody></table>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F4B8} Transaction History</div></div>
      <table class="data-table"><thead><tr><th>Time</th><th>Type</th><th>Amount</th><th>From</th><th>To</th><th>Status</th></tr></thead><tbody>
        ${(t.transactions||[]).map(s=>`<tr><td>${S(s.created_at)}</td><td>${s.type||"\u2014"}</td><td style="font-weight:700">${s.amount||0} ${s.currency||"USD"}</td><td>${s.from_address?.slice(0,10)||"\u2014"}</td><td>${s.to_address?.slice(0,10)||"\u2014"}</td><td><span class="badge ${s.status==="completed"?"badge-green":s.status==="pending"?"badge-amber":"badge-red"}">${s.status}</span></td></tr>`).join("")}
      </tbody></table>
    </div>`:'<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading wallet data...</span></div>'}function Es(){let t=r.brandingData;return t?`
    <div class="card">
      <div class="card-header"><div class="card-title">\u{1F3A8} White-Label Configuration</div></div>
      <div style="padding:20px">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px">
          <div>
            <label class="form-label">Company Name</label>
            <input class="form-input" value="${t.company_name||"TrustChecker"}" id="brand-name" />
          </div>
          <div>
            <label class="form-label">Primary Color</label>
            <div style="display:flex;gap:8px;align-items:center"><input type="color" value="${t.primary_color||"#06b6d4"}" id="brand-color" style="width:40px;height:40px;border:none;cursor:pointer"/><code>${t.primary_color||"#06b6d4"}</code></div>
          </div>
          <div>
            <label class="form-label">Logo URL</label>
            <input class="form-input" value="${t.logo_url||""}" placeholder="https://..." id="brand-logo" />
          </div>
          <div>
            <label class="form-label">Support Email</label>
            <input class="form-input" value="${t.support_email||""}" placeholder="support@company.com" id="brand-email" />
          </div>
        </div>
        <div style="margin-top:20px;display:flex;gap:12px">
          <button class="btn" onclick="saveBranding()">\u{1F4BE} Save Branding</button>
          <button class="btn btn-secondary" onclick="resetBranding()">\u21A9\uFE0F Reset to Default</button>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:20px">
      <div class="card-header"><div class="card-title">\u{1F441}\uFE0F Preview</div></div>
      <div style="padding:20px;background:var(--bg-tertiary);border-radius:8px;display:flex;align-items:center;gap:16px">
        ${t.logo_url?`<img src="${t.logo_url}" alt="Organization logo" style="height:48px;border-radius:8px"/>`:'<div style="width:48px;height:48px;background:var(--cyan);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.4rem">\u{1F6E1}\uFE0F</div>'}
        <div>
          <div style="font-weight:700;font-size:1.2rem">${t.company_name||"TrustChecker"}</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">Enterprise Digital Trust Platform</div>
        </div>
      </div>
    </div>`:'<div class="loading"><div class="spinner"></div><span style="color:var(--text-muted)">Loading branding settings...</span></div>'}document.addEventListener("DOMContentLoaded",()=>{h(),r.user&&c.token&&(nt(),At("dashboard"))});async function Ts(){return(await Promise.resolve().then(()=>(Y(),K))).renderPage()}async function Is(){return(await Promise.resolve().then(()=>(et(),at))).renderPage()}
