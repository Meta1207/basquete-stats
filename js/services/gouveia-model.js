// IA Gouveia — motor estatístico independente (NBA)
// Usa placares históricos da ESPN apenas como dados de entrada.
// Não lê odds nem projeções ESPN para calcular suas próprias previsões.
import { getGames } from './espn.js';
import { addDays } from '../utils.js';

const CACHE = new Map();
const HISTORY_DAYS = 90;
const MAX_GAMES = 15;
const MIN_GAMES = 5;
const HOME_ADVANTAGE = 2.0;
const PROBABILITY_SCALE = 7.8;

const teamKey = team => String(team?.id || team?.abbr || team?.short || team?.name || '').toLowerCase();

function weightedAverage(items, valueOf) {
  let total = 0, weights = 0;
  items.forEach((item, index) => {
    const weight = Math.pow(0.90, index);
    const value = Number(valueOf(item));
    if (!Number.isFinite(value)) return;
    total += value * weight;
    weights += weight;
  });
  return weights ? total / weights : null;
}

function completedGames(games, before) {
  const cutoff = new Date(before).getTime();
  return games.filter(game =>
    game.completed &&
    Number.isFinite(new Date(game.date).getTime()) &&
    new Date(game.date).getTime() < cutoff &&
    Number.isFinite(Number(game.home?.score)) &&
    Number.isFinite(Number(game.away?.score))
  );
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
  const stats = list => {
    const pf = weightedAverage(list, g => teamKey(g.home) === teamKey(team) ? g.home.score : g.away.score);
    const pa = weightedAverage(list, g => teamKey(g.home) === teamKey(team) ? g.away.score : g.home.score);
    const margin = pf != null && pa != null ? pf - pa : null;
    return { games: list.length, pointsFor: pf, pointsAgainst: pa, margin };
  };
  return {
    overall: stats(all),
    home: stats(home),
    away: stats(away),
    lastFive: stats(all.slice(0, 5)),
    recentGames: all.length
  };
}

function logisticProbability(margin) {
  return 1 / (1 + Math.exp(-margin / PROBABILITY_SCALE));
}

function round(value, places = 1) {
  const p = Math.pow(10, places);
  return Math.round(value * p) / p;
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

    // Mistura desempenho geral recente com recorte de mando quando há amostra mínima.
    const homePF = home.home.games >= 3 ? home.home.pointsFor * 0.30 + home.overall.pointsFor * 0.70 : home.overall.pointsFor;
    const homePA = home.home.games >= 3 ? home.home.pointsAgainst * 0.30 + home.overall.pointsAgainst * 0.70 : home.overall.pointsAgainst;
    const awayPF = away.away.games >= 3 ? away.away.pointsFor * 0.30 + away.overall.pointsFor * 0.70 : away.overall.pointsFor;
    const awayPA = away.away.games >= 3 ? away.away.pointsAgainst * 0.30 + away.overall.pointsAgainst * 0.70 : away.overall.pointsAgainst;

    const projectedHome = (homePF + awayPA) / 2 + HOME_ADVANTAGE / 2;
    const projectedAway = (awayPF + homePA) / 2 - HOME_ADVANTAGE / 2;
    const margin = projectedHome - projectedAway;
    const homeProbability = logisticProbability(margin);
    const awayProbability = 1 - homeProbability;
    const total = projectedHome + projectedAway;

    return {
      available: true,
      model: 'Gouveia NBA v1',
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
      method: 'Médias ponderadas dos últimos ' + MAX_GAMES + ' jogos, pontos marcados/sofridos, recorte de mando e vantagem de quadra fixa de ' + HOME_ADVANTAGE + ' pontos.',
      caveat: 'Versão inicial experimental. Não incorpora lesões, escalações confirmadas, descanso, viagens ou ritmo de jogo. Probabilidades ainda precisam de calibração fora da amostra.'
    };
  } catch (error) {
    return { available: false, reason: 'Não foi possível carregar o histórico necessário para esta análise.' };
  }
}
