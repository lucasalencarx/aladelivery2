import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { commerceRouter } from './commerce.js';
// Aceita .env em backend/ e na raiz. Variáveis do processo têm prioridade.
dotenv.config({path:[fileURLToPath(new URL('./.env',import.meta.url)),fileURLToPath(new URL('../.env',import.meta.url))],quiet:true});
export function createApp(){
 const app=express();
 const configuredOrigins=(process.env.FRONTEND_ORIGINS||process.env.FRONTEND_URL||'').split(',').map(s=>s.trim().replace(/\/$/,'')).filter(Boolean);
 app.use(cors({origin(origin,callback){
  if(!origin)return callback(null,true);
  if(configuredOrigins.includes(origin))return callback(null,true);
  // Sem configuração, aceita desenvolvimento local/LAN; produção deve listar a origem.
  if(!configuredOrigins.length&&process.env.NODE_ENV!=='production'){
   try{const u=new URL(origin);if(u.protocol==='http:'&&/^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(u.hostname))return callback(null,true);}catch{}
  }
  callback(null,false);
 },methods:['GET','POST','OPTIONS'],allowedHeaders:['Content-Type','Authorization','X-Order-Token']}));
 app.use(express.json({limit:'128kb'}));
 const missing=[];
 if(!(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL))missing.push('SUPABASE_URL (ou VITE_SUPABASE_URL)');
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY)missing.push('SUPABASE_SERVICE_ROLE_KEY');
 if(!(process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY))missing.push('SUPABASE_ANON_KEY (ou VITE_SUPABASE_ANON_KEY)');
 app.get('/api/health',(req,res)=>res.json({online:true,version:'commerce-v3-cpf-reuse',paymentPollSeconds:15,paymentSyncConfigured:missing.length===0&&!!process.env.PAGARME_SECRET_KEY,webhookPath:'/api/commerce/pagarme/webhook',commerceConfigured:missing.length===0,pagarmeConfigured:!!process.env.PAGARME_SECRET_KEY,missing}));
 const router=missing.length?((req,res)=>res.status(503).json({message:'Servidor iniciado. Para registrar pedidos, configure no .env: '+missing.join(', ')+'. Reinicie npm start depois de salvar.',code:'BACKEND_CONFIGURATION'})):commerceRouter();
 app.use('/api/commerce',router);
 // Endereços conhecidos da integração Pagar.me, usando o mesmo pedido persistido.
 app.use('/api',router);
 app.use((req,res)=>res.status(404).json({message:'Rota não encontrada.'}));
 app.use((err,req,res,next)=>{console.error('Servidor:',err.name);res.status(500).json({message:'Não foi possível concluir a solicitação.'});});
 return app;
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 const port=Number(process.env.PORT||process.env.BACKEND_PORT||3001);
 const server=createApp().listen(port,'0.0.0.0',()=>console.log(`Backend iniciado na porta ${port}. Diagnóstico: http://localhost:${port}/api/health`));
 server.on('error',err=>{console.error(err.code==='EADDRINUSE'?`A porta ${port} já está em uso. Encerre o backend antigo antes de executar npm start.`:err.message);process.exitCode=1;});
}
