// IA Gouveia — motor estatístico independente (NBA) v2
// Entrada: placares históricos da ESPN. Odds e previsões ESPN nunca entram no cálculo.
// Escopo atual: vencedor provável e projeção de placar pré-jogo de equipes.
import { getGames } from './espn.js';
import { addDays } from '../utils.js';

const CACHE = new Map();
const HISTORY_DAYS = 90;
const MAX_GAMES = 15;
const MIN_GAMES = 5;
const HOME_ADVANTAGE = 2.0;
const RECENCY_DECAY = 0.92;

const teamKey = team => String(team?.id || team?.abbr || team?.short || team?.name || '').toLowerCase();
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function round(value, places = 1) {
  const p = Math.pow(10, places);
  return Math.round(value * p) / p;
}

function weightedAverage(items, valueOf) {
  let total = 0, weights = 0;
  items.forEach((item, index) => {
    const weight = Math.pow(RECENCY_DECAY, index);
    const value = Number(valueOf(item));
    if (!Number.isFinite(value)) return;
    total += value * weight;
    weights += weight;
  });
  return weights ? total / weights : null;
}

function weightedStd(items, valueOf) {
  const mean = weightedAverage(items, valueOf);
  if (mean == null) return null;
  const variance = weightedAverage(items, item => Math.pow(Number(valueOf(item)) - mean, 2));
  return variance == null ? null : Math.sqrt(Math.max(0, variance));
}

function completedGames(games, before) {
  const cutoff = new Date(before).getTime();
  return games.filter(game => {
    const date = new Date(game.date).getTime();
    const home = Number(game.home?.score), away = Number(game.away?.score);
    return game.completed && Number.isFinite(date) && date < cutoff &&
      game.home?.score != null && game.away?.score != null &&
      Number.isFinite(home) && Number.isFinite(away);
  });
}

function teamHistory(games, team, venue) {
  const key = teamKey(team);
  return games.filter(game => {
    const isHome = teamKey(game.home) === key;
    const isAway = teamKey(game.away) === key;
    if (!isHome && !isAway) return false;
    if (venue === 'home' && !isHome) return false;
    if (venue === 'away' && !isAway) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, MAX_GAMES);
}

function summarizeTeam(games, team) {
  const all = teamHistory(games, team);
  const home = teamHistory(games, team, 'home');
  const away = teamHistory(games, team, 'away');
  const values = (game) => {
    const isHome = teamKey(game.home) === teamKey(team);
    return {
      pf: Number(isHome ? game.home.score : game.away.score),
      pa: Number(isHome ? game.away.score : game.home.score)
    };
  };
  const stats = list => {
    const pf = weightedAverage(list, g => values(g).pf);
    const pa = weightedAverage(list, g => values(g).pa);
    const margin = pf != null && pa != null ? pf - pa : null;
    const marginStd = weightedStd(list, g => values(g).pf - values(g).pa);
    return { games: list.length, pointsFor: pf, pointsAgainst: pa, margin, marginStd };
  };
  const latest = all[0]?.date ? new Date(all[0].date) : null;
  const daysSinceLast = latest ? Math.max(0, (new Date(games[0]?.date || Date.now()).getTime() - latest.getTime()) / 86400000) : null;
  return {
    overall: stats(all),
    home: stats(home),
    away: stats(away),
    lastFive: stats(all.slice(0, 5)),
    recentGames: all.length,
    daysSinceLast: Number.isFinite(daysSinceLast) ? daysSinceLast : null
  };
}

function leagueBaseline(games) {
  const scores = [];
  for (const game of games) {
    const h = Number(game.home?.score), a = Number(game.away?.score);
    if (Number.isFinite(h) && Number.isFinite(a)) scores.push(h, a);
  }
  return scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
}

function logisticProbability(margin, scale) {
  return 1 / (1 + Math.exp(-margin / scale));
}

function confidenceAssessment(home, away) {
  const avgSample = (home.overall.games + away.overall.games) / 2;
  const venueSample = Math.min(home.home.games, away.away.games);
  const volatility = Math.sqrt(
    Math.pow(home.overall.marginStd || 18, 2) +
    Math.pow(away.overall.marginStd || 18, 2)
  );
  const samplePart = clamp(avgSample / MAX_GAMES, 0, 1) * 35;
  const venuePart = clamp(venueSample / 5, 0, 1) * 20;
  const stabilityPart = clamp(1 - (volatility - 18) / 28, 0, 1) * 25;
  const recencyDays = Math.max(home.daysSinceLast ?? 10, away.daysSinceLast ?? 10);
  const recencyPart = clamp(1 - recencyDays / 30, 0, 1) * 20;
  const score = Math.round(samplePart + venuePart + stabilityPart + recencyPart);
  const level = score >= 75 ? 'high' : score >= 55 ? 'medium' : 'low';
  const label = level === 'high' ? 'Alta' : level === 'medium' ? 'Moderada' : 'Baixa';
  const reason = level === 'high'
    ? 'Amostra recente ampla, recorte de mando e resultados relativamente consistentes.'
    : level === 'medium'
      ? 'Há dados suficientes para estimar o confronto, mas a amostra ou a consistência ainda limita a segurança.'
      : 'Amostra curta, pouca informação de mando ou grande variação nos resultados.';
  return { score, level, label, reason };
}

async function loadHistory(gameDate) {
  const day = new Date(gameDate);
  const key = day.toISOString().slice(0, 10);
  const cached = CACHE.get(key);
  if (cached && Date.now() - cached.time < 15 * 60 * 1000) return cached.promise;
  const from = addDays(day, -HISTORY_DAYS);
  const to = addDays(day, -1);
  const promise = getGames('nba', 'nba', from, to, true)
    .then(games => completedGames(games, day))
    .catch(error => {
      CACHE.delete(key);
      throw error;
    });
  CACHE.set(key, { time: Date.now(), promise });
  return promise;
}

export async function getGouveiaPrediction(match) {
  if (!match || match.sk !== 'nba' || match.state !== 'pre') {
    return { available: false, reason: 'O motor Gouveia está disponível nesta etapa apenas para jogos pré-jogo da NBA.' };
  }
  try {
    const games = await loadHistory(match.date);
    const home = summarizeTeam(games, match.home);
    const away = summarizeTeam(games, match.away);
    if (home.overall.games < MIN_GAMES || away.overall.games < MIN_GAMES) {
      return {
        available: false,
        reason: 'Histórico insuficiente: são necessários pelo menos ' + MIN_GAMES + ' jogos concluídos para cada equipe.',
        homeGames: home.overall.games,
        awayGames: away.overall.games
      };
    }

    const baseline = leagueBaseline(games);
    if (baseline == null) {
      return { available: false, reason: 'Não foi possível calcular a média da liga com os dados históricos disponíveis.' };
    }

    // Ataque e defesa são comparados à média da liga; recorte de mando só entra com amostra mínima.
    const homePF = home.home.games >= 3 ? home.overall.pointsFor * 0.72 + home.home.pointsFor * 0.28 : home.overall.pointsFor;
    const homePA = home.home.games >= 3 ? home.overall.pointsAgainst * 0.72 + home.home.pointsAgainst * 0.28 : home.overall.pointsAgainst;
    const awayPF = away.away.games >= 3 ? away.overall.pointsFor * 0.72 + away.away.pointsFor * 0.28 : away.overall.pointsFor;
    const awayPA = away.away.games >= 3 ? away.overall.pointsAgainst * 0.72 + away.away.pointsAgainst * 0.28 : away.overall.pointsAgainst;

    let projectedHome = baseline + (homePF - baseline) * 0.55 + (awayPA - baseline) * 0.45 + HOME_ADVANTAGE / 2;
    let projectedAway = baseline + (awayPF - baseline) * 0.55 + (homePA - baseline) * 0.45 - HOME_ADVANTAGE / 2;

    // Forma recente tem peso limitado para não deixar uma sequência curta dominar a projeção.
    const homeMomentum = home.lastFive.margin - home.overall.margin;
    const awayMomentum = away.lastFive.margin - away.overall.margin;
    const momentumAdjustment = clamp((homeMomentum - awayMomentum) * 0.12, -3, 3);
    projectedHome += momentumAdjustment / 2;
    projectedAway -= momentumAdjustment / 2;

    const margin = projectedHome - projectedAway;
    const total = projectedHome + projectedAway;
    const combinedVolatility = Math.sqrt(
      Math.pow(home.overall.marginStd || 18, 2) +
      Math.pow(away.overall.marginStd || 18, 2)
    );
    const probabilityScale = clamp(combinedVolatility * 0.32, 8.5, 13.5);
    const homeProbability = logisticProbability(margin, probabilityScale);
    const awayProbability = 1 - homeProbability;
    const confidence = confidenceAssessment(home, away);

    const signals = [
      'Ataque e defesa comparados à média da NBA (' + round(baseline) + ' pontos)',
      'Mando de quadra: +' + HOME_ADVANTAGE + ' pontos para o mandante',
      'Forma recente: ajuste limitado de ' + (momentumAdjustment > 0 ? '+' : '') + round(momentumAdjustment) + ' pontos na margem'
    ];

    return {
      available: true,
      model: 'Gouveia NBA v2',
      home: {
        name: match.home.name,
        points: round(projectedHome),
        winProbability: round(homeProbability * 100, 1),
        history: home
      },
      away: {
        name: match.away.name,
        points: round(projectedAway),
        winProbability: round(awayProbability * 100, 1),
        history: away
      },
      projectedTotal: round(total),
      projectedMargin: round(margin),
      favorite: margin >= 0 ? 'home' : 'away',
      sample: { home: home.overall.games, away: away.overall.games },
      confidence,
      signals,
      method: 'Médias ponderadas dos últimos ' + MAX_GAMES + ' jogos em até ' + HISTORY_DAYS + ' dias, eficiência ofensiva/defensiva relativa à média da liga, recorte de mando quando há amostra mínima e ajuste moderado de forma recente.',
      caveat: 'Modelo experimental. Ainda não incorpora lesões, escalações confirmadas, descanso, viagens ou ritmo de jogo. A probabilidade não é uma taxa de acerto validada; precisa de backtest histórico antes de ser tratada como calibrada.'
    };
  } catch (error) {
    return { available: false, reason: 'Não foi possível carregar o histórico necessário para esta análise.' };
  }
}
