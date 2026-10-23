# Publicar o delivery: admin e Pix

## O que foi corrigido
O vercel.json encaminha as rotas do React, incluindo /admin e /entregador,
para index.html. A API não é encaminhada para HTML. O backend aceita PORT,
fornecida por hospedagens Node, além de BACKEND_PORT para uso local.

## Site na Vercel
Na raiz configurada na Vercel devem estar package.json, vercel.json e src/.
Build: npm run build. Pasta de saída: dist.
Em Settings > Environment Variables configure:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_API_URL=https://ENDERECO-REAL-DO-BACKEND (sem /api no final)
Aplique a Production e, se necessário, Preview. Faça novo deploy após mudar.
Acesse o domínio publicado com /admin. O login administrativo continua exigido.
Não copie a pasta admin isoladamente: o App importa src/admin/AdminRoutes.

## Servidor de pedidos e Pix
Este projeto usa Express, conexões SSE e reconciliação periódica de pagamentos.
O build Vite publica apenas o frontend. Hospede o backend em um serviço Node
com processo contínuo, usando a raiz deste repositório:
- instalação: npm ci
- inicialização: npm start
- Node 22.12 ou superior
- o serviço define PORT; não é necessário fixar BACKEND_PORT em produção
Configure no serviço do BACKEND:
- NODE_ENV=production
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- PAGARME_SECRET_KEY
- PAGARME_CUSTOMER_EMAIL (o endereço utilizado pela loja)
- FRONTEND_ORIGINS=https://DOMINIO-DA-LOJA (origens exatas, separadas por vírgula)
- PUBLIC_STOREFRONT_URL=https://DOMINIO-DA-LOJA
Use HTTPS e inclua em FRONTEND_ORIGINS cada domínio de preview que quiser testar.
As chaves precisam pertencer ao mesmo Supabase utilizado pelo frontend.
Nunca coloque SERVICE_ROLE nem PAGARME_SECRET_KEY em variáveis VITE_.
Configure no Pagar.me o webhook público:
https://ENDERECO-REAL-DO-BACKEND/api/commerce/pagarme/webhook
Confira que as migrações SQL do projeto já foram aplicadas, sem reaplicar
indiscriminadamente scripts antigos. A conta Pagar.me precisa permitir Pix.

Diagnóstico: abra https://ENDERECO-REAL-DO-BACKEND/api/health.
commerceConfigured, pagarmeConfigured e paymentSyncConfigured devem ser true.
Isso confirma configuração presente, não a validade das chaves nem o banco.
Teste a criação de um pedido; uma cobrança real exige ambiente/chaves adequados.
Nenhum pagamento real foi executado na revisão deste pacote.
Sem hospedar/configurar o backend, o Pix não funcionará só por subir este ZIP.

## Atualizar o GitHub existente
Extraia o pacote e copie seu conteúdo para a pasta do repositório local existente,
no mesmo nível de package.json, preservando a pasta .git e seu .env local.
Não crie deliverybeer/deliverybeer. Não envie o ZIP como arquivo do repositório.
Na pasta do repositório, execute:

```bash
git status
git remote -v
git branch --show-current
git add vercel.json backend/server.js PUBLICAR-VERCEL-PIX.md
git diff --cached --stat
git commit -m "Corrige rotas Vercel e porta do backend"
git push origin main
```

O comando final pressupõe a branch main; ajuste se a branch exibida for outra.
Para outras alterações, adicione os arquivos desejados explicitamente e revise
com git diff --cached antes do commit. Se o push for rejeitado, não use --force;
primeiro integre as alterações remotas. Se não houver .git, clone primeiro o
repositório existente e copie as mudanças para essa cópia.
A Vercel publica o commit automaticamente se a integração Git estiver ativa.
Não envie .env, node_modules ou dist. Este pacote não inclui credenciais.
