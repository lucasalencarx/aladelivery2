# Checkout sem confirmação extra, CPF reutilizado e Pix independente do navegador

## Instalar

Copie as pastas deste pacote na raiz do projeto, preserve seu `.env` e reinicie `npm run dev`. Atualize a página no navegador.

Não há SQL novo. Se ainda não executou `sql/13-pix-alertas-admin.sql`, execute-o depois dos SQLs 08 a 12. Ele está incluído e pode ser reexecutado. É ele que permite a confirmação atômica do Pix, a rotina de verificação e os avisos no admin.

## Checkout

Foram removidos do checkout o bloco “Já comprou com a gente?”, o botão de confirmar telefone para benefícios e a recuperação por SMS. O reconhecimento de nome/endereço no mesmo aparelho continua. Benefícios já disponíveis em uma sessão confirmada continuam aparecendo automaticamente, sem convite de verificação no checkout.

## CPF apenas na primeira vez

Na integração Pix utilizada, o Pagar.me exige `customer.document`, além de nome, email e telefone. Referência oficial: https://docs.pagar.me/reference/pix-2

Na primeira compra, informe o CPF. Ele fica no campo privado `customer_document` do pedido no banco, acessível pelo backend. Nas próximas compras reconhecidas neste aparelho, o checkout informa apenas que os dados necessários já estão disponíveis: não mostra nem devolve o CPF completo ao navegador. O backend usa a credencial privada da compra anterior para copiar o documento ao novo pedido e gerar o Pix.

O perfil local guarda uma referência ao pedido, sem guardar o CPF. Se já havia uma compra Pix anterior à atualização, a credencial da última compra salva no aparelho pode permitir reaproveitar o CPF que já está no banco.

Se o navegador foi apagado/trocado e não há uma sessão do telefone confirmado nem o link privado anterior, será preciso informar o CPF novamente. Apenas digitar o número de outra pessoa não permite recuperar ou utilizar seu documento. O checkout não pede confirmação por SMS.

## Pagou no Nubank: não precisa voltar ao navegador

O backend já confirma sem depender da página do cliente, por dois caminhos:

1. Webhook: o Pagar.me avisa o backend; o backend consulta o pedido na API autenticada, confere identificador/valor e, se estiver `paid`, confirma o pedido e gera o aviso no painel.
2. Consulta automática: a cada 15 segundos, o backend busca os Pix pendentes no banco e consulta o Pagar.me, em lotes. Isso funciona mesmo sem webhook configurado, com o cliente fora do navegador. Filas grandes ou falhas do gateway podem levar mais de um ciclo.

Pagamento pendente não dispara aviso de preparo. Reenvios do mesmo pagamento não duplicam a confirmação nem o aviso.

O backend precisa ficar ligado. O painel admin precisa estar aberto para mostrar o modal e tocar o áudio. O navegador do cliente pode ser fechado. Se o admin estava fechado, os avisos permanecem no banco para quando ele abrir.

## Configurar o webhook na sua conta Pagar.me

Cadastre os eventos `order.paid` e `charge.paid` para enviar POST a:

```
https://SEU-DOMINIO-DO-BACKEND/api/commerce/pagarme/webhook
```

Ative tentativas de reenvio. Use o domínio onde sua API está acessível, com HTTPS. Se o site encaminha `/api` para o backend, pode usar o domínio do site. `localhost` e endereços privados como `10.0.0.103` não são alcançáveis pelo Pagar.me pela internet. Para testar webhook na rede local, use um túnel HTTPS configurado para o backend; a URL externa desse túnel é a que deve ser cadastrada.

Não foram alteradas as configurações da sua conta Pagar.me neste ambiente. Sem uma URL pública informada e acesso ao painel, o cadastro externo precisa ser feito por você. A consulta automática continua funcionando na rede local enquanto o Node estiver ligado.

Referências oficiais:
- https://docs.pagar.me/reference/eventos-de-webhook-1
- https://docs.pagar.me/reference/exemplo-de-webhook-1

## Conferir a versão instalada

Abra `http://localhost:3001/api/health` no computador do backend (ou a URL equivalente da API publicada). Esta versão retorna:

- `version`: `commerce-v3-cpf-reuse`
- `paymentPollSeconds`: `15`
- `paymentSyncConfigured`: `true` se as chaves exigidas estiverem configuradas no servidor
- `webhookPath`: `/api/commerce/pagarme/webhook`

Isso confere a configuração das variáveis, não garante que as chaves estejam válidas nem que o SQL tenha sido aplicado. Se aparecer uma versão anterior, encerre o backend antigo e inicie o atualizado. Não execute `commerce.js` separado.

Teste final: gere um Pix, feche a página do cliente, mantenha o backend e o admin abertos e pague no banco. O pedido deve confirmar e aparecer no modal sem reabrir a página do cliente.

## Validação

50 testes de interface/backend e build de produção aprovados. Incluem remoção dos convites de verificação, campo CPF oculto quando disponível, geração usando documento no servidor, reutilização entre pedidos com credencial privada, bloqueio para outro telefone, webhook sem consulta do cliente, reenvios e indisponibilidade do gateway. Nenhuma cobrança real ou configuração no painel Pagar.me foi feita neste ambiente.
