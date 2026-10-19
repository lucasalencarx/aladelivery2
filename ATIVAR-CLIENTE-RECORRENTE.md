# Cliente recorrente no checkout

Na primeira compra, informe nome e endereço. Ao registrar o pedido, esses dados ficam salvos no aparelho, associados ao telefone.

Na compra seguinte, informe o telefone e toque em Continuar: o checkout reaproveita nome/endereço e abre a revisão. É possível alterar antes de pagar. Se o bairro não for mais atendido, o endereço é aberto para corrigir, usando as taxas atuais.

Não há convite de confirmar telefone nem recuperação por SMS no checkout. Quem tiver sessão do telefone já confirmada em Meus pedidos pode recuperar os dados do banco automaticamente; quem tiver o link privado da última compra no aparelho também pode ser reconhecido. Sem essas credenciais, preencha os dados normalmente.

O CPF para Pix fica no servidor e é reutilizado nas próximas compras reconhecidas, sem exibir o documento no checkout. Consulte ATIVAR-CPF-WEBHOOK.md para os detalhes.

Copie a atualização na raiz do projeto, preserve o .env e reinicie npm run dev. Não há SQL novo além das migrações anteriores; SQL13 continua necessário para Pix e alertas no admin.
