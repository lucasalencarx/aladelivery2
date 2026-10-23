# Correção do cadastro por telefone

O checkout agora consulta o servidor pelo telefone quando não há perfil no navegador. Recupera nome e endereço da compra mais recente não cancelada. A busca aceita DDD, máscara e prefixo +55. Não retorna CPF, credenciais, histórico ou pagamento.

## Aplicar

1. Atualize os arquivos do projeto, incluindo backend/commerce.js e src/services/checkoutProfile.js.
2. Reinicie o backend e atualize a publicação do frontend (npm run build).
3. Em desenvolvimento, reinicie npm run dev.
4. Não é necessário executar SQL.

## Testar

Abra uma janela anônima, coloque o telefone de uma compra anterior e aguarde a consulta. Nome e endereço deverão aparecer. Confira o endereço antes de finalizar.

A recuperação entre aparelhos exige uma compra registrada em shop_orders. Dados somente digitados e salvos no navegador não ficam disponíveis no servidor. Em falhas da API, o checkout avisa que não conseguiu consultar, sem afirmar que não existe cadastro.

A busca de entrega por telefone funciona sem confirmação do número, conforme solicitado; portanto, quem souber um telefone poderá recuperar seu nome e endereço de entrega. CPF, links privados e histórico continuam protegidos.

Validação: 41 testes de checkout, recuperação e backend aprovados; compilação de produção aprovada. Banco de produção não acessado.
