import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'');
 const target=`http://127.0.0.1:${env.BACKEND_PORT||3001}`;
 return {plugins:[react()],server:{host:env.DEV_HOST||true,port:Number(env.DEV_PORT||5173),proxy:{'/api':{target,changeOrigin:true,timeout:30000,proxyTimeout:30000}}}};
});
