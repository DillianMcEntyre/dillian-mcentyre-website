/* Dillian McEntyre author site: Pages CMS -> Netlify static build. No dependencies. */
'use strict';
const fs=require('fs'), path=require('path');
const root=__dirname, dst=path.join(root,'dist');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const esc=(s)=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const unquote=(s)=>s.trim().replace(/^['"]|['"]$/g,'');
function doc(src){
 let meta={}, body=src;
 if(src.startsWith('---\n')){
  let end=src.indexOf('\n---',4);
  if(end>=0){let fm=src.slice(4,end);fm.split(/\r?\n/).forEach(line=>{let m=line.match(/^([\w-]+):\s*(.*)$/);if(m)meta[m[1]]=unquote(m[2]);});body=src.slice(end+4).replace(/^\s*\n/,'');}
 }
 return {meta,body};
}
function inline(s){
 return esc(s).replace(/!\[([^\]]*)\]\((\/assets\/[^)]+)\)/g,'<img src="$2" alt="$1" loading="lazy" style="max-width:100%;height:auto">')
 .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,'<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>')
 .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
 .replace(/\*(.+?)\*/g,'<em>$1</em>');
}
function md(s){
 const lines=s.replace(/\r\n/g,'\n').split('\n');let blocks=[], buf=[], li=[];
 const flush=()=>{if(buf.length){blocks.push('<p>'+inline(buf.join(' '))+'</p>');buf=[];}};
 const flushList=()=>{if(li.length){blocks.push('<ul>'+li.map(x=>'<li>'+inline(x)+'</li>').join('')+'</ul>');li=[];}};
 for(const line of lines){
  const t=line.trim();
  if(!t){flush();flushList();continue;}
  let h=t.match(/^(#{1,4})\s+(.+)$/);if(h){flush();flushList();blocks.push('<h'+h[1].length+'>'+inline(h[2])+'</h'+h[1].length+'>');continue;}
  let l=t.match(/^[-*]\s+(.+)$/);if(l){flush();li.push(l[1]);continue;}
  flushList();buf.push(t);
 }
 flush();flushList();return blocks.join('\n');
}
function entries(dir){let d=path.join(root,dir);if(!fs.existsSync(d))return [];
 return fs.readdirSync(d).filter(f=>f.endsWith('.md')).map(f=>({slug:f.replace(/\.md$/,''),...doc(read(path.join(dir,f)))})).sort((a,b)=>String(b.meta.date||'').localeCompare(String(a.meta.date||'')));
}
fs.rmSync(dst,{recursive:true,force:true});fs.mkdirSync(dst,{recursive:true});
fs.cpSync(path.join(root,'assets'),path.join(dst,'assets'),{recursive:true});
let site=read('index.html');
// My Story: fallback content stays visible if biography file is missing or blank.
const storyFile=path.join(root,'content/my-story.md');
if(fs.existsSync(storyFile)){
 const story=doc(read('content/my-story.md')).body.trim();
 if(story){const start=site.indexOf('<div class="story-text">'), end=site.indexOf('<div class="signature">',start);
  if(start>=0&&end>start)site=site.slice(0,start)+'<div class="story-text">'+md(story)+site.slice(end);
 }
}
// Latest updates: Pages CMS posts replace old hard-coded announcements.
const news=entries('content/updates');
if(news.length){let start=site.indexOf('window.AUTHOR_UPDATES = ['),end=site.indexOf('\n];',start);
 if(start>=0&&end>start){let data=news.map(n=>({date:n.meta.date||'',category:'Author news',title:n.meta.title||n.slug,text:n.body.replace(/\s+/g,' ').trim().slice(0,500)}));site=site.slice(0,start)+'window.AUTHOR_UPDATES = '+JSON.stringify(data,null,2)+';'+site.slice(end+3);}
}
// Blog landing: public posts automatically appear in the Journal section.
const posts=entries('content/blog');
if(posts.length){
 let cards=posts.map(p=>'<article class="journal-post-card"><div class="section-kicker">'+esc(p.meta.date||'From the journal')+'</div><h3><a href="/blog/'+encodeURIComponent(p.slug)+'/">'+esc(p.meta.title||p.slug)+'</a></h3><p>'+esc(p.body.replace(/[#*\[\]]/g,'').replace(/\s+/g,' ').trim().slice(0,190))+'…</p><a class="button" href="/blog/'+encodeURIComponent(p.slug)+'/">Read article</a></article>').join('');
 let start=site.indexOf('<div class="blog-teaser">'),end=site.indexOf('</div></div></section>',start);
 if(start>=0&&end>start)site=site.slice(0,start)+'<div class="blog-teaser">'+cards+'</div>'+site.slice(end+6);
}
// Styles for posts, inline so the deployed original stays self contained.
site=site.replace('</style>','.journal-post-card{border-bottom:1px solid #ffffff25;padding:26px 0}.journal-post-card:last-child{border-bottom:none}.journal-post-card h3 a:hover{color:#dfa299}.journal-post-card p{line-height:1.85}.journal-post-card .button{margin-top:8px}.journal-article{max-width:760px;margin:auto;padding:100px 24px 140px}.journal-article .section-heading{line-height:1.04}.journal-article .prose{font-size:17px;line-height:1.9;color:#ded7d4}.journal-article .prose h2{font-family:Georgia,serif;font-size:30px;margin-top:36px}.journal-article .prose img{max-width:100%;height:auto}.journal-article .prose a{color:#dfaea2;text-decoration:underline}</style>');
fs.writeFileSync(path.join(dst,'index.html'),site);
const head=site.slice(0,site.indexOf('</head>')+7), header=site.slice(site.indexOf('<header class="site-header">'),site.indexOf('</header>')+9), footer=site.slice(site.indexOf('<footer class="footer">'),site.indexOf('</footer>')+9);
for(const post of posts){
 const dir=path.join(dst,'blog',post.slug);fs.mkdirSync(dir,{recursive:true});
 const title=esc(post.meta.title||post.slug);
 const fixedHeader=header.replace(/href="#/g,'href="/#');
 let page=head.replace(/<title>[^<]*<\/title>/,'<title>'+title+' | Dillian McEntyre</title>')+'<body>'+fixedHeader+
 '<main><article class="journal-article"><div class="section-kicker">The Journal · '+esc(post.meta.date||'')+'</div><h1 class="section-heading">'+title+'</h1><div class="prose">'+md(post.body)+'</div><p style="margin-top:45px"><a class="button" href="/#blog">← Back to the journal</a></p></article></main>'+footer+
 '<script>const b=document.getElementById("menu-button"),m=document.getElementById("site-menu");b.addEventListener("click",()=>{const a=m.classList.toggle("open");b.setAttribute("aria-expanded",String(a))});document.getElementById("year").textContent=new Date().getFullYear();</script></body></html>';
 fs.writeFileSync(path.join(dir,'index.html'),page);
}
console.log('Built author website with',posts.length,'blog entries and',news.length,'updates.');
