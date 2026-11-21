# Basquete Gouveia Play

Central de análise esportiva para NBA, futebol e tênis: placar ao vivo, calendário completo, resultados históricos e estatísticas de todos os mercados. Os dados são reais e vêm da ESPN.

## Estrutura

```
index.html                 Estrutura da página (cabeçalho, abas, menu inferior)
css/styles.css             Identidade visual: preto/azul-marinho, laranja principal
api/espn.js                Função serverless (Vercel) que consulta a ESPN com cache
js/app.js                  Inicialização
js/router.js               Navegação entre telas e abas
js/state.js                Estado e preferências (localStorage)
js/config.js               Esportes e competições
js/utils.js                Datas e formatação
js/services/espn.js        Busca e normalização dos dados (placares, odds, box scores)
js/services/live-updater.js  Placar ao vivo: atualiza jogos em andamento a cada 30 s
js/ui/icons.js             Ícones SVG
js/ui/components.js        Linhas de jogo, seletores, listas
js/views/home.js           Início: faixa de datas, últimos resultados, destaque
js/views/calendar.js       Calendário por dia, mês e ano
js/views/results.js        Resultados anteriores por data, período ou time/temporada
js/views/game.js           Detalhe do jogo: períodos, favorito, linhas O/U, handicap, confrontos
js/views/stats.js          Jogadores NBA (13 mercados) e médias por equipe (futebol/tênis)
js/views/live.js           Ao vivo: todas as competições
js/views/totals.js         Totais, linhas Over/Under e vitória do favorito por período
js/views/settings.js       Configurações
```

## Publicação

Não há build e não é preciso nenhuma chave de API.

- **Vercel:** importe a pasta. A função `api/espn.js` vira `/api/espn` automaticamente.
- **Netlify:** importe a pasta. `netlify.toml` e `netlify/functions/espn.mjs` publicam a mesma função em `/api/espn`.
