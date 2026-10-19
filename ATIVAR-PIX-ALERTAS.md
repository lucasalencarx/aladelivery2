# Confirmação automática do Pix e avisos no admin

## Instalar

1. Faça backup do projeto atual.
2. No SQL Editor do Supabase, execute `sql/13-pix-alertas-admin.sql`. Requer os SQLs 08 a 12 que acompanham o projeto. Pode reexecutar o SQL13.
3. Copie o conteúdo deste pacote na raiz do projeto, mantendo as pastas `src`, `backend`, `public` e `sql`. Preserve seu `.env`. Não substitua o `.env` pelo exemplo.
4. Pare os processos antigos e execute `npm run dev` na raiz. Ele inicia backend e frontend. Outra opção: `npm start` para o backend e, em outro terminal, `npm run dev:frontend`. Não execute `commerce.js` separado.
5. Atualize o navegador, entre no admin e clique em **Ativar som**. Isso libera a reprodução no navegador; o botão também testa o áudio.

Não há novas dependências. O backend usa as mesmas chaves Supabase e Pagar.me que já estão no seu `.env`.

## Como o Pix passa a confirmar

O backend consulta os pedidos Pix pendentes no Pagar.me a cada 15 segundos, em lotes de até 25, priorizando os que estão há mais tempo sem consulta. Esse ciclo funciona sem o cliente abrir o site. Em filas grandes ou se o gateway estiver lento, o processamento pode levar mais de um ciclo. A rotina também inicia quando o servidor sobe, recuperando pendências do banco.

A confirmação exige uma consulta autenticada ao Pagar.me, com o mesmo identificador e valor do pedido. Ela grava o pagamento, avança a etapa e cria a mensagem automática e o aviso na mesma transação. Reenvios não criam pedidos, cobranças ou avisos duplicados.

Um pagamento anteriormente salvo como `paid` que tenha ficado na etapa `pending` também é recuperado. Falha na consulta não marca como pago nem libera estoque. Um Pix pago de um pedido já cancelado não reabre a entrega: a loja deve revisar o pagamento e eventual estorno no Pagar.me.

O servidor precisa continuar ligado e conectado ao banco e ao Pagar.me. O navegador do cliente pode ser fechado. Se o computador do backend desligar, as consultas param até ele voltar.

## Webhook para atualização assim que o Pagar.me avisar

No Pagar.me, configure os eventos **order.paid** e **charge.paid** para enviar POST para:

```
https://SEU-DOMINIO-DO-BACKEND/api/commerce/pagarme/webhook
```

Se frontend e API usarem o mesmo domínio com encaminhamento `/api`, use esse domínio. Não use `localhost` nem IP privado 10.x/192.168.x: o Pagar.me precisa acessar a URL pela internet. Na rede local, a consulta automática de 15 segundos continua funcionando sem webhook.

Ative as tentativas de reenvio no Pagar.me. O endpoint responde com erro temporário quando não consegue consultar o gateway ou quando o vínculo do pedido ainda não foi gravado. Ele usa o webhook apenas como sinal e consulta o Pagar.me antes de confirmar; não confia no `paid` enviado no corpo da requisição.

Referências oficiais:
- https://docs.pagar.me/reference/eventos-de-webhook-1
- https://docs.pagar.me/reference/exemplo-de-webhook-1
- https://docs.pagar.me/docs/webhooks

## Aviso no painel

O monitor aparece em todas as páginas do admin após o login. Cada pedido elegível gera um único aviso:

- Pix: depois da confirmação e entrada na etapa de produção.
- Dinheiro e cartão na entrega: ao registrar o pedido confirmado, sem esperar pagamento.
- Pix pendente: fica na aba Aguardando Pix e não dispara o aviso de preparo.

O modal inclui fotos e quantidades dos produtos, nome e telefone do cliente, endereço completo, observação, pagamento, taxa e total. **Ver pedido** abre os detalhes e chat. **Fechar** registra no banco que o aviso foi conferido, sem cancelar nem alterar a etapa do pedido. O botão X e Esc têm o mesmo efeito.

Os avisos são compartilhados pela loja: ao conferir em um painel, os outros painéis deixam de mostrar o mesmo aviso. Eles são exibidos em fila, um por vez. Se o painel estiver fechado, os avisos novos permanecem no banco e aparecem ao reabrir. Pedidos que já foram entregues/cancelados não precisam ser conferidos. Não é criada uma enxurrada de avisos para o histórico anterior à instalação do SQL13.

A atualização usa Supabase Realtime por uma conexão autenticada no backend e consulta de segurança a cada 5 segundos. O SQL13 adiciona a tabela à publicação Realtime quando ela existe. Se Realtime estiver indisponível, os avisos continuam chegando pela consulta periódica. Se houver erro, o monitor mostra a falha e tenta reconectar.

O painel precisa estar aberto para mostrar o modal e tocar som. Navegadores e celulares podem suspender abas em segundo plano; não é um serviço de push com navegador fechado.

## Colocar seu próprio áudio

O arquivo padrão já está em:

```
public/audio/novo-pedido.wav
```

Você pode substituir por outro arquivo WAV com o mesmo nome. Para usar MP3, coloque seu áudio em `public/audio/novo-pedido.mp3` e adicione ao `.env`:

```
VITE_ORDER_ALERT_SOUND=/audio/novo-pedido.mp3
```

Reinicie o Vite; em produção, gere e publique um novo build. Não basta renomear a extensão de um MP3 para WAV. Não coloque chaves ou dados privados nessa pasta: arquivos de `public` são públicos.

O som toca uma vez ao apresentar cada aviso, após clicar em Ativar som. Se o navegador bloquear, o painel mostra uma mensagem para ativá-lo novamente. O modal continua funcionando sem áudio.

## Conferência após instalar

1. Gere um Pix e deixe o pedido salvo.
2. Feche a página do cliente e mantenha o backend e o admin abertos.
3. Pague pelo banco. O servidor deve registrar o pagamento e o painel mostrar o modal; sem webhook, aguarde o ciclo de consulta.
4. Confira que o mesmo pedido não aparece novamente após Fechar e atualizar o painel.
5. Faça um pedido em dinheiro e confira o aviso imediato, com pagamento na entrega.
6. Teste o botão de som no equipamento que ficará na loja.

Validação de desenvolvimento: testes de banco para migração reexecutável, confirmação atômica e idempotente, valores divergentes, privacidade e fila de avisos; testes de webhook sem consulta do cliente, falha do gateway e reenvios; testes da rotina independente; testes do modal, fila, áudio bloqueado e falha ao fechar. Build de produção compilado. Pagamentos reais e entrega do webhook na sua conta não foram executados neste ambiente.
