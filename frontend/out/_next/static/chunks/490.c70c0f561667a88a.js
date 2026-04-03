"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[490],{8030:function(e,t,r){r.d(t,{Z:function(){return o}});var a=r(2265);/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let n=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),l=function(){for(var e=arguments.length,t=Array(e),r=0;r<e;r++)t[r]=arguments[r];return t.filter((e,t,r)=>!!e&&r.indexOf(e)===t).join(" ")};/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var s={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let i=(0,a.forwardRef)((e,t)=>{let{color:r="currentColor",size:n=24,strokeWidth:i=2,absoluteStrokeWidth:o,className:c="",children:d,iconNode:u,...f}=e;return(0,a.createElement)("svg",{ref:t,...s,width:n,height:n,stroke:r,strokeWidth:o?24*Number(i)/Number(n):i,className:l("lucide",c),...f},[...u.map(e=>{let[t,r]=e;return(0,a.createElement)(t,r)}),...Array.isArray(d)?d:[d]])}),o=(e,t)=>{let r=(0,a.forwardRef)((r,s)=>{let{className:o,...c}=r;return(0,a.createElement)(i,{ref:s,iconNode:t,className:l("lucide-".concat(n(e)),o),...c})});return r.displayName="".concat(e),r}},7164:function(e,t,r){r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(8030).Z)("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]])},2023:function(e,t,r){r.d(t,{Z:function(){return a}});/**
 * @license lucide-react v0.400.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let a=(0,r(8030).Z)("FileText",[["path",{d:"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",key:"1rqfz7"}],["path",{d:"M14 2v4a2 2 0 0 0 2 2h4",key:"tnqrlb"}],["path",{d:"M10 9H8",key:"b1mrlr"}],["path",{d:"M16 13H8",key:"t4e002"}],["path",{d:"M16 17H8",key:"z1uh3a"}]])},1490:function(e,t,r){r.r(t),r.d(t,{default:function(){return i}});var a=r(7437),n=r(2265),l=r(2023),s=r(7164);function i(e){let{url:t,title:i}=e,[o,c]=(0,n.useState)(""),[d,u]=(0,n.useState)(!0),[f,h]=(0,n.useState)("");return(0,n.useEffect)(()=>{(async()=>{try{let e=await Promise.all([r.e(251),r.e(83)]).then(r.t.bind(r,1083,19)),a=await fetch(t),n=await a.arrayBuffer(),l=await e.convertToHtml({arrayBuffer:n});c(l.value)}catch(e){h("Ma setax jiftaħ id-dokument.")}finally{u(!1)}})()},[t]),(0,a.jsxs)("div",{className:"flex flex-col bg-[#0f0f1a] rounded-2xl border border-white/10 overflow-hidden",children:[(0,a.jsxs)("div",{className:"flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5",children:[(0,a.jsxs)("span",{className:"flex items-center gap-2 text-sm font-medium text-white/80",children:[(0,a.jsx)(l.Z,{size:15,className:"text-[#c9a84c]"}),i||"Dokument"]}),(0,a.jsxs)("a",{href:t,download:!0,target:"_blank",rel:"noopener noreferrer",className:"flex items-center gap-1.5 px-3 py-1.5 bg-[#c9a84c] hover:bg-[#b8963a] text-black text-xs font-semibold rounded-lg transition-colors",children:[(0,a.jsx)(s.Z,{size:13})," Niżżel DOCX"]})]}),(0,a.jsxs)("div",{className:"p-6 overflow-auto max-h-[70vh] bg-white text-gray-900",children:[d&&(0,a.jsx)("p",{className:"text-gray-400 text-sm",children:"Qed jgħabbi..."}),f&&(0,a.jsx)("p",{className:"text-red-400 text-sm",children:f}),o&&(0,a.jsx)("div",{className:"prose max-w-none text-sm leading-relaxed",dangerouslySetInnerHTML:{__html:o}})]})]})}}}]);