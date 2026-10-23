# Rastreamento da entrega — atualização 18

## Instalação

1. Preserve seu `.env` atual. Este pacote não leva credenciais nem `node_modules`.
2. Substitua os arquivos do projeto pelos arquivos deste ZIP.
3. No SQL Editor do Supabase, execute `sql/18-rastreamento-ao-vivo.sql`.
   Ele exige a migração 15 e as anteriores já instaladas. Se ainda não instalou a
   área de entregadores, siga primeiro `INSTALAR-PIX-ENTREGADOR.md`.
   O SQL18 é reexecutável; não recria pedidos nem apaga o cadastro da equipe.
4. Na raiz, execute `npm install` e `npm run build`.
5. Publique o frontend e atualize/reinicie também o backend Node (`npm start`).
   Atualizar apenas o frontend não instala as novas rotas da API.
   Em desenvolvimento, `npm run dev` inicia o conjunto existente.
6. Use HTTPS em produção e configure a origem do frontend no backend, como já
   exigido pelo projeto. O GPS não funciona por HTTP em um IP da rede local.
   `localhost` pode ser usado para testes no próprio computador.

## Preparar o entregador

Em **Admin → Entregadores**, cadastre nome, foto, veículo e placa. O projeto já
possui esses campos e a criação de acesso com e-mail e senha. Bicicleta e a pé
podem ficar sem placa. Não é necessário cadastrar novamente a equipe existente.

Atribua o pedido ao entregador e coloque-o em preparação. Em `/entregador`,
inicie a rota pelos botões já existentes. Quando o pedido estiver em entrega,
toque em **Compartilhar localização com o cliente** e permita a localização.
O compartilhamento é voluntário e não começa ao fazer login.

Não é necessário cadastrar latitude/longitude do cliente para compartilhar a
posição. Se houver um ponto confirmado do destino, ele também aparece no mapa
e o aviso automático de proximidade continua funcionando, em até 300 metros,
quando a precisão do GPS for de até 100 metros. O aviso de chegada não encerra
o rastreamento.

## O que o cliente vê

Em **Meus pedidos**, pedidos em rota exibem **Rastrear entrega**. Ao abrir o
pedido privado, o cartão mostra foto, nome, veículo, placa e o horário relativo
da última localização. Se não houver foto, aparece a inicial do nome; dados
não preenchidos são indicados como não informados.

Após a primeira posição, o botão **Rastrear entrega** abre o mapa interativo.
O capacete acompanha a posição recebida. É possível arrastar o mapa, ampliar,
reduzir e voltar ao entregador pelo botão de centralizar. O círculo representa
a precisão aproximada do GPS (limitado visualmente a 2 km).

Não há uma rota de trânsito ou previsão de chegada calculada pelo mapa. O
marcador representa a posição real recebida, sem inventar deslocamentos.

## Arquitetura e frequência

Celular do entregador → API Node autenticada → função SQL protegida → última
posição do pedido no Supabase → API privada do cliente → mapa Leaflet.

- O navegador usa `watchPosition` com alta precisão. Há uma nova leitura
  periódica para manter a atualização mesmo com o entregador parado.
- O envio é limitado a uma vez a cada 15 segundos; o banco também protege
  contra gravações com menos de 10 segundos de intervalo.
- O cliente consulta uma rota leve a cada 10 segundos, apenas com a página
  visível. Portanto é acompanhamento quase em tempo real: em condições normais,
  o atraso pode ficar na faixa de 10–25 segundos, além da rede e do GPS.
- O SSE/Realtime já existente continua atualizando status e conversa. O mapa
  usa consulta periódica privada, sem exigir um canal Supabase público no
  navegador e sem depender de SSE permanecer conectado.
- Após 45 segundos sem posição recente, o cartão informa **Sinal desatualizado**.
  Falhas de conexão também são indicadas, sem apresentar posição antiga como
  atual. Voltar à aba solicita atualização imediatamente.
- O mapa carrega sob demanda, separado do JavaScript inicial da loja.
- O Leaflet está instalado pelo npm. Os mapas de rua usam tiles OpenStreetMap
  com atribuição. Não exigem chave Google, mas dependem de internet e da
  disponibilidade/política do provedor. Em escala maior, configure um provedor
  de tiles com capacidade adequada.

## Privacidade e controle

A API verifica o login do entregador, seu cadastro ativo e a atribuição do
pedido. As funções SQL só podem ser executadas pelo backend com `service_role`;
essa chave nunca deve ser usada em `VITE_*` ou enviada ao navegador.

O cliente consulta com o mesmo token privado já usado para acompanhar o pedido,
no cabeçalho da requisição. A API expõe apenas nome, foto assinada, veículo,
placa, posição, precisão e ponto de destino. Não expõe observações internas,
e-mail ou identidade de autenticação do entregador.

Não há acesso anônimo direto às posições do banco. A resposta de rastreamento
usa `Cache-Control: private, no-store`. As fotos no bucket `admin-photos`
continuam privadas; o backend gera um link temporário para o pedido autorizado.

Ao concluir/cancelar ou trocar a atribuição, um gatilho limpa a última posição
do pedido. Ao parar o compartilhamento pelo botão, a página limpa o GPS e
solicita a limpeza no servidor. Se a internet estiver indisponível, o aplicativo
avisa que não conseguiu limpar o último ponto; esse ponto envelhece e aparece
como desatualizado. Não é armazenado um histórico de percurso nesta alteração.

## Limite do site no celular

Mantenha `/entregador` aberta, visível e com a tela ligada. O código tenta usar
Screen Wake Lock quando o navegador oferece suporte; isso não garante que o
sistema mantenha o processo em execução.

Ao bloquear a tela, trocar de aplicativo ou abrir Waze/Google Maps, o sistema
pode suspender a localização. Instalar como PWA também não garante GPS em
segundo plano. Para navegação externa e rastreamento contínuo confiável com a
tela bloqueada, o próximo passo é um aplicativo Android/iOS com permissão de
localização em segundo plano. Este pacote implementa o acompanhamento web.

## Busca ajustada

Focar a busca vazia ou usar seta para baixo não abre sugestões. Somente texto
não vazio mostra os produtos correspondentes. Exemplo: `coc` encontra Coca-Cola.
Limpar o texto recolhe as sugestões. A seleção pelo teclado continua disponível.

## Validação

Build de produção, testes direcionados de API/interface/GPS e testes SQL locais
com PGlite. Não foi feita migração em seu Supabase nem uma entrega real no
celular. Antes de usar com clientes, teste dois aparelhos: permita/negue GPS,
rode o mapa com um pedido atribuído, pare/retome, bloqueie a tela e conclua a
entrega para conferir a remoção da posição.
