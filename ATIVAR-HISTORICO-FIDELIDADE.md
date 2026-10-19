# Histórico, Pix pendente e fidelidade

Esta atualização acrescenta recuperação de pedidos por telefone, filtros, retomada de Pix, ranking e descontos pessoais. O banco continua sendo a fonte do histórico; os dados do navegador apenas facilitam o acesso neste aparelho.

## Instalação

1. Faça backup do código e do banco. Use o projeto completo atualizado ou aplique todos os arquivos do pacote desta atualização, incluindo o backend e componentes compartilhados.
2. Execute `sql/12-historico-fidelidade.sql` inteiro no SQL Editor do Supabase, depois dos SQLs anteriores (08 a 11).
3. Preserve seu `.env`. Mantenha configuradas a chave de servidor Supabase e a chave Pagar.me.
4. Encerre a execução anterior e reinicie `npm run dev`. Em produção, publique o novo build e reinicie o Node. Esta mudança tem código de servidor e não funciona substituindo somente a pasta admin.
5. Para recuperação por SMS, habilite autenticação por telefone no Supabase Auth e configure um provedor de SMS. Ajuste os limites de envio e teste o número antes de disponibilizar. A aplicação chama signInWithOtp/verifyOtp; não contém credenciais de provedor SMS e não ativa nenhum serviço externo por conta própria.

Documentação oficial: https://supabase.com/docs/guides/auth/phone-login

O cliente não preenche um cadastro com senha. Ao confirmar o telefone, o Supabase cria/utiliza o registro de autenticação correspondente. Essa sessão é separada do login administrativo.

## Pix pendente e atendimento

- A aba inicial **Pedidos confirmados** lista Pix pagos e pedidos em dinheiro/cartão na entrega, exceto cancelados. Também inclui entregues; use o filtro de etapa para limitar a operação.
- Pix ainda não pago fica em **Aguardando Pix**. Ele não entra no conjunto novo de indicadores operacionais nem nos últimos pedidos do dashboard.
- **Todos / histórico** permite consultar também cancelados e pendentes. Os filtros Hoje, Último mês, 3 meses, 1 ano e Todo o histórico são aplicados no servidor, com paginação de 30 registros. Hoje usa o fuso America/Sao_Paulo.
- Esta versão não adiciona alerta sonoro, notificação push ou disparo WhatsApp. A lista atualiza automaticamente. Pedidos da tabela antiga aparecem no histórico quando contêm telefone/data, com detalhes e impressão, sem chat/retomada de Pix antigos.
- O cliente abre **Pedidos** e, para os pedidos atuais, pode ver novamente QR Code e código copia e cola enquanto o Pix estiver válido. Se o QR não chegou a ser gerado, há um botão para gerar o Pix daquele pedido persistido.
- Se o Pix vencer, a tela informa que o código não deve ser pago. Não é criada outra cobrança silenciosamente. O cliente pode conversar com a loja/refazer a compra.
- Enquanto o Node estiver rodando, uma rotina a cada minuto revisa até 20 tentativas Pix com mais de 17 minutos, consultando o Pagar.me antes de cancelar reservas vencidas. A expiração real do QR e uma tolerância de 2 minutos são respeitadas. Se a consulta ao gateway falhar, a reserva é mantida para revisão posterior. Tentativas sem vínculo de cobrança são encerradas por abandono após esse prazo.
- Cancelar devolve estoque e libera o uso do cupom uma única vez pela transação já existente. Não significa estorno automático. Pix tardio de pedido cancelado segue exigindo conciliação/estorno pela loja.

## Recuperação de histórico

Em `/pedidos` há dois caminhos:

1. **Pedidos neste aparelho:** acessa até 20 links privados que ainda estiverem guardados no navegador, sem SMS.
2. **Histórico completo pelo telefone:** envia código SMS e consulta o histórico somente após confirmar posse do número. Funciona em outro aparelho e após apagar localStorage/cache.

Digitar telefone sozinho não libera endereço, produtos ou pagamentos. O backend confere o token Supabase e usa o telefone confirmado retornado pelo servidor de autenticação; ignora telefones arbitrários enviados na URL.

As tabelas `shop_orders` e a antiga `orders`, quando existir, são unificadas em uma visão privada de histórico. Números brasileiros formatados ou com +55 são normalizados. Registros antigos sem telefone não podem ser vinculados automaticamente; registros sem data válida precisam ser revisados na base. Pedidos antigos mantêm apenas consulta/impressão e não recebem chat ou Pix recuperável retroativamente.

Não há mecanismo que recupere pedidos depois de apagá-los do banco: o recurso resolve a perda dos dados do navegador.

## Quem mais compra

No admin → **Quem mais compra**:

- Ranking top 10 por quantidade de pedidos pagos, com desempate pelo valor total comprado.
- Filtros Hoje, 1 mês, 3 meses, 1 ano ou todo o histórico.
- Pagamentos ainda pendentes e pedidos cancelados não contam. Dinheiro/cartão só contam depois de confirmar o recebimento. O ranking inclui registros compatíveis da tabela antiga.
- Edite regras de fidelidade e habilite/desabilite a campanha.
- **Disponibilizar benefício** permite antecipar o benefício daquele marco para um cliente do ranking. O botão não envia mensagem externa.

## Desconto automático

Regra inicial editável: a cada 5 pedidos pagos, um benefício de 5%, limitado a R$ 10, com pedido mínimo de R$ 30 e validade de 30 dias.

O benefício é pessoal e emitido uma única vez por marco de compras. O sistema o disponibiliza quando o cliente consulta os benefícios com o telefone confirmado, ou quando a loja usa o botão do ranking. Em uma base antiga com muitos pedidos, é oferecido o marco atual, sem gerar uma coleção retroativa de cupons.

No checkout, a seção de fidelidade permite confirmar o telefone e mostra o desconto com o motivo. Se já houver sessão do mesmo número e o pedido atender ao mínimo, o cupom é aplicado automaticamente ao resumo. Não substitui um cupom diferente já escolhido; não acumula dois cupons. A mensagem verde confirma quando o benefício está efetivamente aplicado. Se ficar abaixo do mínimo ou mudar o telefone, o benefício aplicado é removido.

O servidor valida a posse do telefone para resgatar o cupom. Saber o código de um benefício de outra pessoa não permite utilizá-lo. O cupom tem um uso; pedido Pix pendente reserva o uso, e cancelamento libera a reserva. Cupons já emitidos mantêm percentual, teto e validade originais ao alterar a campanha. Para suspender um emitido, use a gerência de cupons.

## Tabelas e funções

Novas tabelas: `shop_loyalty_settings` e `shop_loyalty_rewards`. A tabela `discount_coupons` recebe `customer_phone`. A visão `shop_order_history` é privada, sem acesso público direto.

Novas funções de listagem, ranking, benefício e criação conferida são executáveis somente pelo servidor. O cliente vê seus dados por rotas autenticadas; o admin continua usando o controle administrativo existente.

## Validação

Verificados: execução/reexecução da migração; separação de pendentes; filtros e histórico próprio; compatibilidade com pedidos/itens antigos; ranking; emissão única e reserva/liberação de benefício; bloqueio de resgate com telefone diferente; autenticação de histórico por HTTP; restauração privada do Pix; cancelamento após consulta ao gateway; OTP e aplicação de benefício com respostas simuladas; suíte anterior e build.

Não foram enviados SMS reais, feitas cobranças reais ou executada a migração no seu Supabase. Configure o provedor e teste o fluxo completo com sua conta de testes antes de publicar.
