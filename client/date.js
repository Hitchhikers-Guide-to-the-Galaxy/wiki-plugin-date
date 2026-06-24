(()=>{var u=["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"],p=["EARLY","LATE","DECADE","DAY","MONTH","YEAR"],d=(e,t)=>{let a=p.indexOf(e.span);if(a<0){e.span=t;return}p.indexOf(t)<a&&(e.span=t)},g=e=>{let t=e.match(/^(\d{4})-(\d{2})-(\d{2})$/);return t?new Date(+t[1],+t[2]-1,+t[3]):null},E=e=>{let t={},a=(e||"").match(/\S+/g)||[],i=[],s=0;for(;s<a.length;){let r=a[s],l=r.match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/);if(l){t.start=g(l[1]),t.end=g(l[2]),t.iso=!0,d(t,"DAY"),s++;continue}if(r.match(/^\d{4}-\d{2}-\d{2}$/)){t.start=g(r),t.iso=!0,d(t,"DAY"),s++;continue}if(r.match(/^\d{4}$/)){t.year=+r,d(t,"YEAR"),s++;continue}let c=r.match(/^(\d0)S$/);if(c){t.year=+c[1]+1900,d(t,"DECADE"),s++;continue}if(p.includes(r)){t.span=r,s++;continue}let o=u.indexOf(r.slice(0,3).toUpperCase());if(o>=0){t.month=o+1,d(t,"MONTH"),s++;continue}let f=r.match(/^([1-3]?[0-9])$/);if(f){t.day=+f[1],d(t,"DAY"),s++;continue}if(r.startsWith("#")){t.group=r.slice(1),s++;continue}i.push(...a.slice(s));break}let n=[];for(let r of i)r.startsWith("#")&&!t.group?t.group=r.slice(1):n.push(r);return n.length&&(t.label=n.join(" ")),t},Y=(e,t)=>{let a=new Date,i={},s=[];for(let n of e){let r,l,c;n.iso&&n.start?(r=n.start,l=n.end||n.start,c=n.span||"DAY"):(i[n.label]?.date&&(a=i[n.label].date),n.year&&(a=new Date(n.year,0)),n.month&&(a=new Date(a.getFullYear(),n.month-1)),n.day&&(a=new Date(a.getFullYear(),a.getMonth(),n.day)),r=a,l=a,c=n.span||"DAY");let o=n.label||t||"";o&&(i[o]={date:r}),s.push({label:o,start:r,end:l,span:c,group:n.group||null})}return s},m={DAY:864e5,MONTH:26298e5,YEAR:315576e5,DECADE:315576e6,EARLY:315576e6,LATE:315576e6},h={DAY:"day",MONTH:"month",YEAR:"year",DECADE:"decade",EARLY:"decade",LATE:"decade"},y=(e,t)=>{let a=m[t]??m.DAY;return{units:[h[t]??h.DAY],value:Math.floor(e.getTime()/a),precision:a}};var D=e=>String(e).padStart(2,"0"),w=(e,t)=>t==="YEAR"?`<div class="date-year">${e.getFullYear()}</div>`:t==="DECADE"?`<div class="date-year">${e.getFullYear()}'s</div>`:t==="MONTH"?`<div class="date-month-name">${u[e.getMonth()]}</div><div class="date-year">${e.getFullYear()}</div>`:`<div class="date-day">${D(e.getDate())}</div><div class="date-month-name">${u[e.getMonth()]}</div><div class="date-year">${e.getFullYear()}</div>`,b=(e,t,a)=>{let i=s=>`${D(s.getDate())} ${u[s.getMonth()]} ${s.getFullYear()}`;return`<div class="date-range"><span class="date-range-start">${i(e)}</span><span class="date-range-sep">\u2013</span><span class="date-range-end">${i(t)}</span></div>`},$=e=>e.start.getTime()!==e.end.getTime(),M=e=>{let t=$(e)?b(e.start,e.end,e.span):w(e.start,e.span),a=e.group?`<div class="date-group date-group-${e.group.toLowerCase().replace(/\s+/g,"-")}">${e.group}</div>`:"";return`<div class="date-event">${t}${a}</div>`},x=`
<style>
.wiki-plugin-date {
  font-family: Georgia, serif;
  padding: .6em .8em;
  background: #f9f9f9;
  border-left: 3px solid #aaa;
  margin-bottom: 6px;
  line-height: 1.1;
}
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
</style>`,A=!1,v=()=>{A||(document.head.insertAdjacentHTML("beforeend",x),A=!0)},S=(e,t)=>{v();let s=(t.text||"").split(/\n/).filter(c=>c.trim()).map(E),n=(()=>{try{return e.closest(".page").find("h1").text().trim()}catch{return""}})(),l=Y(s,n).map(M).join("");e.html(`<div class="wiki-plugin-date">${l||"<em>no date</em>"}</div>`)},T=(e,t)=>{let s=(t.text||"").split(/\n/).filter(o=>o.trim()).map(E),n=(()=>{try{return e.closest(".page").find("h1").text().trim()}catch{return""}})(),r=(()=>{try{return window.location.hostname}catch{return""}})(),l=Y(s,n);e.addClass("calendar-source"),e.get(0).calendarData=()=>l.map(o=>({label:o.label,start:o.start,end:o.end,span:o.span,group:o.group,page:n,site:r})),e.addClass("radar-source");let c={};for(let o of l)o.label&&(c[o.label]=y(o.start,o.span));e.get(0).radarData=()=>c,e.on("dblclick",()=>wiki.textEditor(e,t))};typeof window<"u"&&window!==null&&(window.plugins=window.plugins||{},window.plugins.date={emit:S,bind:T});})();
//# sourceMappingURL=date.js.map
