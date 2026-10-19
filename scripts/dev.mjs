import {createServer} from 'vite';
import {createApp} from '../backend/server.js';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.BACKEND_PORT||3001);
let backend;
try{
 backend=await new Promise((resolve,reject)=>{const s=createApp().listen(port,'0.0.0.0',()=>resolve(s));s.once('error',reject);});
 console.log(`Backend iniciado junto com a loja (porta ${port}).`);
}catch(e){
 if(e.code!=='EADDRINUSE')throw e;
 try{const r=await fetch(`http://127.0.0.1:${port}/api/health`,{signal:AbortSignal.timeout(2000)});const h=await r.json();if(!/^commerce-/.test(h.version||''))throw Error();console.log(`Usando o backend já iniciado na porta ${port}.`);}catch{throw Error(`A porta ${port} está ocupada por outro servidor. Encerre-o e execute npm run dev novamente.`);}
}
let vite;
try{vite=await createServer({root});await vite.listen();vite.printUrls();}catch(e){backend?.close();throw e;}
let closing=false;
async function stop(){if(closing)return;closing=true;await vite.close();if(backend)await new Promise(r=>backend.close(r));process.exit(0);}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
