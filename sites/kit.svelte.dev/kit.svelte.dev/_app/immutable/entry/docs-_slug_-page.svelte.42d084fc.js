import{S as Ee,i as be,s as Se,k as g,q as B,a as N,l as E,m as w,r as R,h,c as P,n as f,H as F,b as U,E as r,I as ae,u as $,F as oe,T as qe,M as Te,P as we,o as ze,N as ke,y as re,U as Me,z as ce,A as fe,g as he,d as ue,B as de}from"../chunks/index.1cc2e0ff.js";import{p as Ae}from"../chunks/stores.c28f0607.js";import{a as De,I as He}from"../chunks/navigation.ad4a0c68.js";import{s as Ke}from"../chunks/hovers.010bb342.js";import{b as _e}from"../chunks/paths.8c4e863e.js";const{window:le}=ke;function pe(a,t,e){const n=a.slice();return n[11]=t[e].title,n[12]=t[e].slug,n}function me(a){let t,e,n=a[11]+"",c,s;return{c(){t=g("li"),e=g("a"),c=B(n),this.h()},l(l){t=E(l,"LI",{});var u=w(t);e=E(u,"A",{href:!0,class:!0});var i=w(e);c=R(i,n),i.forEach(h),u.forEach(h),this.h()},h(){f(e,"href",s=`#${a[12]}`),f(e,"class","svelte-tsiaal"),F(e,"active",`#${a[12]}`===a[1])},m(l,u){U(l,t,u),r(t,e),r(e,c)},p(l,u){u&1&&n!==(n=l[11]+"")&&$(c,n),u&1&&s!==(s=`#${l[12]}`)&&f(e,"href",s),u&3&&F(e,"active",`#${l[12]}`===l[1])},d(l){l&&h(t)}}}function Ce(a){let t,e,n,c,s,l,u,i,m=a[0].title+"",z,k,L,q,v,T=a[0].sections,d=[];for(let _=0;_<T.length;_+=1)d[_]=me(pe(a,T,_));return{c(){t=g("aside"),e=g("h2"),n=B("On this page"),c=N(),s=g("nav"),l=g("ul"),u=g("li"),i=g("a"),z=B(m),L=N();for(let _=0;_<d.length;_+=1)d[_].c();this.h()},l(_){t=E(_,"ASIDE",{class:!0});var S=w(t);e=E(S,"H2",{class:!0});var p=w(e);n=R(p,"On this page"),p.forEach(h),c=P(S),s=E(S,"NAV",{});var O=w(s);l=E(O,"UL",{class:!0});var M=w(l);u=E(M,"LI",{});var D=w(u);i=E(D,"A",{href:!0,class:!0});var K=w(i);z=R(K,m),K.forEach(h),D.forEach(h),L=P(M);for(let G=0;G<d.length;G+=1)d[G].l(M);M.forEach(h),O.forEach(h),S.forEach(h),this.h()},h(){f(e,"class","svelte-tsiaal"),f(i,"href",k=_e+"/docs/"+a[0].slug),f(i,"class","svelte-tsiaal"),F(i,"active",a[1]===""),f(l,"class","svelte-tsiaal"),f(t,"class","on-this-page svelte-tsiaal")},m(_,S){U(_,t,S),r(t,e),r(e,n),r(t,c),r(t,s),r(s,l),r(l,u),r(u,i),r(i,z),r(l,L);for(let p=0;p<d.length;p+=1)d[p]&&d[p].m(l,null);q||(v=[ae(le,"scroll",a[4]),ae(le,"resize",a[3]),ae(le,"hashchange",a[6])],q=!0)},p(_,[S]){if(S&1&&m!==(m=_[0].title+"")&&$(z,m),S&1&&k!==(k=_e+"/docs/"+_[0].slug)&&f(i,"href",k),S&2&&F(i,"active",_[1]===""),S&3){T=_[0].sections;let p;for(p=0;p<T.length;p+=1){const O=pe(_,T,p);d[p]?d[p].p(O,S):(d[p]=me(O),d[p].c(),d[p].m(l,null))}for(;p<d.length;p+=1)d[p].d(1);d.length=T.length}},i:oe,o:oe,d(_){_&&h(t),qe(d,_),q=!1,Te(v)}}}function Le(a,t,e){let n;we(a,Ae,v=>e(2,n=v));let{details:c}=t,s="",l=0,u,i,m=[];ze(async()=>{await document.fonts.ready,z(),k()}),De(()=>{z(),k()});function z(){u=document.querySelector(".content");const{top:v}=u.getBoundingClientRect();i=u.querySelectorAll("h2[id]"),m=Array.from(i).map(T=>{const d=getComputedStyle(T);return T.getBoundingClientRect().top-parseFloat(d.scrollMarginTop)-v}),l=window.innerHeight}function k(){const{top:v,bottom:T}=u.getBoundingClientRect();let d=i.length;for(;d--;)if(T-l<50||m[d]+v<100){const _=i[d];e(1,s=`#${_.id}`);return}e(1,s="")}function L(v){setTimeout(()=>{e(1,s=v.hash)}),window.addEventListener("scroll",()=>{e(1,s=v.hash)},{once:!0})}const q=()=>L(n.url);return a.$$set=v=>{"details"in v&&e(0,c=v.details)},[c,s,n,z,k,L,q]}class Ne extends Ee{constructor(t){super(),be(this,t,Le,Ce,Se,{details:0})}}function ve(a){let t,e=a[2].title+"",n,c;return{c(){t=g("a"),n=B(e),this.h()},l(s){t=E(s,"A",{href:!0});var l=w(t);n=R(l,e),l.forEach(h),this.h()},h(){f(t,"href",c=a[2].path)},m(s,l){U(s,t,l),r(t,n)},p(s,l){l&4&&e!==(e=s[2].title+"")&&$(n,e),l&4&&c!==(c=s[2].path)&&f(t,"href",c)},d(s){s&&h(t)}}}function ge(a){let t,e=a[1].title+"",n,c;return{c(){t=g("a"),n=B(e),this.h()},l(s){t=E(s,"A",{href:!0});var l=w(t);n=R(l,e),l.forEach(h),this.h()},h(){f(t,"href",c=a[1].path)},m(s,l){U(s,t,l),r(t,n)},p(s,l){l&2&&e!==(e=s[1].title+"")&&$(n,e),l&2&&c!==(c=s[1].path)&&f(t,"href",c)},d(s){s&&h(t)}}}function Pe(a){let t,e,n,c,s,l,u,i,m,z=a[0].page.title+"",k,L,q,v,T,d,_,S,p=a[0].page.content+"",O,M,D,K,G,Y,Z,V,j,x,ee,J,y,H;document.title=t=a[0].page.title+" • Docs • SvelteKit",v=new He({props:{size:50,name:"edit"}});let A=a[2]&&ve(a),I=a[1]&&ge(a);return y=new Ne({props:{details:a[0].page}}),{c(){e=g("meta"),n=g("meta"),s=g("meta"),u=N(),i=g("div"),m=g("h1"),k=B(z),L=N(),q=g("a"),re(v.$$.fragment),T=B(" Edit this page on GitHub"),_=N(),S=g("section"),O=N(),M=g("div"),D=g("div"),K=g("span"),G=B("previous"),Y=N(),A&&A.c(),Z=N(),V=g("div"),j=g("span"),x=B("next"),ee=N(),I&&I.c(),J=N(),re(y.$$.fragment),this.h()},l(o){const b=Me("svelte-18gm73m",document.head);e=E(b,"META",{name:!0,content:!0}),n=E(b,"META",{name:!0,content:!0}),s=E(b,"META",{name:!0,content:!0}),b.forEach(h),u=P(o),i=E(o,"DIV",{class:!0});var C=w(i);m=E(C,"H1",{});var se=w(m);k=R(se,z),se.forEach(h),L=P(C),q=E(C,"A",{class:!0,href:!0});var te=w(q);ce(v.$$.fragment,te),T=R(te," Edit this page on GitHub"),te.forEach(h),_=P(C),S=E(C,"SECTION",{});var Ie=w(S);Ie.forEach(h),O=P(C),M=E(C,"DIV",{class:!0});var Q=w(M);D=E(Q,"DIV",{class:!0});var W=w(D);K=E(W,"SPAN",{class:!0});var ne=w(K);G=R(ne,"previous"),ne.forEach(h),Y=P(W),A&&A.l(W),W.forEach(h),Z=P(Q),V=E(Q,"DIV",{class:!0});var X=w(V);j=E(X,"SPAN",{class:!0});var ie=w(j);x=R(ie,"next"),ie.forEach(h),ee=P(X),I&&I.l(X),X.forEach(h),Q.forEach(h),C.forEach(h),J=P(o),ce(y.$$.fragment,o),this.h()},h(){f(e,"name","twitter:title"),f(e,"content","SvelteKit docs"),f(n,"name","twitter:description"),f(n,"content",c=a[0].page.title+" • SvelteKit documentation"),f(s,"name","Description"),f(s,"content",l=a[0].page.title+" • SvelteKit documentation"),f(q,"class","edit svelte-zelrq3"),f(q,"href",d="https://github.com/sveltejs/kit/edit/master/documentation/"+a[0].page.file),f(K,"class","svelte-zelrq3"),F(K,"faded",!a[2]),f(D,"class","svelte-zelrq3"),f(j,"class","svelte-zelrq3"),F(j,"faded",!a[1]),f(V,"class","svelte-zelrq3"),f(M,"class","controls svelte-zelrq3"),f(i,"class","text content svelte-zelrq3")},m(o,b){r(document.head,e),r(document.head,n),r(document.head,s),U(o,u,b),U(o,i,b),r(i,m),r(m,k),r(i,L),r(i,q),fe(v,q,null),r(q,T),r(i,_),r(i,S),S.innerHTML=p,r(i,O),r(i,M),r(M,D),r(D,K),r(K,G),r(D,Y),A&&A.m(D,null),r(M,Z),r(M,V),r(V,j),r(j,x),r(V,ee),I&&I.m(V,null),U(o,J,b),fe(y,o,b),H=!0},p(o,[b]){(!H||b&1)&&t!==(t=o[0].page.title+" • Docs • SvelteKit")&&(document.title=t),(!H||b&1&&c!==(c=o[0].page.title+" • SvelteKit documentation"))&&f(n,"content",c),(!H||b&1&&l!==(l=o[0].page.title+" • SvelteKit documentation"))&&f(s,"content",l),(!H||b&1)&&z!==(z=o[0].page.title+"")&&$(k,z),(!H||b&1&&d!==(d="https://github.com/sveltejs/kit/edit/master/documentation/"+o[0].page.file))&&f(q,"href",d),(!H||b&1)&&p!==(p=o[0].page.content+"")&&(S.innerHTML=p),(!H||b&4)&&F(K,"faded",!o[2]),o[2]?A?A.p(o,b):(A=ve(o),A.c(),A.m(D,null)):A&&(A.d(1),A=null),(!H||b&2)&&F(j,"faded",!o[1]),o[1]?I?I.p(o,b):(I=ge(o),I.c(),I.m(V,null)):I&&(I.d(1),I=null);const C={};b&1&&(C.details=o[0].page),y.$set(C)},i(o){H||(he(v.$$.fragment,o),he(y.$$.fragment,o),H=!0)},o(o){ue(v.$$.fragment,o),ue(y.$$.fragment,o),H=!1},d(o){h(e),h(n),h(s),o&&h(u),o&&h(i),de(v),A&&A.d(),I&&I.d(),o&&h(J),de(y,o)}}}function Oe(a,t,e){let n,c,s,l,u;we(a,Ae,m=>e(5,u=m));let{data:i}=t;return Ke(),a.$$set=m=>{"data"in m&&e(0,i=m.data)},a.$$.update=()=>{a.$$.dirty&1&&e(4,n=i.sections.flatMap(m=>m.pages)),a.$$.dirty&48&&e(3,c=n.findIndex(({path:m})=>m===u.url.pathname)),a.$$.dirty&24&&e(2,s=n[c-1]),a.$$.dirty&24&&e(1,l=n[c+1])},[i,l,s,c,n,u]}class Fe extends Ee{constructor(t){super(),be(this,t,Oe,Pe,Se,{data:0})}}export{Fe as default};
