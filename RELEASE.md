# CashVault — Unreleased

## Features
- **Feature:** mais opções de tema escuro em Configurações → Aparência. O padrão "Escuro" agora é uma paleta cinza neutra ("Slate Graphite") com destaque ciano; o roxo de antes continua disponível como tema separado, renomeado para "Violet Dark"; e tem também um novo tema "Midnight Blue" (azul). O destaque (botão primário, valores em foco, gráficos) muda de cor de acordo com o tema ativo.
- **Feature:** Dashboard ganhou um card "Compra principal" ao lado do "Meta principal", mostrando a primeira compra futura cadastrada (mesmo padrão visual, progresso vs saldo acumulado).
- **Feature:** os gráficos de pizza "Entradas/Saídas por tag" agora mostram o total no centro do donut; valores acima de R$ 10.000 aparecem abreviados ("R$ 12,3k", "R$ 1,2mi") pra caber no espaço.

## Fixes
- **Fix:** card "Lucro do mês" no Dashboard tinha cor de fundo fixa (hex do tema escuro) que não mudava no tema claro.
- **Fix:** textos em amarelo no Dashboard (alerta de conta pendente, "despesas previstas", "faltam para a meta") ficavam praticamente ilegíveis no tema claro — trocados de `amber-200`/`amber-300` para `amber-600`.
- **Fix:** títulos dos cards e labels de mês/variação percentual no Dashboard estavam com fonte pequena demais comparado ao menu lateral.

---

# CashVault — v0.2.0

## Features
- **Feature:** seção "Backup" em Configurações — escolha uma pasta e o app copia automaticamente o `.db` pra lá (sobrescrevendo o backup anterior) toda vez que o app é aberto, com opção de trocar a pasta ou desativar o backup automático; também é possível importar um arquivo `.db` escolhido para restaurar o banco (substitui todos os dados atuais, pede confirmação antes e reinicia o app sozinho depois de importar).
- **Feature:** botão "Importar CSV" em Movimentações, ao lado do "Exportar CSV" — lê o mesmo formato que a exportação gera e cria os lançamentos no perfil atual, tolerando CSV editado no Excel em pt-BR (separador `;`, valor com vírgula decimal, data `dd/mm/aaaa`); linhas inválidas são puladas e reportadas, sem travar o restante da importação.
- **Feature:** dois gráficos de pizza no Dashboard — "Entradas por tag" e "Saídas por tag" do mês selecionado. Lançamentos sem tag aparecem como "Sem tag"; a partir da 6ª tag as demais são somadas em "Outros" pra não poluir o gráfico.

---

# CashVault — v0.1.1

## Features
- **Feature:** tecla Esc agora fecha qualquer modal aberto (Nova entrada/saída, Conta, Marcar como paga, Meta/compra futura, Parcelas), igual ao clique no ✕/fora.
- **Feature:** fechar um modal com alterações não salvas (Esc, clique fora ou ✕) agora pede confirmação antes de descartar os dados — vale para Nova entrada/saída, Conta, Marcar como paga e Meta/compra futura.
- **Feature:** seletor de tags em Nova entrada/saída agora mostra só as mais usadas (top 8) com um botão "+" pra buscar entre as demais ou criar uma tag nova na hora, sem precisar sair do modal.

## Fixes
- **Fix:** compras parceladas nunca conseguiam ser salvas — a primeira parcela violava a CHECK constraint da tabela `transactions` (`installment_group_id` ficava `NULL` enquanto `installment_index`/`installment_count` já vinham preenchidos).
- **Fix:** tela de Movimentações não tinha a linha divisória entre lançamentos que já existia em Contas, Tags e Metas/Compras futuras.
- **Fix:** todo diálogo de confirmação do app (excluir conta, tag, lançamento, grupo de parcelas ou perfil) usava `window.confirm()`, que não funciona nesse WebView — a ação seguia direto sem pausar pra confirmação nenhuma. Trocado por um modal de confirmação próprio (`ConfirmModal`), no mesmo estilo visual do resto do app.

---

# CashVault — v0.1.0

## Features
- **Feature:** multi-perfil, com perfil ativo lembrado entre reinícios e troca/criação/exclusão em Configurações.
- **Feature:** lançamentos de entrada e saída, à vista ou parcelado (compra parcelada gera N lançamentos mensais reais, com edição/exclusão por parcela ou pelo grupo inteiro).
- **Feature:** Dashboard com saldo/lucro/movimento do período, gráfico de fluxo, meta principal e aviso de contas pendentes.
- **Feature:** tela de Movimentações com filtro por ano/mês/tags e exportação CSV respeitando o filtro atual.
- **Feature:** contas recorrentes (mensais/anuais) com status derivado da existência de lançamento pago no período.
- **Feature:** metas de longo prazo e compras futuras, com progresso sempre vs saldo total acumulado do perfil (sem reset anual).
- **Feature:** tags N-pra-N nas movimentações, com filtro por múltiplas tags (OR) e gerenciador de tags.
- **Feature:** tema claro/escuro e logger em arquivo, acessível via Configurações → Diagnóstico → Abrir pasta de logs.
