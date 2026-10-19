# Revisão da loja — 18/10/2026

## Marcas sem caixas e rodapé da loja
- Retiradas bordas, fundos e caixas individuais da faixa Marcas que amamos. Mantidos logos, contadores, clique e rolagem. Espaçamento ajustado ao catálogo.
- Rodapé agora contém nome, slogan, CNPJ, endereço, horário, contato e informações de compra. Retiradas as dúvidas de cupom e o bloco de pedidos do rodapé.
- “Ver loja no mapa” abre o Google Maps com o endereço completo cadastrado em Administração → Configurações. Não usa endereço fictício. Sem endereço cadastrado, não mostra um mapa incorreto.
- Removidos os espaços acumulados entre catálogo e rodapé e após o rodapé. Há uma única reserva para a barra fixa inferior não cobrir o conteúdo.
- Build e 106 testes aprovados; sem SQL novo.


## Correção ao salvar logomarca
Corrigido envio indevido de active_products_count, products_count e products ao banco. São contadores calculados, não colunas de brands. Formulário e serviço agora enviam somente os campos editáveis da marca. Não crie essas colunas nem execute SQL para resolver esse erro. Atualize o frontend e gere o build.


## Revisão de pedidos, identificação e retomada do carrinho
- Meus pedidos apresenta os resumos já salvos neste navegador imediatamente e atualiza cada resposta assim que chega, sem esperar todo um lote de pedidos.
- A consulta de listagem usa GET /orders/:id?summary=1 com o mesmo token privado: não busca conversa/eventos e não espera o gateway Pix. O acompanhamento completo continua disponível ao abrir o pedido; pagamento continua sendo confirmado no servidor.
- Fechar checkout volta a etapa para identificação e descarta o estado local de pagamento. Reabrir primeiro exibe os itens do carrinho. O checkout não restaura automaticamente uma tela antiga de Pix sem os dados de entrega.
- Pedido Pix registrado aparece separado no carrinho com “Ver pedido e continuar pagamento”. O link abre o pedido e seu Pix original. “Iniciar outra compra” é uma escolha explícita para uma nova compra; não cancela o pedido anterior, que continua acessível em Meus pedidos. Não pague dois pedidos se só deseja uma compra.
- Respostas que chegarem depois de fechar não podem reabrir o checkout. Uma confirmação só limpa o carrinho se os itens ainda corresponderem à compra enviada, preservando produtos novos. Pedido registrado ainda pendente conserva o link privado mesmo se a geração do QR atrasar.
- Telefone: sugestões de clientes salvos voltam a aparecer na identificação. Toque no nome/número para continuar. Se não houver perfis locais, tenta recuperar os dados da última compra com o link privado deste aparelho. Dados apagados do navegador não podem ser sugeridos sem recuperação autorizada.
- Reconhecimento do cliente não espera a consulta de CPF. Nome e endereço aparecem primeiro; a recuperação do documento para Pix segue em segundo plano.
- Rua, número, cidade, bairro, telefone, nome e itens são conferidos antes de registrar o pedido. O backend também rejeita endereço incompleto e impede gerar Pix de pedido sem endereço completo. Validação de área de entrega, estoque e preços continua no servidor.
- Botão de finalizar bloqueia envios repetidos enquanto registra o pedido. Chaves de idempotência são preservadas na tentativa e renovadas na compra concluída/nova, sem reaproveitar pedido anterior silenciosamente.

### Aplicar esta revisão
Atualize frontend E backend deste ZIP. Execute npm install, npm run build e reinicie seu servidor backend (ou o processo npm run dev durante desenvolvimento). A consulta leve depende do backend atualizado. Não há SQL novo nesta revisão; mantenha as migrações/configurações anteriores do projeto.

### Validação desta revisão
Build de produção aprovado, 103 testes de interface/integração em 28 arquivos, 3 testes de regras comerciais e testes do banco com migrações 08–17 aprovados. Regressões incluem fechar durante geração do Pix, voltar com outro produto, endereço incompleto, resposta tardia sem reabrir o modal, sugestão de telefone sem aguardar CPF, listagem por respostas parciais, cache privado e endpoint leve autenticado.
Não houve teste com pagamento real, aparelho físico ou medição de desempenho em produção. A atualização usa dados salvos enquanto consulta o estado mais recente; a rede ainda pode afetar o tempo de atualização.


## Ajuste dos títulos das seções
Restaurados os ícones simples originais nos títulos Recomendados, Vinhos, Águas e demais divisões da vitrine. Menu horizontal e administração das capas mantidos.

## Terceira revisão: estabilidade do cupom e troca de capas
- Menu agora em fundo branco com itens discretos e seção selecionada em amarelo arredondado; removido o degradê anterior. Mantém rolagem lateral.
- Removido o ciclo de eventos de scroll do VisualViewport com scrollIntoView. O ajuste aguarda 200 ms após estabilizar o teclado e move somente a área interna do checkout quando o campo está cortado; nunca força o scroll da página. Os passos e campos de cupom também deixam de usar transformações/animações durante a digitação.
- Aplicar cupom mostra estado de carregamento e bloqueia envio duplicado. Enter também aplica o código.
- Miniaturas das categorias fixas em 48 × 48 px (lista e exploração), prévia de edição em 60 × 60 px. Corrigida a regra de largura 100% que fazia a capa expandir na tabela.
- Categorias → editar → Trocar foto de capa: selecione JPG/PNG/WebP de até 5 MB e salve. Também é possível usar a URL ou voltar à imagem padrão. O envio usa a mesma estrutura de mídia já existente do projeto (store-media e shop_media), sem SQL adicional além da configuração anterior.
- Build e 94 testes aprovados em 26 arquivos; inclui envio/persistência da capa e regressão do ciclo de scroll. Ainda requer validação visual em iPhone/Samsung físicos.

## Segunda revisão: menu, teclado e categorias
- Menu contínuo, sem caixas: fundo em degradê creme/amarelo claro, letras cinza e preto e sublinhado dourado na seção ativa. Mantém rolagem lateral.
- Botões de continuar/finalizar deixam de ficar sobrepostos aos campos; seguem a rolagem do conteúdo. O carrinho acompanha a altura disponível quando o teclado abre usando VisualViewport; o campo em foco é mantido visível. O zoom manual não é bloqueado.
- Categorias na administração ganham fotos do catálogo ou ilustrações vetoriais locais. URL personalizada tem prioridade, imagem automática aparece quando vazia, e falhas de imagem têm alternativa local. Imagens também aparecem nos títulos das seções da vitrine.
- Clique no nome ou no contador da categoria para explorar seus produtos, buscar e filtrar ativos/inativos e conferir preço e estoque. “Editar” abre o cadastro do produto. “Gerenciar esta categoria” abre a lista filtrada; “Adicionar produto” já seleciona a categoria. Categorias inativas também podem ser administradas.
- Sem migração SQL nova. As imagens automáticas são resolvidas pela interface; não é necessário gravar URLs manualmente em todas as categorias.
- Validação desta revisão: build aprovado e 93 testes de interface aprovados em 26 arquivos, incluindo navegação/edição por categoria, fallback de imagens e eventos de abertura do teclado. Nenhum pagamento ou teste em aparelho físico foi feito.


## O que mudou
- Confirmação de 18 anos sem a frase sobre documento/identidade.
- Busca e toque no produto mantêm o seletor de quantidade. Adicionar fecha os detalhes e, após a animação, abre o carrinho. Fechar o carrinho exibe a confirmação de inclusão por 4,5 segundos.
- Campos com fonte de 16px para evitar zoom automático no iPhone. Zoom manual continua permitido. Cupom tem largura flexível e altura estável, sem expandir ao receber foco.
- Navegação por seções em botões retangulares discretos, mantendo a rolagem lateral.
- Marcas sem moldura externa, com o coração e separador das seções, rolagem manual por toque/arraste, setas e avanço automático pausado ao interagir.
- Mais 10 logomarcas locais. A imagem cadastrada no admin tem prioridade. Sem logo, usa foto de um produto associado ou do catálogo incluído; se nenhuma imagem existir, usa iniciais. Não foram inventadas logomarcas oficiais. Veja public/brands/FONTES.md.
- Rodapé com acesso a pedidos e dúvidas sobre entrega e cupom.
- Compra confirmada limpa imediatamente o carrinho e a sessão de compra concluída; não exige clicar no último botão. Pedido permanece no histórico. Pix pendente continua recuperável para não perder uma cobrança em andamento.
- Cadastro de produtos com campo “Desconto no card (%)”, que preenche o preço promocional. Também é possível continuar informando o preço promocional diretamente.

## Como colocar desconto
Administração → Produtos → editar produto.
Informe preço de venda e porcentagem em “Desconto no card (%)”, ou preencha “Preço promocional”. Salve.
Exemplo: R$ 10,00 e 20% resultam em R$ 8,00. O card calcula o selo automaticamente. O percentual visível é arredondado ao inteiro; preços usam centavos.

## Como montar a loja dado por dado
A estrutura atual é adequada para este projeto: React cuida da loja, Supabase mantém catálogo e dados, e o backend registra pedidos e integra pagamentos. A criação de pedidos já confere preços e estoque no servidor.
Use o painel nesta sequência: categorias → marcas/imagens → produtos/preços/estoque → seções/vitrines → ordem dos produtos → configurações e banners. Assim não precisa alterar o código a cada produto novo. “Seções e vitrines” já permite selecionar e ordenar os produtos.
Esta revisão cobriu os fluxos e testes existentes; não equivale a uma auditoria completa de segurança ou pagamentos em produção. Uma manutenção futura útil é dividir CheckoutDrawer.jsx em componentes menores, pois concentra muitas responsabilidades; não é necessário trocar a tecnologia para continuar cadastrando os dados.

## Instalação
Substitua o código pela pasta deliverybeer deste ZIP, preserve suas configurações locais, execute npm install e npm run build. O backend continua usando npm run backend. Nenhuma migração SQL nova é necessária para esta revisão; as migrações anteriores do seu projeto continuam necessárias.
O ZIP não contém node_modules, build gerado nem os antigos ZIPs de backup internos; o código atual, imagens, scripts, testes e configurações foram mantidos.

## Validação
- Build de produção concluído.
- 24 arquivos de testes de interface, 89 testes aprovados.
- 3 testes de regras comerciais aprovados.
- Testes de banco com migrações 08–17 aprovados.
- Novas verificações cobrem quantidade, abertura do carrinho, duração do aviso e limpeza persistida após compra.
- iPhone/Samsung físicos e pagamentos reais não foram testados neste ambiente. Recomenda-se conferir uma compra de teste nos aparelhos antes de publicar.
- Build mantém um aviso preexistente sobre importação estática/dinâmica de Supabase; não impede a geração.
