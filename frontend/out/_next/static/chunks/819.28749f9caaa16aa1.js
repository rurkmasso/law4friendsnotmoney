"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[819],{8030:function(e,t,r){r.d(t,{Z:function(){return o}});var n=r(2265);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let s=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),a=function(){for(var e=arguments.length,t=Array(e),r=0;r<e;r++)t[r]=arguments[r];return t.filter((e,t,r)=>!!e&&r.indexOf(e)===t).join(" ")};/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var i={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let l=(0,n.forwardRef)((e,t)=>{let{color:r="currentColor",size:s=24,strokeWidth:l=2,absoluteStrokeWidth:o,className:c="",children:d,iconNode:u,...h}=e;return(0,n.createElement)("svg",{ref:t,...i,width:s,height:s,stroke:r,strokeWidth:o?24*Number(l)/Number(s):l,className:a("lucide",c),...h},[...u.map(e=>{let[t,r]=e;return(0,n.createElement)(t,r)}),...Array.isArray(d)?d:[d]])}),o=(e,t)=>{let r=(0,n.forwardRef)((r,i)=>{let{className:o,...c}=r;return(0,n.createElement)(l,{ref:i,iconNode:t,className:a("lucide-".concat(s(e)),o),...c})});return r.displayName="".concat(e),r}},518:function(e,t,r){r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(8030).Z)("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]])},7592:function(e,t,r){r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(8030).Z)("ChevronRight",[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]])},7164:function(e,t,r){r.d(t,{Z:function(){return n}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=(0,r(8030).Z)("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]])},3819:function(e,t,r){r.r(t),r.d(t,{default:function(){return u}});var n=r(7437),s=r(2265),a=r(8030);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let i=(0,a.Z)("ZoomOut",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65",key:"13gj7c"}],["line",{x1:"8",x2:"14",y1:"11",y2:"11",key:"durymu"}]]),l=(0,a.Z)("ZoomIn",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["line",{x1:"21",x2:"16.65",y1:"21",y2:"16.65",key:"13gj7c"}],["line",{x1:"11",x2:"11",y1:"8",y2:"14",key:"1vmskp"}],["line",{x1:"8",x2:"14",y1:"11",y2:"11",key:"durymu"}]]);var o=r(518),c=r(7592),d=r(7164);function u(e){let{url:t,title:a}=e,u=(0,s.useRef)(null),[h,x]=(0,s.useState)(null),[m,f]=(0,s.useState)(1),[w,y]=(0,s.useState)(0),[g,p]=(0,s.useState)(1.3),[j,b]=(0,s.useState)(!0);return(0,s.useEffect)(()=>{let e=!1;return(async()=>{let n=await Promise.all([r.e(980),r.e(251)]).then(r.bind(r,971));n.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/".concat(n.version,"/pdf.worker.min.js");let s=await n.getDocument(t).promise;e||(x(s),y(s.numPages),b(!1))})().catch(console.error),()=>{e=!0}},[t]),(0,s.useEffect)(()=>{h&&u.current&&(async()=>{let e=await h.getPage(m),t=e.getViewport({scale:g}),r=u.current;r.height=t.height,r.width=t.width,await e.render({canvasContext:r.getContext("2d"),viewport:t}).promise})().catch(console.error)},[h,m,g]),(0,n.jsxs)("div",{className:"flex flex-col bg-[#0f0f1a] rounded-2xl border border-white/10 overflow-hidden",children:[(0,n.jsxs)("div",{className:"flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5",children:[(0,n.jsx)("span",{className:"text-sm font-medium truncate max-w-xs text-white/80",children:a||"Dokument"}),(0,n.jsxs)("div",{className:"flex items-center gap-2",children:[(0,n.jsx)("button",{onClick:()=>p(e=>Math.max(.5,e-.2)),className:"p-1.5 hover:bg-white/10 rounded-lg transition-colors",children:(0,n.jsx)(i,{size:15})}),(0,n.jsxs)("span",{className:"text-xs text-white/40 w-10 text-center",children:[Math.round(100*g),"%"]}),(0,n.jsx)("button",{onClick:()=>p(e=>Math.min(3,e+.2)),className:"p-1.5 hover:bg-white/10 rounded-lg transition-colors",children:(0,n.jsx)(l,{size:15})}),(0,n.jsx)("div",{className:"w-px h-4 bg-white/10 mx-1"}),(0,n.jsx)("button",{onClick:()=>f(e=>Math.max(1,e-1)),disabled:m<=1,className:"p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30",children:(0,n.jsx)(o.Z,{size:15})}),(0,n.jsxs)("span",{className:"text-xs text-white/40",children:[m," / ",w]}),(0,n.jsx)("button",{onClick:()=>f(e=>Math.min(w,e+1)),disabled:m>=w,className:"p-1.5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30",children:(0,n.jsx)(c.Z,{size:15})}),(0,n.jsx)("div",{className:"w-px h-4 bg-white/10 mx-1"}),(0,n.jsx)("a",{href:t,download:!0,target:"_blank",rel:"noopener noreferrer",className:"p-1.5 hover:bg-white/10 rounded-lg transition-colors",children:(0,n.jsx)(d.Z,{size:15})})]})]}),(0,n.jsx)("div",{className:"overflow-auto p-4 flex justify-center bg-[#1a1a2e] min-h-96",children:j?(0,n.jsx)("div",{className:"flex items-center justify-center w-full",children:(0,n.jsx)("p",{className:"text-white/30 text-sm",children:"Qed jgħabbi l-PDF..."})}):(0,n.jsx)("canvas",{ref:u,className:"shadow-2xl rounded"})})]})}}}]);