import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
const root='D:/Hamon/worktrees/returnby-discovery-0378a7b6',proof='D:/Hamon/worktrees/returnby-reminder-timing-0378a7b6-proof',app=proof+'/native-app';
fs.mkdirSync(app);fs.cpSync(root+'/dist',app+'/site',{recursive:true});
const server = `import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'site');
const port=process.argv[2]===undefined?8785:Number(process.argv[2]);
if(!Number.isInteger(port)||port<0||port>65535)throw Error('Choose a port from 0 to 65535.');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{
 try{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).replace(/^\/+/,'')||'index.html';
  const file=path.resolve(root,name);
  if(!file.startsWith(root+path.sep)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  const body=fs.readFileSync(file);res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404);res.end('Not found');}
});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log('ReturnBy: http://127.0.0.1:'+server.address().port+'/'));
process.on('SIGINT',()=>server.close());
`;
fs.writeFileSync(app+'/serve.mjs',server);
fs.writeFileSync(app+'/README.txt',[
'ReturnBy — native reviewed reminder-time build',
'Qualified source: 9585fc2d39de8b4af70abc9eada341220111159d',
'Run from this folder with the already installed Node.js: node serve.mjs',
'Open the printed http://127.0.0.1:8785/ URL. Stop with Ctrl+C.',
'Optional: node serve.mjs 8786 selects another free local port. Existing services are never stopped.',
'This is a local build, not the published website. Browser storage belongs to its exact address and browser profile; orders from another site are not imported automatically.',
'Paste and review a confirmation to save an order, then choose its reminder time. The browser prepares a .ics file for you to import into your calendar; no notification service or calendar connection runs here.',
'The site assets exactly match the native/independently received production build. Native Node 24.19.0 and Chrome 154 were used for receiving.',
'No npm installation, network service or GitHub Actions is needed to serve this folder. Do not open index.html directly: module loading needs the local HTTP server.',
'GitHub Actions/source publication are held by the explicit user instruction. This package does not deploy anything.',
''].join('\n'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function walk(p,rel=''){return fs.readdirSync(p,{withFileTypes:true}).flatMap(v=>v.isDirectory()?walk(path.join(p,v.name),rel+v.name+'/'):[rel+v.name]);}
const files=walk(app).map(p=>{const b=fs.readFileSync(app+'/'+p);return{path:p,bytes:b.length,sha256:sha(b)};});
const manifest={at:new Date().toISOString(),source:'9585fc2d39de8b4af70abc9eada341220111159d',tree:'34f33daed238a7f9088a779c7edf861469a55e46',files};
fs.writeFileSync(app+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({files:files.length,bytes:files.reduce((n,r)=>n+r.bytes,0),manifestSha256:sha(fs.readFileSync(app+'/manifest.json'))}));
