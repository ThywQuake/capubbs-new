import{b as l,j as i}from"./vendor-react-CWwtmtts.js";import{B as ae,aE as le,a9 as se,aa as ie,b3 as ce,b2 as E,l as Y,aI as q,aT as ue,ao as de}from"./index-B9ivNKD-.js";import{u as me}from"./RichTextEditor-CV606UCg.js";import{N as pe}from"./vendor-icons-DfMX3aaN.js";import{L as fe,a as K}from"./vendor-router-DSfbOWbe.js";import{r as H}from"./legacyQuote-BqpaoXCY.js";const _=[1,2,3];function Ct(e){const[t,r]=l.useState(()=>k()),[n,o]=l.useState("idle");return l.useEffect(()=>{const a=e?.trim();if(!a){r(k()),o("idle");return}const s=new AbortController;return o("loading"),ae(a,s.signal).then(c=>{r(ge(c)),o("ready")}).catch(c=>{xe(c)||(r(k()),o("error"))}),()=>s.abort()},[e]),l.useMemo(()=>({options:t,status:n}),[t,n])}function kt({disabled:e=!1,id:t,onChange:r,options:n,status:o,value:a}){const s=n.length>0?n:k(),c=I(a)||s[0]?.index||1,f=he(s,c),h=I(a)>0,p=ve(o),g=me(h?f?.sourceHref??"":""),d=g.preview;return i.jsxs("section",{className:"rounded-lg border border-zinc-200 bg-white/45 p-3 dark:border-white/10 dark:bg-white/[0.04]",children:[i.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-3",children:[i.jsxs("label",{className:"flex items-center gap-3 text-sm font-bold text-[#385772] dark:text-white",children:[i.jsx("input",{type:"checkbox",checked:h,disabled:e,onChange:u=>r(u.target.checked?c:0),className:"h-4 w-4 rounded border-zinc-300 text-[#385772] focus:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:bg-zinc-900 dark:focus:ring-emerald-200"}),i.jsxs("span",{className:"inline-flex items-center gap-2",children:[i.jsx(pe,{size:15,className:"text-emerald-700/80 dark:text-emerald-100/80"}),"使用签名档"]})]}),p?i.jsx("span",{className:le("rounded-full px-2 py-1 text-xs font-bold",o==="error"?"bg-rose-50 text-rose-700 dark:bg-rose-300/10 dark:text-rose-100":"bg-zinc-100 text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-300"),children:p}):null]}),h?i.jsxs("div",{className:"mt-3 grid gap-2 sm:grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)] sm:items-center",children:[i.jsx("label",{className:"sr-only",htmlFor:t,children:"选择签名档"}),i.jsx("select",{id:t,value:c,disabled:e,onChange:u=>r(Number.parseInt(u.currentTarget.value,10)),className:"h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-bold text-[#385772] outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900 dark:text-white",children:s.map(u=>i.jsx("option",{value:u.index,children:ye(u)},u.index))}),i.jsx("p",{className:"min-w-0 truncate rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-sm font-semibold text-zinc-600 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300",children:f&&!f.isEmpty?f.excerpt:"当前签名档为空"})]}):null,h&&(d||g.isLoading||g.error)?i.jsx("div",{className:"mt-3 rounded-lg border border-emerald-100 bg-emerald-50/55 p-3 dark:border-emerald-200/15 dark:bg-emerald-300/[0.06]",children:d?i.jsxs(i.Fragment,{children:[i.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-2",children:[i.jsxs("span",{className:"text-xs font-semibold text-[#875A41] dark:text-white/65",children:["链接楼层 · ",d.title," #",d.floor," · ",d.author]}),i.jsx(fe,{to:d.path,className:"rounded-sm text-sm font-semibold text-teal-700 outline-none hover:text-teal-900 hover:underline focus-visible:ring-2 focus-visible:ring-teal-700 dark:text-white",children:"跳转到链接楼层 >>"})]}),i.jsx("p",{className:"mt-2 line-clamp-2 text-sm leading-[var(--capubbs-thread-card-line-height)] text-zinc-600 dark:text-zinc-300",children:d.excerpt})]}):i.jsxs(i.Fragment,{children:[i.jsx("span",{className:"text-xs font-semibold text-[#875A41] dark:text-white/65",children:"链接楼层"}),i.jsx("p",{className:"mt-2 text-sm leading-[var(--capubbs-thread-card-line-height)] text-zinc-600 dark:text-zinc-300",children:g.isLoading?"读取链接楼层中...":"这个链接指向的楼层暂时无法预览。"})]})}):null]})}function he(e,t){const r=I(t);return r<=0?null:e.find(n=>n.index===r)??null}function I(e){return typeof e!="number"||!Number.isFinite(e)?0:_.includes(e)?e:0}function ge(e){return _.map(t=>{const r=be(e,t);return{excerpt:se(r).trim(),html:ce(r),index:t,isEmpty:r.trim().length===0,sourceHref:ie(r)||void 0}})}function k(){return _.map(e=>({excerpt:"",html:"",index:e,isEmpty:!0}))}function be(e,t){const r=`sig${t}`,n=e[r];return typeof n=="string"?n:n==null?"":String(n)}function ye(e){if(e.isEmpty)return`签名档 ${e.index}（空）`;const t=e.excerpt.length>18?`${e.excerpt.slice(0,18)}...`:e.excerpt;return t?`签名档 ${e.index}：${t}`:`签名档 ${e.index}`}function ve(e){return e==="loading"?"读取签名档中":e==="error"?"签名档读取失败":""}function xe(e){return e instanceof DOMException&&e.name==="AbortError"}const V=12,Se=new Set(["capubbs.local","chexie.net","www.chexie.net"]),L=new Map;async function we(e,t){const r=Te(e);if(!r)throw new Error("无法识别旧签名档楼层链接");if(!r.pid)return Ae(r,t);const n=await Ee({...r,pid:r.pid},t),o=W(r.page,n.pid),a=H(n.rawText||n.contentHtml).trim();return[`<div class="floor" id="${F(String(n.pid))}" data-bid="${n.bid}" data-tid="${n.tid}" data-pid="${n.pid}" data-fid="${n.fid}">`,`<div class="textblock" id="${F(o)}" data-fid="${n.fid}" style="line-height:160% !important">${a}</div>`,"</div>"].join("")}async function Ae({bid:e,page:t,tid:r},n){const s=(await Y({ask:"thread_detail",bid:e,page:t,render:"raw",tid:r},n))[0]?.floorsPage?.items;if(!Array.isArray(s))throw new Error("无法读取旧签名档引用页面");return s.map(c=>ke(c,t)).join("")}async function Ee({bid:e,pid:t,tid:r},n){const o=`${e}:${r}:${t}`,a=L.get(o);if(a)return a;const s=Y({bid:e,pid:t,tid:r},n).then(c=>{const f=c.find(h=>E(h.pid)===t)??c[0];return f?q(f):q({bid:e,tid:r,pid:t})}).catch(c=>{throw L.delete(o),c});return L.set(o,s),s}function Te(e){try{const t=new URL(e.replace(/&amp;/gi,"&"),"https://capubbs.local/bbs/content/"),r=t.hostname.toLowerCase();if(!Se.has(r)||!Fe(t.pathname))return null;const n=E(t.searchParams.get("bid")),o=E(t.searchParams.get("tid")),a=E(t.searchParams.get("p")??t.searchParams.get("page")),s=E(t.searchParams.get("pid")),c=Math.max(1,Math.floor(a>0?a:Math.ceil(Math.max(1,s)/V)));return n<=0||o<=0?null:{bid:n,page:c,...s>0?{pid:s}:{},tid:o}}catch{return null}}function W(e,t){const r=Ce(e,t);return`floor${Math.max(0,r)}`}function Ce(e,t){return t-(Math.max(1,Math.floor(e))-1)*V-1}function ke(e,t){const r=W(t,e.pid),n=H(e.rawText||e.contentHtml).trim();return[`<div class="floor" id="${F(String(e.pid))}" data-bid="${e.bid}" data-tid="${e.tid}" data-pid="${e.pid}" data-fid="${e.fid}">`,`<div class="textblock" id="${F(r)}" data-fid="${e.fid}" style="line-height:160% !important">${n}</div>`,"</div>"].join("")}function Fe(e){return/^\/bbs\/content\/?$/i.test(e)||/^\/content\/?$/i.test(e)||/^\/api\/bbs\/content\/floor\/?$/i.test(e)}function F(e){return e.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}const Me=5e4,Le=24,Re=5e3,Ne=72,Ie=24,D=2,He=500,C=pt("/bbs-new/"),_e=new Set(["http:","https:","mailto:","tel:"]),T="capubbs-activity-signup-canceled",Pe=/<\s*\/?\s*(?:script|iframe|frame|frameset|object|embed|audio|video|canvas|svg|math|style|link|meta|base|form|input|textarea|select|button|option)\b/i,$e=/\s(?:on[a-z][\w:-]*|srcdoc|style|color)\s*=/i,Ue=/\b(?:href|action|formaction)\s*=\s*(?:"\s*(?:javascript|data):|'\s*(?:javascript|data):|(?:javascript|data):)/i,je=/\bdata-capubbs-signature-floor-url\s*=|capubbs:signature-floor/i,ze=/<\s*(?:!doctype|html|head|body)\b/i,Oe=["accelerometer 'none'","autoplay 'none'","camera 'none'","clipboard-read 'none'","clipboard-write 'none'","encrypted-media 'none'","fullscreen 'none'","geolocation 'none'","gyroscope 'none'","magnetometer 'none'","microphone 'none'","midi 'none'","payment 'none'","picture-in-picture 'none'","publickey-credentials-get 'none'","screen-wake-lock 'none'","serial 'none'","usb 'none'","xr-spatial-tracking 'none'"].join("; ");function Ft({currentAccountId:e,floor:t,isActivitySignupCanceled:r,navigationContextPath:n,onSelectedTextChange:o,onThreadLinkNavigate:a}){return i.jsx(X,{currentAccountId:e,fallbackContent:t.content,frameIdSeed:`floor-${t.id}`,htmlContent:t.htmlContent,isActivitySignupCanceled:r,minHeight:64,navigationContextPath:n,title:`第 ${t.floor} 楼正文`,variant:"content",onSelectedTextChange:o,onThreadLinkNavigate:a})}function Mt({currentAccountId:e,floor:t,navigationContextPath:r,onThreadLinkNavigate:n}){return i.jsx(X,{currentAccountId:e,fallbackContent:t.signature??[],frameIdSeed:`signature-${t.id}`,htmlContent:t.signatureHtml,isActivitySignupCanceled:!1,minHeight:24,navigationContextPath:r,title:`第 ${t.floor} 楼签名档`,variant:"signature",onThreadLinkNavigate:n})}function X({currentAccountId:e,fallbackContent:t,frameIdSeed:r,htmlContent:n,isActivitySignupCanceled:o,minHeight:a,navigationContextPath:s,onSelectedTextChange:c,onThreadLinkNavigate:f,title:h,variant:p}){const g=l.useMemo(()=>n?.trim()||lt(t),[t,n]),d=l.useMemo(()=>p==="content"?H(g):ue(g),[g,p]),u={contentHtml:d,frameIdSeed:r,isActivitySignupCanceled:o,navigationContextPath:s,onSelectedTextChange:c,onThreadLinkNavigate:f,title:h,variant:p};return Be(d)?i.jsx(De,{...u,currentAccountId:e,minHeight:a}):i.jsx(qe,{...u})}function qe({contentHtml:e,frameIdSeed:t,isActivitySignupCanceled:r,navigationContextPath:n,onSelectedTextChange:o,onThreadLinkNavigate:a,title:s,variant:c}){const f=l.useRef(null),h=K(),p=l.useMemo(()=>te(n),[n]),g=l.useMemo(ee,[]),d=Z(c,r),u=l.useCallback(()=>{const b=typeof window>"u"?null:window.getSelection(),v=f.current;if(!v||!b||b.isCollapsed||!Qe(b,v)){o?.(null);return}o?.(re(b.toString()))},[o]),S=l.useCallback(b=>{if(b.defaultPrevented||b.button!==0||b.altKey||b.ctrlKey||b.metaKey||b.shiftKey||b.nativeEvent.isTrusted===!1)return;const v=Ge(b.target),w=v?Ye(v,v.getAttribute("href"),g):"";w&&(b.preventDefault(),J(w,h,p,a))},[g,h,p,a]);return l.useEffect(()=>{o?.(null)},[e,t,o]),l.useEffect(()=>{if(!(!o||typeof document>"u"))return document.addEventListener("selectionchange",u),()=>document.removeEventListener("selectionchange",u)},[o,u]),i.jsx("div",{ref:f,"aria-label":s,className:`capubbs-floor-frame-root ${d}`,dangerouslySetInnerHTML:{__html:e},onClick:S,onKeyUp:u,onMouseUp:u})}function De({contentHtml:e,currentAccountId:t,frameIdSeed:r,isActivitySignupCanceled:n,minHeight:o,navigationContextPath:a,onSelectedTextChange:s,onThreadLinkNavigate:c,title:f,variant:h}){const p=l.useRef(null),g=l.useRef(`${r}-${Math.random().toString(36).slice(2)}`),d=l.useRef({animationFrameId:null,lastMessageAt:0,pointerViewportY:0}),u=l.useRef(()=>{}),S=K(),[b,v]=l.useState(o),w=yt()==="dark",P=l.useMemo(ft,[]),$=l.useMemo(ee,[]),U=l.useMemo(()=>te(a),[a]),j=it(),z=l.useMemo(()=>nt({contentHtml:e,currentAccountId:t,frameId:g.current,isActivitySignupCanceled:n,isDarkTheme:w,documentBaseUrl:P,legacyNavigationBaseUrl:$,siteStyles:j,variant:h}),[e,t,P,n,w,$,j,h]),ne=l.useMemo(()=>ht(z),[z]),x=l.useCallback(()=>{const y=d.current;y.animationFrameId!==null&&(window.cancelAnimationFrame(y.animationFrameId),y.animationFrameId=null),y.lastMessageAt=0},[]),M=l.useCallback(()=>{const y=d.current;y.animationFrameId===null&&(y.animationFrameId=window.requestAnimationFrame(()=>{u.current()}))},[]);u.current=()=>{const y=d.current,m=p.current;if(y.animationFrameId=null,!m||Date.now()-y.lastMessageAt>He){x();return}const A=We(m,y.pointerViewportY);A&&Je(A.target,A.deltaY)&&et(A.target,A.deltaY),M()};const oe=l.useCallback(()=>{x(),Ve(p.current)},[x]),O=l.useCallback(y=>{const m=p.current;m&&(d.current.pointerViewportY=m.getBoundingClientRect().top+y.pointerClientY,d.current.lastMessageAt=Date.now(),M())},[M]);return l.useEffect(()=>()=>x(),[x]),l.useEffect(()=>{x(),v(o),s?.(null)},[e,r,o,s,x]),l.useEffect(()=>{const y=m=>{if(!(m.source!==p.current?.contentWindow||!rt(m.data))&&m.data.frameId===g.current){if(m.data.type==="resize"){v(Math.min(Me,Math.max(Le,Math.ceil(m.data.height))));return}if(m.data.type==="legacy-signature-floor-request"){tt(p.current,m.data);return}if(m.data.type==="navigate"){J(m.data.url,S,U,c);return}if(m.data.type==="selection-auto-scroll"){O(m.data);return}if(m.data.type==="selection-auto-scroll-stop"){x();return}s?.(re(m.data.text))}};return window.addEventListener("message",y),()=>window.removeEventListener("message",y)},[O,S,U,s,c,x]),i.jsx("iframe",{ref:p,allow:Oe,allowTransparency:!0,className:"capubbs-html-preview-frame block w-full border-0 bg-transparent",onLoad:oe,referrerPolicy:"no-referrer",sandbox:"allow-scripts allow-same-origin",src:ne,style:{background:"transparent",backgroundColor:"transparent",colorScheme:"normal",height:b,maxWidth:"100%",minWidth:0},title:f})}function Be(e){return Pe.test(e)||$e.test(e)||Ue.test(e)||je.test(e)||ze.test(e)}function Z(e,t){return["capubbs-editor-prose",e==="signature"?"text-xs leading-[var(--capubbs-thread-card-line-height)] text-zinc-500 dark:text-white/60":"text-sm leading-[var(--capubbs-thread-card-line-height)] text-zinc-700 dark:text-zinc-200 sm:text-base",e==="signature"?"sig":"",t?`${T} text-rose-700 line-through decoration-2 decoration-rose-600 dark:text-rose-200 dark:decoration-rose-200`:""].filter(Boolean).join(" ")}function Qe(e,t){const{anchorNode:r,focusNode:n}=e;return!!(r&&n&&(r===t||t.contains(r))&&(n===t||t.contains(n)))}function Ge(e){return(e instanceof Element?e:e instanceof Node?e.parentElement:null)?.closest("a[href]")??null}function Ye(e,t,r){const n=String(t||"").trim();if(!n)return"";if(n.charAt(0)==="#")return n;if(n.charAt(0)==="?"||!Ke(n)&&n.charAt(0)!=="/")try{return new URL(n,r).href}catch{return e.href||n}return e.href||n}function Ke(e){return/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(e)}function Ve(e){if(e){e.style.setProperty("background","transparent","important"),e.style.setProperty("background-color","transparent","important"),e.style.setProperty("color-scheme","normal");try{const t=e.contentDocument;if(!t)return;R(t.documentElement),R(t.body),R(t.querySelector(".capubbs-floor-frame-root")),t.documentElement.style.setProperty("color-scheme","normal","important")}catch{}}}function R(e){if(!e||!("style"in e))return;const t=e.style;t.setProperty("background","transparent","important"),t.setProperty("background-color","transparent","important"),t.setProperty("background-image","none","important")}function We(e,t){if(!Number.isFinite(t)||typeof window>"u")return null;const r=Ze(e),n=Xe(r);if(!n)return null;const o=Math.min(Ne,Math.max(24,(n.bottom-n.top)/3)),a=n.top+o,s=n.bottom-o;return t<a?{deltaY:-B(a-t,o),target:r}:t>s?{deltaY:B(t-s,o),target:r}:null}function Xe(e){if(e){const t=e.getBoundingClientRect(),r=Math.max(0,t.top),n=Math.min(window.innerHeight,t.bottom);return n>r?{bottom:n,top:r}:null}return window.innerHeight>0?{bottom:window.innerHeight,top:0}:null}function B(e,t){const r=Math.max(0,Math.min(1,e/t));return Math.ceil(D+r*(Ie-D))}function Ze(e){let t=e.parentElement;for(;t&&t!==document.body;){const r=window.getComputedStyle(t);if(/(auto|scroll|overlay)/.test(r.overflowY)&&t.scrollHeight>t.clientHeight)return t;t=t.parentElement}return null}function Je(e,t){if(t===0)return!1;if(e)return t<0?e.scrollTop>0:e.scrollTop+e.clientHeight<e.scrollHeight-1;const r=document.scrollingElement,n=window.scrollY||r?.scrollTop||0,o=window.innerHeight||r?.clientHeight||0,a=r?.scrollHeight||document.documentElement.scrollHeight||0;return t<0?n>0:n+o<a-1}function et(e,t){if(e){e.scrollTop+=t;return}window.scrollBy({behavior:"auto",top:t})}async function tt(e,t){const r=e?.contentWindow;if(r)try{const n=await we(t.url);r.postMessage({frameId:t.frameId,html:n,requestId:t.requestId,source:"capubbs-parent-frame",type:"legacy-signature-floor-response"},"*")}catch{r.postMessage({frameId:t.frameId,html:"",requestId:t.requestId,source:"capubbs-parent-frame",type:"legacy-signature-floor-response"},"*")}}function rt(e){if(!e||typeof e!="object")return!1;const t=e;return t.source!=="capubbs-floor-frame"||typeof t.frameId!="string"?!1:t.type==="resize"?typeof t.height=="number"&&Number.isFinite(t.height):t.type==="legacy-signature-floor-request"?typeof t.requestId=="string"&&typeof t.url=="string":t.type==="navigate"?typeof t.url=="string":t.type==="selection-auto-scroll"?typeof t.pointerClientY=="number"&&Number.isFinite(t.pointerClientY):t.type==="selection-auto-scroll-stop"?!0:t.type==="selection"&&typeof t.text=="string"}function nt({contentHtml:e,currentAccountId:t,documentBaseUrl:r,frameId:n,isActivitySignupCanceled:o,isDarkTheme:a,legacyNavigationBaseUrl:s,siteStyles:c,variant:f}){const h=ct(n,t,s),p=st(),g=at(),d=a?"dark":"light",u=Z(f,o),S=o?`
  .${T},
  .${T} * {
    color: rgb(190 18 60) !important;
    text-decoration-line: line-through !important;
    text-decoration-thickness: 2px !important;
    text-decoration-color: rgb(225 29 72) !important;
  }
  .dark .${T},
  .dark .${T} * {
    color: rgb(254 205 211) !important;
    text-decoration-color: rgb(254 205 211) !important;
  }`:"";return`<!doctype html>
<html class="${d} capubbs-floor-frame-document" style="background: transparent; color-scheme: normal;">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <base href="${bt(r)}">
  <meta http-equiv="Content-Security-Policy" content="${p}">
  <style>${gt(c)}</style>
  <style>${g}</style>
  <style>${S}</style>
  <script>${h}<\/script>
</head>
<body class="capubbs-floor-frame-body" style="background: transparent;">
  <main class="capubbs-floor-frame-root ${u}" style="background: transparent;">${ot(e)}</main>
</body>
</html>`}function ot(e){return e.replace(/<script\b([^>]*)>/gi,(t,r)=>`<script${String(r).replace(/\s+type\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,"")} type="text/capubbs-user-script">`)}function at(){return`
:root,
html,
body,
html.capubbs-floor-frame-document,
html.capubbs-floor-frame-document body,
html.capubbs-floor-frame-document .capubbs-floor-frame-root {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
}

html.capubbs-floor-frame-document {
  color-scheme: normal !important;
}

html.capubbs-floor-frame-document,
html.capubbs-floor-frame-document body {
  margin: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
}

html.capubbs-floor-frame-document.light body {
  color: rgb(63 63 70);
}

html.capubbs-floor-frame-document.dark body {
  color: rgb(228 228 231);
}

html.capubbs-floor-frame-document .capubbs-floor-frame-root iframe {
  display: inline-block;
  max-width: 100%;
  vertical-align: middle;
}
`}function lt(e){return e.map(t=>`<p>${vt(t)}</p>`).join("")}function st(){return["default-src 'none'","script-src 'unsafe-inline' http: https: data: blob:","style-src 'unsafe-inline' http: https:","img-src http: https: data: blob:","media-src http: https: data: blob:","font-src http: https: data: blob:","connect-src 'none'","worker-src 'none'","frame-src http: https: data: blob:","child-src http: https: data: blob:","object-src 'none'","base-uri http: https:","form-action 'none'"].join("; ")}function Q(){return typeof document>"u"?"":Array.from(document.styleSheets).map(e=>{try{return Array.from(e.cssRules).map(t=>t.cssText).join(`
`)}catch{const t=e.ownerNode;return t instanceof HTMLStyleElement?t.textContent??"":""}}).filter(Boolean).join(`
`)}function it(){const[e,t]=l.useState(Q);return l.useEffect(()=>{if(typeof document>"u"||typeof MutationObserver>"u")return;const r=()=>{const o=Q();t(a=>a===o?a:o)},n=new MutationObserver(r);return n.observe(document.head,{attributes:!0,childList:!0,characterData:!0,subtree:!0}),r(),()=>n.disconnect()},[]),e}function ct(e,t,r){const n=typeof t=="number"&&Number.isFinite(t)?t:null;return`(function () {
  var frameId = ${N(e)};
  var currentAccountId = ${N(n)};
  var legacyNavigationBaseUrl = ${N(r)};

  Object.defineProperty(window, 'CAPUBBS_CURRENT_ACCOUNT_ID', {
    value: currentAccountId,
    writable: false,
    enumerable: true,
    configurable: false
  });
  Object.defineProperty(window, 'CAPUBBS', {
    value: Object.freeze({ currentAccountId: currentAccountId }),
    writable: false,
    enumerable: true,
    configurable: false
  });

  function postMessageToParent(message) {
    window.parent.postMessage(Object.assign({
      source: 'capubbs-floor-frame',
      frameId: frameId
    }, message), '*');
  }

  function setTransparentFrameElementBackground(element) {
    if (!element || !element.style || !element.style.setProperty) {
      return;
    }

    element.style.setProperty('background', 'transparent', 'important');
    element.style.setProperty('background-color', 'transparent', 'important');
    element.style.setProperty('background-image', 'none', 'important');
  }

  function applyTransparentFrameCanvas() {
    setTransparentFrameElementBackground(document.documentElement);

    if (document.documentElement && document.documentElement.style) {
      document.documentElement.style.setProperty('color-scheme', 'normal', 'important');
    }

    setTransparentFrameElementBackground(document.body);
    setTransparentFrameElementBackground(document.querySelector('.capubbs-floor-frame-root'));
  }

  applyTransparentFrameCanvas();

  var legacyGrayscaleNamedColors = {
    black: 0,
    darkgray: 169,
    darkgrey: 169,
    dimgray: 105,
    dimgrey: 105,
    gainsboro: 220,
    gray: 128,
    grey: 128,
    lightgray: 211,
    lightgrey: 211,
    silver: 192,
    white: 255,
    whitesmoke: 245
  };

  function getLegacyGrayscaleColor(value) {
    var colorText = String(value == null ? '' : value).trim().toLowerCase().replace(/^['"]|['"]$/g, '');
    var compactColorText = colorText.replace(/\\s+/g, '');
    var namedChannel = legacyGrayscaleNamedColors[compactColorText];

    if (typeof namedChannel === 'number') {
      return { alpha: 1, channel: namedChannel };
    }

    var hexMatch = compactColorText.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);

    if (hexMatch) {
      var hex = hexMatch[1];
      var redHex = '';
      var greenHex = '';
      var blueHex = '';

      if (hex.length === 3) {
        redHex = hex.charAt(0) + hex.charAt(0);
        greenHex = hex.charAt(1) + hex.charAt(1);
        blueHex = hex.charAt(2) + hex.charAt(2);
      } else {
        redHex = hex.slice(0, 2);
        greenHex = hex.slice(2, 4);
        blueHex = hex.slice(4, 6);
      }

      if (redHex === greenHex && greenHex === blueHex) {
        return { alpha: 1, channel: parseInt(redHex, 16) };
      }

      return null;
    }

    var rgbMatch = colorText.match(/^rgba?\\(\\s*(\\d{1,3}%?)(?:\\s*,\\s*|\\s+)(\\d{1,3}%?)(?:\\s*,\\s*|\\s+)(\\d{1,3}%?)(?:\\s*(?:,|\\/)\\s*([01](?:\\.\\d+)?|\\.\\d+|100%|\\d{1,3}%))?\\s*\\)$/);

    if (!rgbMatch) {
      return null;
    }

    var red = parseLegacyRgbChannel(rgbMatch[1]);
    var green = parseLegacyRgbChannel(rgbMatch[2]);
    var blue = parseLegacyRgbChannel(rgbMatch[3]);
    var alpha = parseLegacyAlphaChannel(rgbMatch[4]);

    if (red === null || green === null || blue === null || alpha === null || red !== green || green !== blue) {
      return null;
    }

    return { alpha: alpha, channel: red };
  }

  function parseLegacyRgbChannel(value) {
    var rawValue = String(value || '').trim();
    var isPercent = rawValue.endsWith('%');
    var channel = Number(isPercent ? rawValue.slice(0, -1) : rawValue);

    if (!Number.isFinite(channel)) {
      return null;
    }

    if (isPercent) {
      if (channel < 0 || channel > 100) {
        return null;
      }

      return Math.round(channel * 2.55);
    }

    return channel >= 0 && channel <= 255 ? channel : null;
  }

  function parseLegacyAlphaChannel(value) {
    if (value === undefined) {
      return 1;
    }

    var rawValue = String(value).trim();
    var isPercent = rawValue.endsWith('%');
    var alpha = Number(isPercent ? rawValue.slice(0, -1) : rawValue);

    if (!Number.isFinite(alpha)) {
      return null;
    }

    if (isPercent) {
      return alpha >= 0 && alpha <= 100 ? alpha / 100 : null;
    }

    return alpha >= 0 && alpha <= 1 ? alpha : null;
  }

  function getDarkThemeInvertedTextColor(grayscaleColor, allowAlpha) {
    var invertedChannel = 255 - grayscaleColor.channel;

    if (allowAlpha && grayscaleColor.alpha < 1) {
      return 'rgba(' + invertedChannel + ', ' + invertedChannel + ', ' + invertedChannel + ', ' + grayscaleColor.alpha + ')';
    }

    return rgbChannelToHexColor(invertedChannel);
  }

  function rgbChannelToHexColor(channel) {
    var hex = Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0');

    return '#' + hex + hex + hex;
  }

  function applyDarkThemeTextColorInversion(root) {
    if (!document.documentElement.classList.contains('dark')) {
      return;
    }

    var scope = root && root.querySelectorAll ? root : document;
    var elements = Array.prototype.slice.call(scope.querySelectorAll('[color], [style]'));

    if (scope.nodeType === 1 && (scope.hasAttribute('color') || scope.hasAttribute('style'))) {
      elements.unshift(scope);
    }

    elements.forEach(function (element) {
      var originalColorAttribute = element.getAttribute('data-capubbs-original-color-attr') || element.getAttribute('color');
      var colorAttributeGrayscale = getLegacyGrayscaleColor(originalColorAttribute);

      if (colorAttributeGrayscale) {
        element.setAttribute('data-capubbs-original-color-attr', originalColorAttribute);
        element.setAttribute('color', getDarkThemeInvertedTextColor(colorAttributeGrayscale, false));
      }

      if (!element.style || !element.style.getPropertyValue) {
        return;
      }

      var originalStyleColor = element.getAttribute('data-capubbs-original-style-color') || element.style.getPropertyValue('color');
      var styleColorGrayscale = getLegacyGrayscaleColor(originalStyleColor);

      if (styleColorGrayscale) {
        element.setAttribute('data-capubbs-original-style-color', originalStyleColor);
        element.style.setProperty(
          'color',
          getDarkThemeInvertedTextColor(styleColorGrayscale, true),
          element.style.getPropertyPriority('color')
        );
      }
    });
  }

  var legacySignatureRequestSeq = 0;
  var legacySignatureRequests = {};

  function CapubbsQuery(nodes) {
    this.nodes = nodes || [];
    this.length = this.nodes.length;
    for (var index = 0; index < this.nodes.length; index += 1) {
      this[index] = this.nodes[index];
    }
  }

  CapubbsQuery.prototype.find = function (selector) {
    var results = [];

    this.nodes.forEach(function (node) {
      if (!node || !node.querySelectorAll) {
        return;
      }

      Array.prototype.forEach.call(node.querySelectorAll(selector), function (item) {
        results.push(item);
      });
    });

    return new CapubbsQuery(results);
  };

  CapubbsQuery.prototype.html = function (value) {
    if (arguments.length === 0) {
      return this.nodes[0] && this.nodes[0].innerHTML ? this.nodes[0].innerHTML : '';
    }

    this.nodes.forEach(function (node) {
      if (node) {
        node.innerHTML = String(value == null ? '' : value);
        applyDarkThemeTextColorInversion(node);
        applyTransparentFrameCanvas();
      }
    });
    queueResizeMessage();

    return this;
  };

  CapubbsQuery.prototype.each = function (callback) {
    this.nodes.forEach(function (node, index) {
      callback.call(node, index, node);
    });

    return this;
  };

  CapubbsQuery.prototype.parent = function (selector) {
    var parents = [];

    this.nodes.forEach(function (node) {
      var parent = node && node.parentElement;

      if (!parent || (selector && (!parent.matches || !parent.matches(selector)))) {
        return;
      }

      if (parents.indexOf(parent) === -1) {
        parents.push(parent);
      }
    });

    return new CapubbsQuery(parents);
  };

  function createCapubbsQuery(value) {
    if (value instanceof CapubbsQuery) {
      return value;
    }

    if (typeof value === 'function') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', value, { once: true });
      } else {
        value();
      }

      return new CapubbsQuery([]);
    }

    if (typeof value === 'string') {
      return new CapubbsQuery(Array.prototype.slice.call(document.querySelectorAll(value)));
    }

    if (value && typeof value.length === 'number' && !value.nodeType && value !== window) {
      return new CapubbsQuery(Array.prototype.slice.call(value));
    }

    return new CapubbsQuery(value ? [value] : []);
  }

  createCapubbsQuery.parseHTML = function (html) {
    var template = document.createElement('template');
    template.innerHTML = String(html == null ? '' : html);

    return Array.prototype.slice.call(template.content.childNodes);
  };

  createCapubbsQuery.get = function (url, callback) {
    var requestId = 'legacy-signature-' + (++legacySignatureRequestSeq);
    var callbacks = {
      done: typeof callback === 'function' ? [callback] : [],
      fail: []
    };

    legacySignatureRequests[requestId] = callbacks;
    postMessageToParent({
      requestId: requestId,
      type: 'legacy-signature-floor-request',
      url: String(url == null ? '' : url)
    });

    return {
      done: function (handler) {
        if (typeof handler === 'function') {
          callbacks.done.push(handler);
        }

        return this;
      },
      fail: function (handler) {
        if (typeof handler === 'function') {
          callbacks.fail.push(handler);
        }

        return this;
      }
    };
  };

  if (!window.$) {
    window.$ = createCapubbsQuery;
  }
  if (!window.jQuery) {
    window.jQuery = window.$;
  }

  window.addEventListener('message', function (event) {
    var data = event.data || {};

    if (data.source !== 'capubbs-parent-frame' || data.frameId !== frameId) {
      return;
    }

    if (data.type !== 'legacy-signature-floor-response') {
      return;
    }

    var callbacks = legacySignatureRequests[data.requestId];
    delete legacySignatureRequests[data.requestId];

    if (!callbacks) {
      return;
    }

    var html = String(data.html || '');
    var handlers = html ? callbacks.done : callbacks.fail;

    handlers.forEach(function (handler) {
      handler(html);
    });
    applyTransparentFrameCanvas();
    applyDarkThemeTextColorInversion(document.body);
    queueResizeMessage();
  });

  function executeDeferredUserScripts() {
    Array.prototype.slice.call(document.querySelectorAll('script[type="text/capubbs-user-script"]')).forEach(function (script) {
      var executableScript = document.createElement('script');

      Array.prototype.forEach.call(script.attributes, function (attribute) {
        if (attribute.name !== 'type') {
          executableScript.setAttribute(attribute.name, attribute.value);
        }
      });
      executableScript.text = script.text || script.textContent || '';
      script.parentNode.replaceChild(executableScript, script);
    });
    applyTransparentFrameCanvas();
    applyDarkThemeTextColorInversion(document.body);
    queueResizeMessage();
  }

  function getClickedAnchor(target) {
    var element = target && target.nodeType === 1 ? target : target && target.parentElement;

    return element && element.closest ? element.closest('a[href]') : null;
  }

  function isAbsoluteUrlLike(href) {
    return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href);
  }

  function getLinkNavigationUrl(anchor, rawHref) {
    var href = String(rawHref || '').trim();

    if (!href) {
      return '';
    }

    if (href.charAt(0) === '#') {
      return href;
    }

    if (href.charAt(0) === '?' || (!isAbsoluteUrlLike(href) && href.charAt(0) !== '/')) {
      try {
        return new URL(href, legacyNavigationBaseUrl).href;
      } catch (_error) {
        return anchor.href || href;
      }
    }

    return anchor.href || href;
  }

  function handleFrameLinkClick(event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.isTrusted === false
    ) {
      return;
    }

    var anchor = getClickedAnchor(event.target);
    var navigationUrl = anchor ? getLinkNavigationUrl(anchor, anchor.getAttribute('href')) : '';

    if (!navigationUrl) {
      return;
    }

    event.preventDefault();
    postMessageToParent({
      type: 'navigate',
      url: navigationUrl
    });
  }

  function getContentHeight() {
    var contentRoot = document.querySelector('.capubbs-floor-frame-root');

    if (!contentRoot) {
      return 0;
    }

    var rect = contentRoot.getBoundingClientRect ? contentRoot.getBoundingClientRect() : null;

    return Math.max(
      contentRoot.scrollHeight || 0,
      contentRoot.offsetHeight || 0,
      rect ? Math.ceil(rect.height) : 0
    );
  }

  var resizeQueued = false;
  function queueResizeMessage() {
    if (resizeQueued) {
      return;
    }

    resizeQueued = true;
    window.requestAnimationFrame(function () {
      resizeQueued = false;
      postMessageToParent({
        type: 'resize',
        height: getContentHeight()
      });
    });
  }

  function postSelectionMessage() {
    var selection = window.getSelection ? window.getSelection() : null;
    var text = selection && !selection.isCollapsed ? String(selection.toString() || '') : '';

    postMessageToParent({
      type: 'selection',
      text: text
    });
  }

  var selectionAutoScrollActive = false;
  var selectionAutoScrollPointerClientY = 0;
  var selectionAutoScrollFrame = 0;

  function getEventElement(target) {
    return target && target.nodeType === 1 ? target : target && target.parentElement;
  }

  function isInteractiveSelectionTarget(target) {
    var element = getEventElement(target);

    return Boolean(
      element &&
      element.closest &&
      element.closest('input, textarea, select, button, option, [contenteditable=""], [contenteditable="true"]')
    );
  }

  function postSelectionAutoScrollMessage() {
    postMessageToParent({
      type: 'selection-auto-scroll',
      pointerClientY: selectionAutoScrollPointerClientY
    });
  }

  function queueSelectionAutoScrollMessage() {
    if (!selectionAutoScrollActive || selectionAutoScrollFrame) {
      return;
    }

    selectionAutoScrollFrame = window.requestAnimationFrame(function tickSelectionAutoScroll() {
      selectionAutoScrollFrame = 0;

      if (!selectionAutoScrollActive) {
        return;
      }

      postSelectionAutoScrollMessage();
      queueSelectionAutoScrollMessage();
    });
  }

  function stopSelectionAutoScroll() {
    if (selectionAutoScrollFrame) {
      window.cancelAnimationFrame(selectionAutoScrollFrame);
      selectionAutoScrollFrame = 0;
    }

    if (!selectionAutoScrollActive) {
      return;
    }

    selectionAutoScrollActive = false;
    postMessageToParent({
      type: 'selection-auto-scroll-stop'
    });
  }

  function handleSelectionAutoScrollMouseDown(event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      isInteractiveSelectionTarget(event.target)
    ) {
      return;
    }

    selectionAutoScrollActive = true;
    selectionAutoScrollPointerClientY = event.clientY;
    queueSelectionAutoScrollMessage();
  }

  function handleSelectionAutoScrollMouseMove(event) {
    if (!selectionAutoScrollActive) {
      return;
    }

    if (event.buttons !== undefined && (event.buttons & 1) !== 1) {
      stopSelectionAutoScroll();
      return;
    }

    selectionAutoScrollPointerClientY = event.clientY;
  }

  function initFrameBridge() {
    applyTransparentFrameCanvas();
    applyDarkThemeTextColorInversion(document.body);
    queueResizeMessage();
    window.setTimeout(queueResizeMessage, 50);
    window.setTimeout(queueResizeMessage, 250);

    if (window.ResizeObserver) {
      var contentRoot = document.querySelector('.capubbs-floor-frame-root');

      if (contentRoot) {
        new ResizeObserver(queueResizeMessage).observe(contentRoot);
      }
    }

    document.addEventListener('selectionchange', postSelectionMessage);
    document.addEventListener('keyup', postSelectionMessage);
    document.addEventListener('mouseup', postSelectionMessage);
    document.addEventListener('mousedown', handleSelectionAutoScrollMouseDown);
    document.addEventListener('mousemove', handleSelectionAutoScrollMouseMove);
    document.addEventListener('mouseup', stopSelectionAutoScroll);
    document.addEventListener('dragstart', stopSelectionAutoScroll);
    window.addEventListener('blur', stopSelectionAutoScroll);
    window.addEventListener('mouseup', stopSelectionAutoScroll);
    window.addEventListener('load', function () {
      applyTransparentFrameCanvas();
      queueResizeMessage();
    });
    executeDeferredUserScripts();
    applyTransparentFrameCanvas();
    document.addEventListener('click', handleFrameLinkClick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFrameBridge, { once: true });
  } else {
    initFrameBridge();
  }
}());`}function J(e,t,r,n){const o=de(e,r,"/bbs-new/");if(o){if(n?.(o))return;t(o.path);return}const a=ut(e,r);if(a){if(a.origin===window.location.origin){t(dt(a));return}window.location.assign(a.href)}}function ut(e,t){const r=e.trim();if(!r||typeof window>"u")return null;try{const n=new URL(r,t);return _e.has(n.protocol)?n:null}catch{return null}}function dt(e){return`${mt(e.pathname)}${e.search}${e.hash}`}function mt(e){return C?e===C?"/":e.startsWith(`${C}/`)?e.slice(C.length)||"/":e||"/":e||"/"}function pt(e){try{const t=new URL(e||"/","https://capubbs.local").pathname,r=t.endsWith("/")?t.slice(0,-1):t;return r==="/"?"":r}catch{return""}}function ee(){return typeof window>"u"?"https://chexie.net/bbs/content/":new URL("/bbs/content/",window.location.origin).href}function ft(){return typeof window>"u"?"https://chexie.net/bbs/content/":window.location.href}function ht(e){return`data:text/html;charset=utf-8,${encodeURIComponent(e)}`}function te(e){const t=typeof window>"u"?"https://chexie.net/":window.location.href;try{return new URL(e||t,t).href}catch{return t}}function re(e){return e.slice(0,Re).replace(/\r\n?/g,`
`).split(`
`).map(r=>r.trim()).join(`
`).replace(/\n{3,}/g,`

`).trim()||null}function N(e){return(JSON.stringify(e)??"null").replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029")}function gt(e){return e.replace(/<\/style/gi,"<\\/style")}function bt(e){return e.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function G(){return typeof document>"u"?"light":document.documentElement.dataset.theme==="dark"||document.documentElement.classList.contains("dark")?"dark":"light"}function yt(){const[e,t]=l.useState(G);return l.useEffect(()=>{if(typeof document>"u"||typeof MutationObserver>"u")return;const r=()=>t(G()),n=new MutationObserver(r);return n.observe(document.documentElement,{attributeFilter:["class","data-theme"],attributes:!0}),r(),()=>n.disconnect()},[]),e}function vt(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}export{kt as S,Ft as T,Mt as a,he as g,I as n,Ct as u};
