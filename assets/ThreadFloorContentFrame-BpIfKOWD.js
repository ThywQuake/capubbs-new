import{b as i,j as l}from"./vendor-react-CWwtmtts.js";import{B as W,aE as K,a9 as X,aa as Z,b3 as J,b2 as v,l as ee,aI as q,aT as te,ao as re}from"./index-AlwKCx6T.js";import{u as ne}from"./RichTextEditor-DAcUAOwq.js";import{N as oe}from"./vendor-icons-DfMX3aaN.js";import{L as ae,a as le}from"./vendor-router-DSfbOWbe.js";import{r as ie}from"./legacyQuote-PGfPc3Vx.js";const I=[1,2,3];function lt(t){const[e,r]=i.useState(()=>A()),[n,o]=i.useState("idle");return i.useEffect(()=>{const a=t?.trim();if(!a){r(A()),o("idle");return}const c=new AbortController;return o("loading"),W(a,c.signal).then(s=>{r(ce(s)),o("ready")}).catch(s=>{pe(s)||(r(A()),o("error"))}),()=>c.abort()},[t]),i.useMemo(()=>({options:e,status:n}),[e,n])}function it({disabled:t=!1,id:e,onChange:r,options:n,status:o,value:a}){const c=n.length>0?n:A(),s=L(a)||c[0]?.index||1,g=se(c,s),h=L(a)>0,b=me(o),f=ne(h?g?.sourceHref??"":""),d=f.preview;return l.jsxs("section",{className:"rounded-lg border border-zinc-200 bg-white/45 p-3 dark:border-white/10 dark:bg-white/[0.04]",children:[l.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-3",children:[l.jsxs("label",{className:"flex items-center gap-3 text-sm font-bold text-[#385772] dark:text-white",children:[l.jsx("input",{type:"checkbox",checked:h,disabled:t,onChange:p=>r(p.target.checked?s:0),className:"h-4 w-4 rounded border-zinc-300 text-[#385772] focus:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/20 dark:bg-zinc-900 dark:focus:ring-emerald-200"}),l.jsxs("span",{className:"inline-flex items-center gap-2",children:[l.jsx(oe,{size:15,className:"text-emerald-700/80 dark:text-emerald-100/80"}),"使用签名档"]})]}),b?l.jsx("span",{className:K("rounded-full px-2 py-1 text-xs font-bold",o==="error"?"bg-rose-50 text-rose-700 dark:bg-rose-300/10 dark:text-rose-100":"bg-zinc-100 text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-300"),children:b}):null]}),h?l.jsxs("div",{className:"mt-3 grid gap-2 sm:grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)] sm:items-center",children:[l.jsx("label",{className:"sr-only",htmlFor:e,children:"选择签名档"}),l.jsx("select",{id:e,value:s,disabled:t,onChange:p=>r(Number.parseInt(p.currentTarget.value,10)),className:"h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-bold text-[#385772] outline-none transition focus:border-[#385772] focus:ring-2 focus:ring-[#385772] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900 dark:text-white",children:c.map(p=>l.jsx("option",{value:p.index,children:de(p)},p.index))}),l.jsx("p",{className:"min-w-0 truncate rounded-md border border-zinc-200 bg-white/70 px-3 py-2 text-sm font-semibold text-zinc-600 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300",children:g&&!g.isEmpty?g.excerpt:"当前签名档为空"})]}):null,h&&(d||f.isLoading||f.error)?l.jsx("div",{className:"mt-3 rounded-lg border border-emerald-100 bg-emerald-50/55 p-3 dark:border-emerald-200/15 dark:bg-emerald-300/[0.06]",children:d?l.jsxs(l.Fragment,{children:[l.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-2",children:[l.jsxs("span",{className:"text-xs font-semibold text-[#875A41] dark:text-white/65",children:["链接楼层 · ",d.title," #",d.floor," · ",d.author]}),l.jsx(ae,{to:d.path,className:"rounded-sm text-sm font-semibold text-teal-700 outline-none hover:text-teal-900 hover:underline focus-visible:ring-2 focus-visible:ring-teal-700 dark:text-white",children:"跳转到链接楼层 >>"})]}),l.jsx("p",{className:"mt-2 line-clamp-2 text-sm leading-[var(--capubbs-thread-card-line-height)] text-zinc-600 dark:text-zinc-300",children:d.excerpt})]}):l.jsxs(l.Fragment,{children:[l.jsx("span",{className:"text-xs font-semibold text-[#875A41] dark:text-white/65",children:"链接楼层"}),l.jsx("p",{className:"mt-2 text-sm leading-[var(--capubbs-thread-card-line-height)] text-zinc-600 dark:text-zinc-300",children:f.isLoading?"读取链接楼层中...":"这个链接指向的楼层暂时无法预览。"})]})}):null]})}function se(t,e){const r=L(e);return r<=0?null:t.find(n=>n.index===r)??null}function L(t){return typeof t!="number"||!Number.isFinite(t)?0:I.includes(t)?t:0}function ce(t){return I.map(e=>{const r=ue(t,e);return{excerpt:X(r).trim(),html:J(r),index:e,isEmpty:r.trim().length===0,sourceHref:Z(r)||void 0}})}function A(){return I.map(t=>({excerpt:"",html:"",index:t,isEmpty:!0}))}function ue(t,e){const r=`sig${e}`,n=t[r];return typeof n=="string"?n:n==null?"":String(n)}function de(t){if(t.isEmpty)return`签名档 ${t.index}（空）`;const e=t.excerpt.length>18?`${t.excerpt.slice(0,18)}...`:t.excerpt;return e?`签名档 ${t.index}：${e}`:`签名档 ${t.index}`}function me(t){return t==="loading"?"读取签名档中":t==="error"?"签名档读取失败":""}function pe(t){return t instanceof DOMException&&t.name==="AbortError"}const B=12,fe=new Set(["capubbs.local","chexie.net","www.chexie.net"]),T=new Map;async function ge(t,e){const r=be(t);if(!r)throw new Error("无法识别旧签名档楼层链接");const n=await he(r,e),o=ye(r.page,r.pid),a=n.contentHtml.trim();return[`<div class="floor" id="${n.pid}" data-bid="${n.bid}" data-tid="${n.tid}" data-pid="${n.pid}" data-fid="${n.fid}">`,`<div class="textblock" id="${o}" data-fid="${n.fid}" style="line-height:160% !important">${a}</div>`,"</div>"].join("")}async function he({bid:t,pid:e,tid:r},n){const o=`${t}:${r}:${e}`,a=T.get(o);if(a)return a;const c=ee({bid:t,pid:e,tid:r},n).then(s=>{const g=s.find(h=>v(h.pid)===e)??s[0];return g?q(g):q({bid:t,tid:r,pid:e})}).catch(s=>{throw T.delete(o),s});return T.set(o,c),c}function be(t){try{const e=new URL(t.replace(/&amp;/gi,"&"),"https://capubbs.local/bbs/content/"),r=e.hostname.toLowerCase();if(!fe.has(r)||!xe(e.pathname))return null;const n=v(e.searchParams.get("bid")),o=v(e.searchParams.get("tid")),a=v(e.hash.replace(/^#(?:pid)?/i,"")),c=v(e.searchParams.get("p")??e.searchParams.get("page")),s=Math.max(1,Math.floor(c>0?c:Math.ceil(a/B)));return n<=0||o<=0||a<=0?null:{bid:n,page:s,pid:a,tid:o}}catch{return null}}function ye(t,e){const r=e-(Math.max(1,Math.floor(t))-1)*B-1;return`floor${Math.max(0,r)}`}function xe(t){return/^\/bbs\/content\/?$/i.test(t)||/^\/content\/?$/i.test(t)}const ve=5e4,Se=24,we=5e3,Ae=72,Ce=24,_=2,ke=500,w=Ye("/bbs-new/"),Ee=new Set(["http:","https:","mailto:","tel:"]),Te=["accelerometer 'none'","autoplay 'none'","camera 'none'","clipboard-read 'none'","clipboard-write 'none'","encrypted-media 'none'","fullscreen 'none'","geolocation 'none'","gyroscope 'none'","magnetometer 'none'","microphone 'none'","midi 'none'","payment 'none'","picture-in-picture 'none'","publickey-credentials-get 'none'","screen-wake-lock 'none'","serial 'none'","usb 'none'","xr-spatial-tracking 'none'"].join("; ");function st({currentAccountId:t,floor:e,isActivitySignupCanceled:r,navigationContextPath:n,onSelectedTextChange:o,onThreadLinkNavigate:a}){return l.jsx(Q,{currentAccountId:t,fallbackContent:e.content,frameIdSeed:`floor-${e.id}`,htmlContent:e.htmlContent,isActivitySignupCanceled:r,minHeight:64,navigationContextPath:n,title:`第 ${e.floor} 楼正文`,variant:"content",onSelectedTextChange:o,onThreadLinkNavigate:a})}function ct({currentAccountId:t,floor:e,navigationContextPath:r,onThreadLinkNavigate:n}){return l.jsx(Q,{currentAccountId:t,fallbackContent:e.signature??[],frameIdSeed:`signature-${e.id}`,htmlContent:e.signatureHtml,isActivitySignupCanceled:!1,minHeight:24,navigationContextPath:r,title:`第 ${e.floor} 楼签名档`,variant:"signature",onThreadLinkNavigate:n})}function Q({currentAccountId:t,fallbackContent:e,frameIdSeed:r,htmlContent:n,isActivitySignupCanceled:o,minHeight:a,navigationContextPath:c,onSelectedTextChange:s,onThreadLinkNavigate:g,title:h,variant:b}){const f=i.useRef(null),d=i.useRef(`${r}-${Math.random().toString(36).slice(2)}`),p=i.useRef({animationFrameId:null,lastMessageAt:0,pointerViewportY:0}),S=i.useRef(()=>{}),N=le(),[G,R]=i.useState(a),H=Ze()==="dark",P=i.useMemo(Ve,[]),$=i.useMemo(()=>We(c),[c]),z=je(),C=i.useMemo(()=>n?.trim()||qe(e),[e,n]),k=i.useMemo(()=>b==="content"?ie(C):te(C),[C,b]),Y=i.useMemo(()=>$e({contentHtml:k,currentAccountId:t,frameId:d.current,isActivitySignupCanceled:o,isDarkTheme:H,legacyNavigationBaseUrl:P,siteStyles:z,variant:b}),[k,t,o,H,P,z,b]),y=i.useCallback(()=>{const m=p.current;m.animationFrameId!==null&&(window.cancelAnimationFrame(m.animationFrameId),m.animationFrameId=null),m.lastMessageAt=0},[]),E=i.useCallback(()=>{const m=p.current;m.animationFrameId===null&&(m.animationFrameId=window.requestAnimationFrame(()=>{S.current()}))},[]);S.current=()=>{const m=p.current,u=f.current;if(m.animationFrameId=null,!u||Date.now()-m.lastMessageAt>ke){y();return}const x=Me(u,m.pointerViewportY);x&&Ne(x.target,x.deltaY)&&Re(x.target,x.deltaY),E()};const V=i.useCallback(()=>{y(),Fe(f.current)},[y]),O=i.useCallback(m=>{const u=f.current;u&&(p.current.pointerViewportY=u.getBoundingClientRect().top+m.pointerClientY,p.current.lastMessageAt=Date.now(),E())},[E]);return i.useEffect(()=>()=>y(),[y]),i.useEffect(()=>{y(),R(a),s?.(null)},[k,r,a,s,y]),i.useEffect(()=>{const m=u=>{if(!(u.source!==f.current?.contentWindow||!Pe(u.data))&&u.data.frameId===d.current){if(u.data.type==="resize"){R(Math.min(ve,Math.max(Se,Math.ceil(u.data.height))));return}if(u.data.type==="legacy-signature-floor-request"){He(f.current,u.data);return}if(u.data.type==="navigate"){De(u.data.url,N,$,g);return}if(u.data.type==="selection-auto-scroll"){O(u.data);return}if(u.data.type==="selection-auto-scroll-stop"){y();return}s?.(Ke(u.data.text))}};return window.addEventListener("message",m),()=>window.removeEventListener("message",m)},[O,N,$,s,g,y]),l.jsx("iframe",{ref:f,allow:Te,allowTransparency:!0,className:"capubbs-html-preview-frame block w-full border-0 bg-transparent",credentialless:"",onLoad:V,referrerPolicy:"no-referrer",sandbox:"allow-scripts",srcDoc:Y,style:{background:"transparent",backgroundColor:"transparent",colorScheme:"normal",height:G,maxWidth:"100%",minWidth:0},title:h})}function Fe(t){if(t){t.style.setProperty("background","transparent","important"),t.style.setProperty("background-color","transparent","important"),t.style.setProperty("color-scheme","normal");try{const e=t.contentDocument;if(!e)return;F(e.documentElement),F(e.body),F(e.querySelector(".capubbs-floor-frame-root")),e.documentElement.style.setProperty("color-scheme","normal","important")}catch{}}}function F(t){if(!t||!("style"in t))return;const e=t.style;e.setProperty("background","transparent","important"),e.setProperty("background-color","transparent","important"),e.setProperty("background-image","none","important")}function Me(t,e){if(!Number.isFinite(e)||typeof window>"u")return null;const r=Ie(t),n=Le(r);if(!n)return null;const o=Math.min(Ae,Math.max(24,(n.bottom-n.top)/3)),a=n.top+o,c=n.bottom-o;return e<a?{deltaY:-j(a-e,o),target:r}:e>c?{deltaY:j(e-c,o),target:r}:null}function Le(t){if(t){const e=t.getBoundingClientRect(),r=Math.max(0,e.top),n=Math.min(window.innerHeight,e.bottom);return n>r?{bottom:n,top:r}:null}return window.innerHeight>0?{bottom:window.innerHeight,top:0}:null}function j(t,e){const r=Math.max(0,Math.min(1,t/e));return Math.ceil(_+r*(Ce-_))}function Ie(t){let e=t.parentElement;for(;e&&e!==document.body;){const r=window.getComputedStyle(e);if(/(auto|scroll|overlay)/.test(r.overflowY)&&e.scrollHeight>e.clientHeight)return e;e=e.parentElement}return null}function Ne(t,e){if(e===0)return!1;if(t)return e<0?t.scrollTop>0:t.scrollTop+t.clientHeight<t.scrollHeight-1;const r=document.scrollingElement,n=window.scrollY||r?.scrollTop||0,o=window.innerHeight||r?.clientHeight||0,a=r?.scrollHeight||document.documentElement.scrollHeight||0;return e<0?n>0:n+o<a-1}function Re(t,e){if(t){t.scrollTop+=e;return}window.scrollBy({behavior:"auto",top:e})}async function He(t,e){const r=t?.contentWindow;if(r)try{const n=await ge(e.url);r.postMessage({frameId:e.frameId,html:n,requestId:e.requestId,source:"capubbs-parent-frame",type:"legacy-signature-floor-response"},"*")}catch{r.postMessage({frameId:e.frameId,html:"",requestId:e.requestId,source:"capubbs-parent-frame",type:"legacy-signature-floor-response"},"*")}}function Pe(t){if(!t||typeof t!="object")return!1;const e=t;return e.source!=="capubbs-floor-frame"||typeof e.frameId!="string"?!1:e.type==="resize"?typeof e.height=="number"&&Number.isFinite(e.height):e.type==="legacy-signature-floor-request"?typeof e.requestId=="string"&&typeof e.url=="string":e.type==="navigate"?typeof e.url=="string":e.type==="selection-auto-scroll"?typeof e.pointerClientY=="number"&&Number.isFinite(e.pointerClientY):e.type==="selection-auto-scroll-stop"?!0:e.type==="selection"&&typeof e.text=="string"}function $e({contentHtml:t,currentAccountId:e,frameId:r,isActivitySignupCanceled:n,isDarkTheme:o,legacyNavigationBaseUrl:a,siteStyles:c,variant:s}){const g=Ue(r,e,a),h=_e(),b=Oe(),f=o?"dark":"light",d="capubbs-activity-signup-canceled",p=["capubbs-editor-prose",s==="signature"?"text-xs leading-[var(--capubbs-thread-card-line-height)] text-zinc-500 dark:text-white/60":"text-sm leading-[var(--capubbs-thread-card-line-height)] text-zinc-700 dark:text-zinc-200 sm:text-base",s==="signature"?"sig":"",n?`${d} text-rose-700 line-through decoration-2 decoration-rose-600 dark:text-rose-200 dark:decoration-rose-200`:""].filter(Boolean).join(" "),S=n?`
  .${d},
  .${d} * {
    color: rgb(190 18 60) !important;
    text-decoration-line: line-through !important;
    text-decoration-thickness: 2px !important;
    text-decoration-color: rgb(225 29 72) !important;
  }
  .dark .${d},
  .dark .${d} * {
    color: rgb(254 205 211) !important;
    text-decoration-color: rgb(254 205 211) !important;
  }`:"";return`<!doctype html>
<html class="${f} capubbs-floor-frame-document" style="background: transparent; color-scheme: normal;">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta http-equiv="Content-Security-Policy" content="${h}">
  <style>${Xe(c)}</style>
  <style>${b}</style>
  <style>${S}</style>
  <script>${g}<\/script>
</head>
<body class="capubbs-floor-frame-body" style="background: transparent;">
  <main class="capubbs-floor-frame-root ${p}" style="background: transparent;">${ze(t)}</main>
</body>
</html>`}function ze(t){return t.replace(/<script\b([^>]*)>/gi,(e,r)=>`<script${String(r).replace(/\s+type\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,"")} type="text/capubbs-user-script">`)}function Oe(){return`
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
`}function qe(t){return t.map(e=>`<p>${Je(e)}</p>`).join("")}function _e(){return["default-src 'none'","script-src 'unsafe-inline' http: https: data: blob:","style-src 'unsafe-inline' http: https:","img-src http: https: data: blob:","media-src http: https: data: blob:","font-src http: https: data: blob:","connect-src 'none'","worker-src 'none'","frame-src 'none'","object-src 'none'","base-uri 'none'","form-action 'none'"].join("; ")}function U(){return typeof document>"u"?"":Array.from(document.styleSheets).map(t=>{try{return Array.from(t.cssRules).map(e=>e.cssText).join(`
`)}catch{const e=t.ownerNode;return e instanceof HTMLStyleElement?e.textContent??"":""}}).filter(Boolean).join(`
`)}function je(){const[t,e]=i.useState(U);return i.useEffect(()=>{if(typeof document>"u"||typeof MutationObserver>"u")return;const r=()=>{const o=U();e(a=>a===o?a:o)},n=new MutationObserver(r);return n.observe(document.head,{attributes:!0,childList:!0,characterData:!0,subtree:!0}),r(),()=>n.disconnect()},[]),t}function Ue(t,e,r){const n=typeof e=="number"&&Number.isFinite(e)?e:null;return`(function () {
  var frameId = ${M(t)};
  var currentAccountId = ${M(n)};
  var legacyNavigationBaseUrl = ${M(r)};

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
    var body = document.body;
    var root = document.documentElement;

    return Math.max(
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0,
      root ? root.scrollHeight : 0,
      root ? root.offsetHeight : 0
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
      new ResizeObserver(queueResizeMessage).observe(document.documentElement);
      if (document.body) {
        new ResizeObserver(queueResizeMessage).observe(document.body);
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
}());`}function De(t,e,r,n){const o=re(t,r,"/bbs-new/");if(o){if(n?.(o))return;e(o.path);return}const a=Be(t,r);if(a){if(a.origin===window.location.origin){e(Qe(a));return}window.location.assign(a.href)}}function Be(t,e){const r=t.trim();if(!r||typeof window>"u")return null;try{const n=new URL(r,e);return Ee.has(n.protocol)?n:null}catch{return null}}function Qe(t){return`${Ge(t.pathname)}${t.search}${t.hash}`}function Ge(t){return w?t===w?"/":t.startsWith(`${w}/`)?t.slice(w.length)||"/":t||"/":t||"/"}function Ye(t){try{const e=new URL(t||"/","https://capubbs.local").pathname,r=e.endsWith("/")?e.slice(0,-1):e;return r==="/"?"":r}catch{return""}}function Ve(){return typeof window>"u"?"https://chexie.net/bbs/content/":new URL("/bbs/content/",window.location.origin).href}function We(t){const e=typeof window>"u"?"https://chexie.net/":window.location.href;try{return new URL(t||e,e).href}catch{return e}}function Ke(t){return t.slice(0,we).replace(/\r\n?/g,`
`).split(`
`).map(r=>r.trim()).join(`
`).replace(/\n{3,}/g,`

`).trim()||null}function M(t){return(JSON.stringify(t)??"null").replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029")}function Xe(t){return t.replace(/<\/style/gi,"<\\/style")}function D(){return typeof document>"u"?"light":document.documentElement.dataset.theme==="dark"||document.documentElement.classList.contains("dark")?"dark":"light"}function Ze(){const[t,e]=i.useState(D);return i.useEffect(()=>{if(typeof document>"u"||typeof MutationObserver>"u")return;const r=()=>e(D()),n=new MutationObserver(r);return n.observe(document.documentElement,{attributeFilter:["class","data-theme"],attributes:!0}),r(),()=>n.disconnect()},[]),t}function Je(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}export{it as S,st as T,ct as a,se as g,L as n,lt as u};
