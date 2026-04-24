# Melhorias planejadas — Gastô

## 1. ✅ Score financeiro mensal
Card em Relatórios com nota 0–100 calculada sobre: taxa de poupança (40 pts), orçamentos respeitados (35 pts) e meta de economia (25 pts). Sem servidor, 100% SQLite.

## 2. ✅ Análise de padrões
Insights automáticos gerados por queries SQL: crescimento de categoria vs mês anterior, gasto maior em fins de semana, total de assinaturas recorrentes, tendência de 3 meses. Card em Relatórios.

## 3. ✅ Metas por objetivo
Tela `goals.tsx` — objetivos com nome, emoji, valor-alvo, valor atual e prazo. Barra de progresso, aporte mensal necessário calculado automaticamente. Armazenado na tabela `objetivos` do SQLite. Acessível via botão "🏆 Objetivos" em Relatórios.

## 4. ✅ Calculadora de independência financeira
Seção adicional no simulador — usa gastos médios reais dos últimos 3 meses para calcular o patrimônio-alvo (regra dos 4%) e estima em quantos anos o usuário chegaria à independência financeira com o aporte atual.

## 5. ✅ Comparativo inflação real
Em "Por categoria" nos Relatórios: indica se cada categoria cresceu acima ou abaixo do IPCA do período. Usa IPCA ao vivo da API BCB e histórico do SQLite. Exibido inline na barra de cada categoria.

## 6. ✅ Modo desafio semanal
Tela `challenge.tsx` — desafios gerados automaticamente a partir do gasto médio semanal por categoria dos últimos 28 dias. Usuário aceita, app monitora o progresso e verifica conclusão ao fim da semana. Tabela `desafios` no SQLite.

## 7. ✅ Importar extrato CSV de banco
Tela `import-csv.tsx` — aceita CSV de qualquer banco (vírgula ou ponto-e-vírgula, datas em múltiplos formatos). Classifica cada linha automaticamente com o `classifier.ts` offline. Usuário revisa e seleciona o que importar antes de salvar.

## 8. ✅ Widget Android
`SaldoWidget.kt` — widget nativo Android que lê o SQLite diretamente e exibe o saldo do mês (entradas − despesas) na tela inicial. Toque abre o app. Atualiza a cada 30 minutos. Registrado no `AndroidManifest.xml`.

---

*Legenda: ✅ Concluído · 🚧 Em andamento · ⬜ Pendente*
