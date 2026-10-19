# Atualização — Pix, avisos e entregadores

## Instalar no projeto existente

1. Guarde uma cópia do projeto atual. Extraia `atualizacao-pix-entregador.zip` **dentro da pasta raiz deliverybeer**, no mesmo nível de `package.json`. O ZIP contém `src/`, `backend/`, `sql/`, `public/` e os arquivos de configuração. Não crie `src/src` nem coloque `admin` diretamente na raiz. Substitua os arquivos correspondentes.
2. O seu `.env` é preservado. Na raiz, rode `npm install`.
3. No SQL Editor do Supabase, execute `sql/15-entregadores-operacao.sql` inteiro, após as migrações 08 a 14 já usadas por este projeto. Se a 14 ainda não foi aplicada, execute-a antes. A 15 é reexecutável e não apaga pedidos nem produtos.
4. Acrescente no `.env` do servidor:

   ```dotenv
   PUBLIC_STOREFRONT_URL=https://ENDERECO-PUBLICO-DO-SEU-SITE
   ```

   Esse é o endereço do **frontend**, onde abre a loja e a rota `/rastrear`. Não use `/api/health` nem o túnel que aponta exclusivamente para o backend da porta 3001. Em teste no mesmo computador, pode usar `http://localhost:5173`; para o cliente abrir no celular fora da sua rede, precisa ser um endereço público do frontend. Mantenha `FRONTEND_ORIGINS` com as origens permitidas.
5. Reinicie `npm run dev` na raiz: inicia backend e Vite juntos. Em produção, `npm start` inicia apenas o backend; o frontend compilado precisa ser servido e `/api` encaminhado ao backend. **Não execute `commerce.js` separadamente.**

O arquivo `deliverybeer-15outubro.zip` é a cópia completa, com uma pasta `deliverybeer/` externa. Para aplicar por cima do projeto existente, prefira o ZIP de atualização, cuja raiz já contém `src/`.

## O que mudou

- Clicar em Pix inicia a geração automaticamente. Com CPF já guardado no servidor, o campo continua oculto; na primeira compra, completar o CPF inicia a geração. Não é necessário clicar em Finalizar pedido para Pix. Dinheiro/cartão na entrega continuam com finalização explícita. A trava impede gerar duas cobranças com cliques repetidos.
- A confirmação de Pix continua sendo feita no servidor pelo Pagar.me: webhook mais reconciliação periódica. Pagamento não é confirmado por uma alteração feita pelo navegador.
- A aba e o indicador de Pix aguardando pagamento saíram do admin. Esses pedidos continuam no banco e no acompanhamento privado do cliente para pagar/expirar; somente Pix pago entra no atendimento. Dinheiro e cartão na entrega continuam aparecendo normalmente.
- O áudio padrão está incluído também nos arquivos compilados. O som fica habilitado por padrão, com preferência de silenciar salva neste navegador. Uma interação no painel tenta liberar a reprodução; se o navegador bloquear, há **Ativar / testar som dentro do próprio modal**. O navegador ainda exige interação do usuário para liberar áudio. Mantenha o painel aberto, volume ligado e a aba sem silenciamento.
- Para usar seu próprio áudio, coloque o arquivo em `public/audio/novo-pedido.wav`, defina `VITE_ORDER_ALERT_SOUND=/audio/novo-pedido.wav` e reinicie o Vite/recompile. Se houver uma configuração antiga apontando para arquivo inexistente, remova-a para usar o áudio incluído.
- “Marcas que amamos” usa as marcas cadastradas, com movimento automático lateral, pausa ao passar o mouse/focar e suporte à preferência de reduzir movimento.

## Criar acesso do entregador

1. Admin → Entregadores → cadastre/ative a pessoa e, se desejar, envie a foto.
2. Clique em **Criar acesso**. Informe e-mail exclusivo e senha com no mínimo 8 caracteres. O servidor cria o usuário pelo Supabase Auth; não envia SMS nem depende de confirmação por e-mail. A mesma tela permite **Redefinir acesso**.
3. Informe e-mail, senha e o endereço `https://SEU-SITE/entregador` ao entregador por um canal privado.
4. O login usa uma sessão separada do admin e do cliente. A conta não deve ser incluída na autorização administrativa existente (`admin_has_access`). O acesso aos pedidos é conferido no servidor e nas funções SQL; entregador inativo não opera.
5. No detalhe do pedido, selecione o entregador e clique em **Salvar entregador**. Coloque o pedido em **Em preparação** quando estiver no preparo.

## Fluxo da entrega

- `/entregador` exibe os pedidos ativos atribuídos à pessoa, incluindo produtos/fotos/códigos, quantidades, observações, endereço, referência, valor, situação do pagamento e troco. A lista consulta atualizações a cada 10 segundos.
- **Iniciar entrega · Waze** ou Google Maps muda o pedido de Em preparação para Saiu para entrega, registra o evento e envia a atualização automática ao chat. Só então abre o mapa. É necessário ter o pedido em preparação. Depois da saída, Navegar abre a rota sem repetir a mudança de etapa.
- **Estou chegando** avisa automaticamente no chat: “Seu pedido já está chegando, eba!”. O aviso é gravado uma vez, mesmo com cliques repetidos.
- **Concluir entrega** pede quatro dígitos: os últimos do telefone cadastrado do cliente. Eles também aparecem no acompanhamento privado do cliente. Confira os produtos entregues e o recebimento antes de confirmar. Esse código é uma conferência operacional simples, não uma senha de identidade.
- Se houver pagamento em dinheiro/cartão na entrega, o entregador vê o valor a cobrar; a loja continua responsável por confirmar o recebimento no painel após a entrega. O entregador não pode alterar a confirmação do Pix.

## Aproximação por GPS

No detalhe do pedido no admin há **Ponto de entrega no mapa (opcional)**. Confirme o endereço real no mapa e salve latitude e longitude corretas. Não são criadas coordenadas fictícias para o cliente.

Com esse ponto configurado, o entregador pode ativar **Aviso por proximidade**. A página solicita a localização; ao chegar a até 300 metros, com precisão informada de no máximo 100 metros, o servidor grava o aviso único no chat. O GPS é desligado na conclusão/saída da sessão e pode ser interrompido pelo entregador. Sem ponto confirmado ou sem permissão, use Estou chegando.

GPS no navegador precisa de HTTPS (ou localhost) e autorização. Mantenha a tela do entregador aberta para acompanhar: ao trocar para o Waze, bloquear o celular ou colocar o navegador em segundo plano, o sistema pode suspender o GPS. O Waze não devolve a posição ao site. Não há promessa de rastreamento contínuo em segundo plano; para isso seria necessário um app móvel com permissões próprias.

## WhatsApp e link de acompanhamento

Os botões do admin (dashboard, lista e detalhe/chat) e do entregador preparam a mensagem com nome, protocolo, situação/chegada e o **link privado completo de acompanhamento**. A lista do admin busca esse link no servidor com a sessão administrativa antes de abrir o WhatsApp. O link carrega a credencial no fragmento; não o publique em páginas abertas.

No WhatsApp comum, a pessoa ainda confirma **Enviar**. O aviso automático implementado nesta atualização é no chat do pedido. Envio de WhatsApp sem clique não foi habilitado: depende de configurar uma integração de mensagens da empresa. Não existe automação oculta do WhatsApp Web neste pacote e nenhum serviço externo de mensagens foi acionado nos testes.

## Validação

Build de produção, testes do checkout (Pix automático, CPF salvo e prevenção de duplicidade), alertas, links de WhatsApp, login/rotas de entregadores e migrações em PostgreSQL embarcado. As migrações 08–15 são verificadas, inclusive reexecução, isolamento da atribuição, código incorreto, bloqueio de entregador inativo e deduplicação do aviso de chegada.

Não houve cobrança real no Pagar.me, criação de conta no seu Supabase ou teste de entrega/GPS em aparelho físico. Faça uma compra controlada após instalar e configurar os endereços públicos.
