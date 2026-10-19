# Atualização do admin — operação, configurações e vitrine

Esta versão foi construída sobre o admin-17out.zip enviado, mantendo o restante do projeto e a integração Pix existente.

## Instalar

1. Guarde uma cópia do projeto atual e do banco.
2. Execute `sql/14-admin-operacao-configuracoes.sql` no SQL Editor do Supabase, depois dos SQLs 08 a 13. Pode reexecutar o SQL14. Ele não apaga pedidos nem cadastros.
3. Se usar **admin-17out.zip**: copie `admin/`, `components/`, `services/`, `utils/` e `storefront/` para dentro de `src/`, mantendo a estrutura. Copie `backend/` e `public/` para a raiz do projeto. A pasta `sql/` serve para aplicar as migrações.
4. Se usar **deliverybeer-15outubro.zip**, ele contém o projeto completo atualizado, com os mesmos arquivos já nas pastas corretas. Não é necessário aplicar os dois pacotes.
5. Preserve seu `.env`. Não há novas chaves nem dependências. Reinicie `npm run dev` e atualize a página. Em produção, gere e publique o novo build e reinicie o backend.
6. Entre no admin → Configurações. Preencha os dados da loja, envie logo/banners e salve. No header, abra a área de funcionamento e confira horários e modo de operação.

O webhook continua na mesma rota. Não é necessário alterar a URL do ngrok por causa desta atualização. Backend e túnel devem continuar ligados.

## Header e funcionamento

Há uma única área de controle, no header. Ao abri-la, você pode:

- Abrir/fechar manualmente pela alavanca; esse modo prevalece até reativar o automático.
- Configurar abertura e fechamento, inclusive atravessando a meia-noite.
- Reativar o horário automático.
- Definir a mensagem de loja fechada.

O fuso utilizado é **America/Campo_Grande**, de Corumbá e Ladário. Horários iguais significam funcionamento por 24 horas. A configuração é salva no banco e a vitrine consulta o estado efetivo. Novos pedidos são bloqueados no servidor quando a loja está fechada, mesmo sem o admin aberto. Retomar pedidos já registrados continua permitido.

Foi removido do dashboard o antigo card que apenas alterava o estado da tela e mostrava data fixa. O menu Loja direciona para Configurações; não há outro controle independente de abertura.

## Dashboard e atendimento

- Indicadores de pedidos e receita paga, com olhinho para ocultar valores; a preferência fica salva no navegador do administrador.
- Resumo de pedidos novos, em preparo, em entrega e aguardando Pix.
- Últimos pedidos com fotos e quantidades, endereço, pagamento, detalhes, impressão e WhatsApp pequeno com ícone próprio e verde.
- Mensagens de clientes com contador vermelho no header e lista no dashboard. Clicar leva ao pedido/chat.
- Ao abrir a conversa visível no admin, as mensagens de cliente carregadas são marcadas como lidas. Novas mensagens voltam a acender o contador. A leitura é compartilhada pela equipe da loja.
- Alerta de produtos ativos com estoque de até cinco unidades, para facilitar reposição.
- As telas de Usuários e Logs foram retiradas do menu e das rotas de gestão. Nenhuma conta administrativa ou registro no banco foi apagado.

O resumo se atualiza a cada cinco segundos. A conexão de eventos do backend também sinaliza novos pedidos e mensagens para antecipar a atualização; consultas periódicas cobrem falhas de conexão. O painel precisa estar aberto para exibir avisos. O som de novos pedidos continua no botão Ativar som.

## Configurações que aparecem no site

Nome da loja, slogan, logo, endereço público, CNPJ, WhatsApp e aviso são persistidos em `shop_store_settings`. A logomarca aparece no header da vitrine e no menu administrativo; nome/slogan/endereço/CNPJ aparecem nas informações públicas e rodapé. O aviso aparece acima da vitrine.

As configurações públicas são lidas por uma função própria; não é concedido acesso público às tabelas administrativas. A vitrine busca alterações a cada 30 segundos; atualizar a página também carrega a nova configuração.

## Slider de três banners

Os três espaços são editáveis em Configurações, na ordem de exibição. O slider continua alternando automaticamente. Imagem vazia usa o banner original daquele espaço, evitando deixar a vitrine sem imagem.

Sugestão: **1600 × 500 px (3,2:1)**, JPG ou WebP, até 5 MB. Mantenha texto e produtos principais na região central, pois o recorte varia com a largura da tela. Use descrição para cada banner.

## Biblioteca de fotos

O botão Enviar foto aceita JPG, PNG e WebP até 5 MB. O arquivo vai para o bucket público `store-media` e é registrado em `shop_media`. Depois, use “Usar esta foto” para selecionar o produto que a receberá. A associação muda apenas a foto, preservando preço e estoque.

Fotos de logo e banners enviadas pelas configurações também entram nessa biblioteca. Os arquivos são públicos e devem conter somente material de divulgação da loja/produtos. Os álbuns antigos importados continuam disponíveis.

## Visitantes

A vitrine registra um identificador aleatório de navegador, sem registrar IP, telefone ou nome na tabela de visitas. Uma visita por navegador/dia é contabilizada no horário local de MS. O total conta identificadores distintos.

É uma aproximação de navegadores, não uma contagem exata de pessoas: limpar dados ou trocar de aparelho cria outro identificador. A contagem começa após instalar esta versão; não inventa histórico anterior. Ela exige backend funcionando. Não é rastreado acesso às telas administrativas.

## Avaliações após a entrega

Na página privada do pedido entregue, o cliente pode enviar de uma a cinco estrelas e comentário opcional. O servidor exige o token privado e verifica que o pedido foi entregue. Existe uma avaliação por pedido, que pode ser atualizada pelo cliente.

No admin → Avaliações, a loja acompanha as notas e comentários e pode registrar uma resposta. O dashboard mantém apenas um resumo discreto, fora dos cartões operacionais. Os registros antigos de `customer_reviews` não foram apagados; a nova tela se concentra nas avaliações ligadas às entregas de `shop_order_reviews`.

**Gorjetas:** esta atualização não cria cobrança de gorjeta, nem simula valores recebidos. Essa integração financeira ainda precisa ser implementada separadamente.

## Validação e limites

Passaram 61 testes de interface/backend, os testes de banco com migrações 08–14 e três testes adicionais das regras de carrinho, além do build de produção.

Foram conferidos: horário de MS, fechamento após meia-noite, bloqueio de pedido com loja fechada, reexecução da migração, acesso público restrito às configurações, privacidade dos pedidos, visitante sem duplicação no dia, mensagens lidas/novas, avaliação apenas com credencial e entrega concluída, controle único no header, ocultação de receita e gravação das configurações/logo.

Os testes de interface são automatizados em DOM simulado. A migração não foi executada na sua conta Supabase e o envio real de imagens, pagamento e webhook devem ser conferidos na sua instalação após aplicar os arquivos.
