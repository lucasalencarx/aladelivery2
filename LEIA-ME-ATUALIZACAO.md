> Atualização Pix e avisos do admin: siga `ATIVAR-PIX-ALERTAS.md` e execute o SQL13 antes de iniciar esta versão.

# Histórico e fidelidade: atualização mais recente

Leia primeiro `ATIVAR-HISTORICO-FIDELIDADE.md`. Esta versão acrescenta SQL 12, recuperação de histórico por SMS, filtros por período, Pix no acompanhamento, ranking top 10 e cupons pessoais.

Pix pendente fica fora da fila principal, preservando os pagamentos na entrega. Para recuperar o histórico em outro aparelho, é preciso habilitar Phone Auth e configurar provedor SMS no Supabase. O checkout e os links privados continuam funcionando sem SMS.

A atualização inclui alterações no backend, cliente e admin. Atualize o projeto completo ou todos os arquivos do pacote, aplique o SQL 12 e reinicie o Node. As instruções anteriores abaixo ficam como referência; a rotina de expiração de Pix é descrita no guia novo.

---

# Pedidos, chat e impressão — atualização de 16/10

## Aplicação

O arquivo `admin-16out2.zip` preserva o admin enviado e acrescenta os arquivos compartilhados necessários ao chat e à impressão.

1. Faça cópia da instalação atual.
2. Copie a pasta `admin/` do ZIP para `src/admin/`. Copie `components/OrderConversation.jsx` e `components/order-conversation.css` para `src/components/`. Copie `utils/orderTools.js` para `src/utils/`.
3. O avatar utiliza a imagem já existente em `src/assets/images/logomarca.png`. Não é uma foto de funcionário; é a identidade da loja.
4. Execute `sql/11-chat-status-automatico.sql` no Supabase depois da estrutura de pedidos do SQL 08. Não é necessário reexecutar as migrações anteriores já aplicadas.
5. Reinicie `npm run dev`, ou gere e publique `npm run build`. O projeto completo atualizado já contém todos esses arquivos nos caminhos corretos.

## Comportamento

- Cards de pedidos agora mostram os produtos (até três na lista), quantidades, valores, bairro, pagamento, botão de conversa, WhatsApp e impressão. Os detalhes mostram todos os produtos, suas fotos disponíveis e o resumo completo.
- O chat tem avatar com logo da loja, identificação de cliente/loja, balões, indicação de mensagens automáticas, respostas prontas e formulário de envio. A mesma aparência é usada na página do cliente.
- Cada NOVO evento de status gera uma mensagem da loja dentro da mesma transação no banco. Criação, confirmação do Pix, preparação, saída, entrega e cancelamento usam esse fluxo. Salvar só o entregador sem mudar etapa não duplica mensagens.
- As mensagens automáticas usam “Olá, primeiro nome”, sem presumir gênero. A seleção de saudação “meu amigo/minha amiga” é manual e vale para os textos preparados nessa tela; não altera o cadastro nem muda a saudação automática do banco.
- Os atalhos de resposta somente preenchem o campo. Para enviar é preciso clicar em Enviar. O WhatsApp abre uma conversa com o telefone do pedido e texto pronto contendo protocolo, status atual e total. O envio é feito pelo operador no WhatsApp; não há disparo automático nem integração com WhatsApp Business API.
- O link privado do pedido não é colocado automaticamente na mensagem WhatsApp: ele contém a credencial de acesso e não é retornado na listagem administrativa. A mensagem orienta o cliente a usar o link recebido após a compra.
- O comprovante abre em janela própria, com layout para papel térmico de 80 mm e opção de impressão/salvar PDF no navegador. Contém cliente, endereço, produtos, pagamento, subtotal, desconto, taxa, total, observações e protocolo. Não é nota fiscal e não emite NFC-e/NF-e. Se o navegador bloquear a janela, permita pop-ups para o site.
- O SQL não reenvia avisos de etapas antigas. Em pedidos existentes, a próxima mudança de status passa a gerar uma mensagem. Ele pode ser executado novamente sem duplicar o gatilho.

Validação: migração e geração única das mensagens por evento em PostgreSQL embarcado; conteúdo do comprovante e escape dos dados; mensagem/telefone do WhatsApp; saudação manual sem envio automático; botão de impressão; suíte do projeto e compilação. Não houve impressão física, envio pelo WhatsApp ou validação visual em navegador real neste ambiente.

---

# Correção da taxa e da conexão no celular

A faixa amarela foi removida do cabeçalho. Na revisão e no pagamento, os valores aparecem no resumo: Subtotal, Desconto (quando existir), Taxa de entrega e Total. No comprovante também aparece a taxa. Antes de escolher um bairro, a entrega é indicada como “A calcular”; taxa zero aparece como “Grátis”. O total continua incluindo a entrega uma única vez.

## Aplicar esta correção

Extraia `correcao-taxa-conexao.zip` na raiz do projeto, onde está package.json, substituindo os arquivos. Ou use o projeto completo atualizado. Preserve seu `.env`. Não há novo SQL nesta correção; os SQLs 08, 09 e 10 da atualização anterior continuam necessários.

Encerre a execução antiga do Vite com Ctrl+C e execute na raiz:

```bash
npm ci
npm run dev
```

Agora esse comando inicia backend e Vite juntos. Se o backend desta versão já estiver iniciado com npm start, ele é reutilizado. `npm run dev:frontend` inicia apenas o Vite, para quem gerencia o Node separadamente.

Em desenvolvimento, as chamadas usam `/api/commerce` na mesma origem da loja. O Vite encaminha `/api` ao Node em 127.0.0.1, na porta BACKEND_PORT (padrão 3001). Assim, o celular não precisa acessar diretamente a porta 3001 nem depende de CORS entre as portas do site e do backend. VITE_API_URL não é usada no modo dev, para evitar um endereço antigo atrapalhar o acesso pela rede.

Abra no próprio celular `http://10.0.0.103:5173/api/health` (ajuste IP/porta se forem outros). O diagnóstico deve mostrar `online: true`, `commerceConfigured: true` e `pagarmeConfigured: true`.

A imagem enviada mostra falha de conexão com 10.0.0.103:3001 antes de chegar ao Pagar.me. No `.env` anexado ao projeto também falta `SUPABASE_SERVICE_ROLE_KEY`: adicione a chave de servidor do seu projeto Supabase e reinicie o dev. Ela é necessária para registrar os novos pedidos. Preserve PAGARME_SECRET_KEY; não coloque chaves secretas em variáveis VITE_.

Em produção, o servidor web precisa encaminhar `/api` para o Node, ou VITE_API_URL deve apontar para a API HTTPS pública. A configuração de proxy do Vite é apenas para desenvolvimento; `npm run build` não inicia nem publica o backend.

Validação desta correção: teste do resumo de valores sem faixa amarela, suíte de pedidos/endereços/Pix simulado, compilação e uma chamada HTTP real ao backend através do proxy do Vite. Nenhuma cobrança real foi efetuada.

---

# Ajuste de inicialização, endereço e pagamento — 16/10/2026

Esta versão já inclui as correções anteriores e mantém o Pix Pagar.me com QR Code, cópia do código e confirmação automática. Cartão/dinheiro continuam na entrega, como no projeto original.

## Para iniciar agora

1. Preserve seu `.env` e sua `PAGARME_SECRET_KEY`. Não use `.env.example` para sobrescrever suas chaves.
2. No Supabase execute o SQL 10 incluído (`sql/10-bairros-checkout.sql`) depois dos SQLs 08 e 09 já enviados. Ele expõe somente bairros ativos e suas taxas ao checkout.
3. Acrescente ao seu `.env` a variável `SUPABASE_SERVICE_ROLE_KEY` com a chave de servidor do mesmo projeto Supabase. Não prefixe essa chave com VITE_. Ela é necessária para os novos pedidos/chat; a chave Pagar.me anterior continua a mesma. No arquivo anexado havia a chave Pagar.me, mas essa variável Supabase estava ausente.
4. Na raiz, onde está package.json, execute `npm ci` e depois `npm start`. Isso inicia o backend na porta 3001. `npm run backend` continua funcionando. Também é possível executar `npm start` de dentro de backend/ após instalar as dependências na raiz.
5. Em outro terminal, na raiz, execute `npm run dev` para a loja/admin.
6. Abra `http://localhost:3001/api/health`. Deve mostrar online=true, pagarmeConfigured=true e commerceConfigured=true. Se houver missing, preencha as variáveis listadas e reinicie npm start.

O backend lê tanto `.env` da raiz quanto `backend/.env` (este tem prioridade; variáveis do processo têm prioridade sobre ambos). Se existir uma cópia antiga em backend/.env, confira para não usar valores conflitantes.

O nome anterior `FRONTEND_URL` foi mantido como alternativa a `FRONTEND_ORIGINS`. Use a origem exata onde abre a loja, incluindo a porta; vários endereços podem ser separados por vírgula. Se ambos estiverem definidos, `FRONTEND_ORIGINS` tem prioridade. Sem nenhum configurado, desenvolvimento local/LAN é aceito. Produção deve configurar as origens explícitas.

Na versão atual, desenvolvimento usa o proxy /api do Vite. Em produção, use proxy /api no servidor web ou defina VITE_API_URL com a URL pública da API HTTPS.

## Endereço facilitado

- Estado removido da tela e MS definido internamente.
- Cidade: Corumbá-MS ou Ladário-MS.
- Bairro: somente os ativos cadastrados em Admin → Taxas de entrega, filtrados pela cidade.
- CEP com 8 dígitos consulta ViaCEP, sugere rua e cidade e seleciona o bairro quando o nome corresponde ao cadastro do admin.
- Um bairro retornado pelo CEP nunca é criado automaticamente no admin. Se não corresponder a um bairro atendido, o cliente precisa selecionar uma opção válida.
- CEP geral sem rua, CEP não encontrado ou serviço indisponível permitem preencher a rua manualmente. Número e complemento permanecem editáveis. Consulta antiga é descartada após editar o CEP ou sair da etapa do endereço.
- A taxa é exibida antes do pagamento e conferida novamente no servidor.

## Pagar.me

A integração continua na API Core v5, com Basic Auth pela PAGARME_SECRET_KEY, Pix de 10 minutos e o mesmo retorno de QR Code/status. As rotas conhecidas `/api/pagarme/create-pix` e `/api/pagarme/pix-status/:orderId` também existem como compatibilidade. Elas exigem o pedido persistido (`local_order_id` ou `metadata.local_order_id`) e seu `X-Order-Token`; não autorizam cobrança arbitrária de valores do navegador. O checkout deste pacote já envia esses dados pelo fluxo integrado.

Antes de gerar o QR, o novo checkout registra o pedido para que protocolo, estoque, taxas e chat correspondam à cobrança. Por isso a chave Supabase de servidor é necessária nesta versão, mesmo que o Pix antigo usasse apenas a chave Pagar.me. Se faltar configuração, o Node inicia e informa a pendência em vez de encerrar.

Foram testados: npm start e health com a configuração anexada; cidades/bairros; CEP até a tela de pagamento; preenchimento manual; geração/consulta Pix por HTTP com gateway simulado; uso do valor do banco, CORS com FRONTEND_URL e bloqueio de token incorreto. Não foi feita cobrança real na sua conta. Antes de publicar, valide o Pix com a chave de testes do Pagar.me.

Referências: https://viacep.com.br/ e https://docs.pagar.me/reference/pix-2

---

# Atualização — pedidos, atendimento e taxas

O projeto completo já contém o admin atualizado. Use o ZIP completo como fonte principal. Faça cópia do código e backup do banco antes de substituir a instalação.

## Instalação

1. Extraia `deliverybeer-15outubro.zip`. Preserve seu `.env` original: credenciais não foram incluídas no pacote.
2. Execute também `sql/09-dashboard-direto.sql` depois do SQL 08: o dashboard passa a consultar o Supabase diretamente, mantendo autenticação administrativa, sem depender do Node. Pedidos, chat e pagamentos continuam usando o Node.

   No SQL Editor do mesmo Supabase usado pela loja, execute `sql/08-pedidos-chat-taxas.sql` inteiro. Ele depende das tabelas anteriores do admin (produtos, seções, cupons, entregadores) e das funções `admin_has_access`, `admin_reorder_section` e `admin_dashboard_stats`. Não apaga os pedidos antigos. Se faltar alguma estrutura anterior, a transação é interrompida sem aplicar parte da migração.
3. Atualize as variáveis conforme `.env.example`. `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` continuam as mesmas. Defina `VITE_API_URL` com a URL do Node.
4. Somente no servidor, configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `PAGARME_SECRET_KEY`. Nunca coloque essas duas chaves secretas em variáveis `VITE_` ou no navegador. A chave pública precisa estar em `VITE_SUPABASE_ANON_KEY` ou `SUPABASE_ANON_KEY` também no ambiente do Node para conferir as contas administrativas.
5. Use Node 22.12 ou superior. Execute `npm ci`, `npm run backend` e, em outro terminal, `npm run dev`. Para produção, `npm run build` e publique `dist`, mantendo o Node em execução separadamente. Reinicie o Node após alterar `.env`.
6. Ajuste `FRONTEND_ORIGINS` para as origens exatas da loja e admin, separadas por vírgula. Em produção use HTTPS no site e na API. Se um proxy faz o encaminhamento, mantenha streaming SSE sem buffer para `/api/commerce/*/stream`. A consulta periódica continua como alternativa quando o streaming cair.
7. No Pagar.me, configure um webhook para `https://SUA-API/api/commerce/pagarme/webhook`, com os eventos `order.paid` e `charge.paid`. O servidor não aceita a indicação do webhook como prova: busca o pedido na API autenticada e confere status e valor. O mesmo processo ocorre na consulta do cliente.
8. Garanta que a hospedagem redireciona rotas React para `index.html`, incluindo `/rastrear` e `/admin/*`.
9. Entre no admin → **Taxas de entrega**, revise valores e bairros antes de abrir a loja. Os 17 bairros e seus prazos/valores são exemplos iniciais editáveis, não um levantamento completo nem tarifas reais.

O ZIP separado do admin é uma alternativa para integrar o painel a outro projeto React. Copie `admin/`, `services/commerceApi.js`, `utils/uuid.js` e os dois arquivos de `components/` para dentro de `src/`, preservando esses caminhos. Ele também inclui o backend e SQL necessários. Atualizar somente essa pasta não atualiza o checkout: para esta atualização completa use o projeto completo.

## O que mudou

- **Seções:** adicionar um produto também o ativa, numa única transação. Produtos já incluídos têm Ativar/Pausar em um clique. Seção oculta continua oculta até ser ativada.
- **Organização:** prévia em duas linhas de cards, rolagem lateral, arrastar produtos entre posições/linhas e arrastar seções. Setas oferecem a mesma organização em telas de toque e teclado. Itens pausados aparecem esmaecidos para edição; a loja pública só exibe ativos. A prévia representa a disposição dos produtos; “Abrir loja” mostra o resultado final no layout público.
- **Entregadores:** botão direto para adicionar/trocar foto. JPG, PNG e WebP de até 3 MB; arquivo privado no Storage e visualização por link temporário administrativo.
- **Taxas:** cadastro por cidade/bairro, valor, prazo estimado e pausa do atendimento. Cidade e bairro são selecionados no checkout; endereço fora da cobertura não finaliza a compra. Taxa zero é aceita como entrega grátis. O servidor confere a taxa e o total novamente.
- **Pedidos:** protocolo único, itens e endereço como retrato da compra, valor da entrega, desconto, pagamento, observação, tipo de cartão e troco. Preços e estoque são validados no banco. Erro desfaz toda a criação.
- **Rastreamento:** página `/rastrear` com confirmação, preparação, saída e entrega, histórico e estimativa inicial. É acompanhamento por etapas atualizadas pela loja; não inclui GPS/mapa ao vivo.
- **Atendimento:** conversa privada vinculada ao pedido com nome, telefone e itens no admin. Cliente e loja recebem mudanças via Supabase Realtime → Node → SSE, com reconexão e consulta periódica de reserva. Mensagens ficam salvas.
- **Pagar.me:** permanece Pix online, com chave de idempotência por pedido, valor obtido do banco e confirmação no servidor. Cartão e dinheiro continuam **na entrega**. A chave secreta fica exclusivamente no Node.
- **Cupons:** o checkout utiliza os cupons do admin, incluindo validade, pedido mínimo, limite de usos e teto. Os cupons demonstrativos fixos foram removidos.
- **Dashboard:** inclui métricas dos novos pedidos e mantém os totais anteriores. A listagem de pedidos tem botão para consultar o histórico anterior.

## Operação diária

O cliente recebe protocolo e botão **Rastrear entrega**, que abre a conversa com a loja na mesma página. Deve guardar o link privado. Há botão de copiar o link para abrir em outro dispositivo. O protocolo isolado não concede acesso aos dados do pedido.

No admin → Pedidos, busque por protocolo, nome ou telefone, abra o pedido, responda às mensagens, escolha o entregador e salve. Avance pelas etapas em sequência. Pix pendente não pode ser liberado manualmente como pago. Para dinheiro/cartão, após marcar entregue, confirme o recebimento do valor.

O checkout não recupera dados pessoais de outra pessoa apenas digitando telefone: telefone não autentica identidade. Nome e endereço são informados para a compra atual; clientes e pedidos anteriores do admin são preservados.

## Tabelas novas

| Tabela | Função |
|---|---|
| `delivery_zones` | Bairros atendidos, taxa e estimativa |
| `shop_orders` | Pedido, protocolo, credencial privada, totais, pagamento e itens/endereço em JSON |
| `shop_order_events` | Histórico das etapas |
| `shop_messages` | Conversa cliente/loja |

`orders`, `order_items` e `order_status_history` anteriores não são apagadas ou renomeadas. Novas compras usam `shop_orders` e as tabelas relacionadas. Funções de escrita privadas são executáveis apenas pelo servidor. O admin mantém o login Supabase e precisa passar por `admin_has_access`.

## Pontos operacionais

- Criar pedido reserva estoque e contabiliza o uso do cupom. Cancelar devolve os itens e libera esse uso uma única vez. **Pix abandonado/vencido permanece pendente até a loja revisar/cancelar**; não há rotina automática de expiração nesta versão. Evite deixar reservas abandonadas sem revisão.
- O QR Pix dura 10 minutos. Se vencer, não tente reutilizá-lo: contate a loja para revisar/cancelar o pedido pendente e refaça a compra. A chave de idempotência impede emitir outra cobrança silenciosamente para o mesmo pedido. O link de acompanhamento continua disponível mesmo após fechar o checkout.
- Cancelar um pedido **não estorna Pix**. Efetue o estorno pelo painel Pagar.me e confira a conciliação. Reembolsos/chargebacks não são sincronizados automaticamente nesta versão. Pagamento tardio de pedido cancelado, ao ser detectado por consulta/webhook, registra o pagamento sem reabrir a entrega; concilie e estorne pelo painel Pagar.me.
- O chat exibe as últimas 500 mensagens por pedido; após 7 dias da última alteração de um pedido entregue/cancelado, novos envios do cliente são bloqueados. Histórico permanece salvo.
- O limite de requisições é básico e fica em memória por IP. Em múltiplos servidores, implemente o limite no proxy/serviço compartilhado. O servidor não configura automaticamente `trust proxy`: configure-o conforme sua infraestrutura para identificar o IP real.
- Não há envio automático por WhatsApp/SMS/e-mail. O protocolo e link são apresentados após a compra e podem ser copiados.
- Informações de cartão aberto não são coletadas: o cartão é passado na maquininha na entrega.

## Validação

Execute `npm test` e `npm run build`.

Foram verificados: execução/reexecução da migração em PostgreSQL embarcado; cálculo de preço/taxa/cupom; falha e rollback; estoque insuficiente; tentativas repetidas; restauração de estoque/cupom; transições; bloqueio de leitura pública e de confirmação pública do Pix; telas do checkout com taxa e chamadas de criação/Pix simuladas.

Não foram executadas migração no seu Supabase, publicação ou transação real Pagar.me. Antes de abrir ao público, teste com chave de teste: faça uma compra por bairro, confira a taxa no QR e no banco, abra o link em dois dispositivos, converse pelos dois lados, avance a entrega, confirme pagamento e teste cancelamento. Confira também foto do entregador e a ordem das seções na loja real.

A compilação tem aviso de tamanho do bundle; o lint conserva avisos anteriores do projeto. Os testes de tela usam DOM simulado; não foi possível validar visualmente em navegador real neste ambiente.

Referências Pagar.me consultadas:
- https://docs.pagar.me/reference/criar-pedido-2
- https://docs.pagar.me/docs/o-que-%C3%A9
- https://docs.pagar.me/reference/autentica%C3%A7%C3%A3o-2
