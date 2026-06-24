(()=>{var u=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"],f=["EARLY","LATE","DECADE","DAY","MONTH","YEAR"],c=(t,e)=>{let a=f.indexOf(t.span);if(a<0){t.span=e;return}f.indexOf(e)<a&&(t.span=e)},g=t=>{let e=t.match(/^(\d{4})-(\d{2})-(\d{2})$/);return e?new Date(+e[1],+e[2]-1,+e[3]):null},$=t=>{let e={},a=(t||"").match(/\S+/g)||[],o=[],s=0;for(;s<a.length;){let r=a[s],i=r.match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/);if(i){e.start=g(i[1]),e.end=g(i[2]),e.iso=!0,c(e,"DAY"),s++;continue}if(r.match(/^\d{4}-\d{2}-\d{2}$/)){e.start=g(r),e.iso=!0,c(e,"DAY"),s++;continue}if(r.match(/^\d{4}$/)){e.year=+r,c(e,"YEAR"),s++;continue}let l=r.match(/^(\d0)S$/);if(l){e.year=+l[1]+1900,c(e,"DECADE"),s++;continue}if(f.includes(r)){e.span=r,s++;continue}let d=u.indexOf(r.slice(0,3).toUpperCase());if(d>=0){e.month=d+1,c(e,"MONTH"),s++;continue}let h=r.match(/^([1-3]?[0-9])$/);if(h){e.day=+h[1],c(e,"DAY"),s++;continue}if(r.startsWith("#")){e.group=r.slice(1),s++;continue}o.push(...a.slice(s));break}let n=[];for(let r of o)r.startsWith("#")&&!e.group?e.group=r.slice(1):n.push(r);return n.length&&(e.label=n.join(" ")),e},y=(t,e)=>{let a=new Date,o={},s=[];for(let n of t){let r,i,l;n.iso&&n.start?(r=n.start,i=n.end||n.start,l=n.span||"DAY"):(o[n.label]?.date&&(a=o[n.label].date),n.year&&(a=new Date(n.year,0)),n.month&&(a=new Date(a.getFullYear(),n.month-1)),n.day&&(a=new Date(a.getFullYear(),a.getMonth(),n.day)),r=a,i=a,l=n.span||"DAY");let d=n.label||e||"";d&&(o[d]={date:r}),s.push({label:d,start:r,end:i,span:l,group:n.group||null})}return s},b={DAY:864e5,MONTH:26298e5,YEAR:315576e5,DECADE:315576e6,EARLY:315576e6,LATE:315576e6},A={DAY:"day",MONTH:"month",YEAR:"year",DECADE:"decade",EARLY:"decade",LATE:"decade"},T=(t,e)=>{let a=b[e]??b.DAY;return{units:[A[e]??A.DAY],value:Math.floor(t.getTime()/a),precision:a}};var H=["TYPOGRAPHIC","PLAIN","COMPACT","TABLE"],Y=t=>{let e="TYPOGRAPHIC",a=[];for(let o of(t||"").split(`
`)){let s=o.trim().match(/^STYLE\s+(\S+)$/i);if(s){e=s[1].toUpperCase();continue}a.push(o)}return{style:e,lines:a}},D=t=>String(t).padStart(2,"0"),p=t=>`${D(t.getDate())} ${u[t.getMonth()]} ${t.getFullYear()}`;var w=t=>t.start.getTime()!==t.end.getTime(),M=(t,e)=>e==="YEAR"?`<div class="date-year">${t.getFullYear()}</div>`:e==="DECADE"?`<div class="date-year">${t.getFullYear()}'s</div>`:e==="MONTH"?`<div class="date-month-name">${u[t.getMonth()]}</div><div class="date-year">${t.getFullYear()}</div>`:`<div class="date-day">${D(t.getDate())}</div><div class="date-month-name">${u[t.getMonth()]}</div><div class="date-year">${t.getFullYear()}</div>`,S=(t,e)=>`<div class="date-range"><span class="date-range-start">${p(t)}</span><span class="date-range-sep">\u2013</span><span class="date-range-end">${p(e)}</span></div>`,C=t=>t.group?`<div class="date-group date-group-${t.group.toLowerCase().replace(/\s+/g,"-")}">${t.group}</div>`:"",x=t=>`<div class="date-event">${w(t)?S(t.start,t.end):M(t.start,t.span)}${C(t)}</div>`,m=t=>w(t)?`${p(t.start)} \u2013 ${p(t.end)}`:t.span==="YEAR"?String(t.start.getFullYear()):t.span==="DECADE"?`${t.start.getFullYear()}'s`:t.span==="MONTH"?`${u[t.start.getMonth()]} ${t.start.getFullYear()}`:p(t.start),L=t=>{let e=m(t),a=t.label?` \u2014 ${t.label}`:"",o=t.group?` <span class="date-plain-group">#${t.group}</span>`:"";return`<div class="date-plain-row"><span class="date-plain-date">${e}</span>${a}${o}</div>`},O=t=>{let e=m(t),a=t.label?` ${t.label}`:"",o=t.group?` <span class="date-compact-group">#${t.group}</span>`:"";return`<span class="date-compact-pill">${e}${a}${o}</span>`},P=t=>`<table class="date-table"><thead><tr><th>Date</th><th>Event</th><th>Group</th></tr></thead><tbody>${t.map(a=>{let o=m(a),s=a.label||"",n=a.group||"";return`<tr><td class="date-td-date">${o}</td><td class="date-td-label">${s}</td><td class="date-td-group">${n?`<span class="date-group">${n}</span>`:""}</td></tr>`}).join("")}</tbody></table>`,R=(t,e)=>{if(!t.length)return"<em>no date</em>";switch(e){case"PLAIN":return t.map(L).join("");case"COMPACT":return t.map(O).join("");case"TABLE":return P(t);default:return t.map(x).join("")}},F=`
<style>
.wiki-plugin-date {
  font-family: Georgia, serif;
  padding: .6em .8em;
  background: #f9f9f9;
  border-left: 3px solid #aaa;
  margin-bottom: 6px;
  line-height: 1.1;
}
/* TYPOGRAPHIC */
.date-event { display: inline-block; margin-right: 1em; vertical-align: top; }
.date-day   { font-size: 2.4em; font-weight: bold; color: #222; line-height: 1; }
.date-month-name { font-size: .85em; text-transform: uppercase; letter-spacing: .08em; color: #555; }
.date-year  { font-size: .8em; color: #888; }
.date-range { font-size: .9em; color: #444; }
.date-range-sep { margin: 0 .35em; color: #aaa; }
.date-group {
  display: inline-block; margin-top: .3em;
  padding: .1em .45em; border-radius: 3px;
  font-size: .72em; font-family: sans-serif;
  background: #dde; color: #334; letter-spacing: .04em;
}
/* PLAIN */
.date-plain-row { font-family: sans-serif; font-size: .9em; color: #333; padding: .15em 0; }
.date-plain-date { font-weight: 600; margin-right: .2em; }
.date-plain-group { color: #779; font-size: .85em; }
/* COMPACT */
.date-compact-pill {
  display: inline-block; margin: .15em .3em .15em 0;
  padding: .15em .5em; border-radius: 12px;
  background: #eef; border: 1px solid #ccd;
  font-family: sans-serif; font-size: .82em; color: #334;
}
.date-compact-group { color: #779; }
/* TABLE */
.date-table { border-collapse: collapse; font-family: sans-serif; font-size: .88em; width: 100%; }
.date-table th { text-align: left; color: #999; font-weight: 500; border-bottom: 1px solid #ddd; padding: .2em .4em; font-size: .85em; }
.date-table td { padding: .25em .4em; border-bottom: 1px solid #eee; color: #333; }
.date-td-date { white-space: nowrap; color: #555; }
</style>`,E=!1,N=()=>{E||(document.head.insertAdjacentHTML("beforeend",F),E=!0)},k=(t,e)=>{N();let{style:a,lines:o}=Y(e.text||""),s=o.filter(i=>i.trim()).map($),n=(()=>{try{return t.closest(".page").find("h1").text().trim()}catch{return""}})(),r=y(s,n);t.html(`<div class="wiki-plugin-date">${R(r,a)}</div>`)},I=(t,e)=>{let{lines:a}=Y(e.text||""),o=a.filter(l=>l.trim()).map($),s=(()=>{try{return t.closest(".page").find("h1").text().trim()}catch{return""}})(),n=(()=>{try{return window.location.hostname}catch{return""}})(),r=y(o,s);t.addClass("calendar-source"),t.get(0).calendarData=()=>r.map(l=>({label:l.label,start:l.start,end:l.end,span:l.span,group:l.group,page:s,site:n})),t.addClass("radar-source");let i={};for(let l of r)l.label&&(i[l.label]=T(l.start,l.span));t.get(0).radarData=()=>i,t.on("dblclick",()=>wiki.textEditor(t,e))};typeof window<"u"&&window!==null&&(window.plugins=window.plugins||{},window.plugins.date={emit:k,bind:I});})();
//# sourceMappingURL=date.js.map
