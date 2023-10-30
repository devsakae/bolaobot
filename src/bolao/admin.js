const prompts = require('./data/prompts.json');
const data = require('./data/data.json');
const { client } = require('../connections');
const axios = require('axios');
const { writeData } = require('./utils/fileHandler');
const { forMatch } = require('./utils/functions');
const { listaPalpites } = require('./user');

function sendAdmin(what) { return client.sendMessage(process.env.BOT_OWNER, what); }

async function fetchData(url) {
  try {
    const response = await axios.request({
      method: 'GET',
      url: url,
      headers: {
        'X-RapidAPI-Key': process.env.BOLAO_RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.BOLAO_RAPIDAPI_HOST,
      },
    });
    return response.data;
  } catch (err) {
    return sendAdmin(err);
  }
}

async function start(info) {
  const team = data.teams[info.teamIdx];
  const grupo = info.to.split('@')[0];
  try {
    const dataFromApi = await fetchData(process.env.BOLAO_RAPIDAPI_URL + '/team/' + team.id + '/matches/next/' + info.page);
    if (dataFromApi.events.length < 1) return client.sendMessage(info.to, prompts.bolao.no_matches);
    const today = new Date();
    data[grupo] = ({
      [team.slug]: {
        [today.getFullYear()]: {}
      }
    });
    dataFromApi.events.forEach((event) => {
      data[grupo][team.slug][today.getFullYear()][event.id] = ({
        id: event.id,
        homeTeam: event.homeTeam.name,
        awayTeam: event.awayTeam.name,
        hora: Number(event.startTimestamp) * 1000,
        torneio: event.tournament.name,
        rodada: Number(event.roundInfo.round),
        palpites: [],
      })
    });
    data.activeRound = ({
      grupo: grupo,
      team: team.slug,
      teamId: team.id
    });
    writeData(data);
    while (dataFromApi.hasNextPage) return start({ ...info, page: info.page + 1 });
    return client.sendMessage(info.to, `👉 Bolão ${team.name} criado com sucesso!\n\n*${dataFromApi.events.length}* rodadas programadas para disputa`);
  } catch (err) {
    return sendAdmin(err);
  }
}

function pegaProximaRodada() {
  const today = new Date();
  const grupo = data.activeRound.grupo;
  const slug = data.activeRound.team;
  const ano = today.getFullYear();
  const horaNow = today.getTime();
  for (let key in data[grupo][slug][ano]) {
    if (data[grupo][slug][ano][key].hora > horaNow) return data[grupo][slug][ano][key];
  };
  return { error: true };
}

function abreRodada() {
  const grupo = data.activeRound.grupo + '@g.us';
  const nextMatch = pegaProximaRodada();
  if (nextMatch.error) return client.sendMessage(grupo, 'Nenhuma rodada prevista! Abra um novo bolão');
  data.activeRound = ({
    ...data.activeRound,
    listening: true,
    matchId: nextMatch.id,
    palpiteiros: [],
  });
  writeData(data);
  publicaRodada();
}

function publicaRodada() {
  const grupo = data.activeRound.grupo + '@g.us';
  const today = new Date();
  const horaNow = today.getTime();
  const nextMatch = pegaProximaRodada();
  const texto = forMatch(nextMatch);
  const limiteDeTempoParaPalpitesEmMinutos = 10; // Fazer configurável
  const limiteConvertidoEmMs = limiteDeTempoParaPalpitesEmMinutos * 60000;
  const timeoutInMs = nextMatch.hora - horaNow - limiteConvertidoEmMs;
  () => clearTimeout(encerramentoProgramado);
  const encerramentoProgramado = setTimeout(() => encerraPalpite(), timeoutInMs)
  sendAdmin(`Rodada reaberta, com término previsto em ${new Date(horaNow + timeoutInMs).toLocaleString('pt-br')}`)
  const mandaOdds = setTimeout(() => getOdds(), 180000);
  return client.sendMessage(grupo, texto);
}

function encerraPalpite() {
  const today = new Date();
  const encerramento = '⛔️⛔️ Tempo esgotado! ⛔️⛔️\n\n'
  data.activeRound.listening = false;
  writeData(data);
  const listaDePalpites = listaPalpites();
  if (data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()][data.activeRound.matchId].palpites.length < 1) return client.sendMessage(data.activeRound.grupo + '@g.us', 'Nenhum palpite foi cadastrado!');
  client.sendMessage(data.activeRound.grupo + '@g.us', encerramento + listaDePalpites);
  const hours = 8;  // Prazo (em horas) para buscar o resultado da partida após o encerramento dos palpites
  const hoursInMs = hours * 3600000;
  // const programaFechamento = setTimeout(() => fechaRodada(), 5000) // TEST
  const programaFechamento = setTimeout(() => fechaRodada(), hoursInMs)
}

async function fechaRodada(repeat) {
  let response;
  const today = new Date();
  const contatoGrupo = data.activeRound.grupo + '@g.us';
  // const matchInfo = mockMatch; // TEST
  const matchInfo = await fetchData(process.env.BOLAO_RAPIDAPI_URL + '/match/' + data.activeRound.matchId);
  if (matchInfo.event.status.code === 0) {
    if (repeat && repeat > 3) return sendAdmin('Não foi possível pegar o resultado da partida', data.activeRound.matchId);
    clearTimeout();
    console.log('Reajuste de fechamento de rodada em meia hora pra frente');
    return setTimeout(() => fechaRodada(repeat + 1), 1800000);
  }
  // Verificar teamId para buscar highlights
  // const matchHighlights = await fetchData(process.env.BOLAO_RAPIDAPI_URL + '/team/' + data.activeRound.teamId + '/media'); // Video highlights?
  const homeScore = matchInfo.event.homeScore.current;
  const awayScore = matchInfo.event.awayScore.current;
  const resultado = Number(matchInfo.event.homeScore.current) > Number(matchInfo.event.awayScore.current) ? 'V' : Number(matchInfo.event.homeScore.current) < Number(matchInfo.event.awayScore.current) ? 'D' : 'E';
  const rankingDaRodada = data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()][data.activeRound.matchId].palpites.map((p) => {
    let pontos = 0;
    if (p.resultado === resultado) pontos = 1;
    if (p.resultado === resultado && (p.homeScore === homeScore || p.awayScore === awayScore)) pontos = 2;
    if (p.homeScore === homeScore && p.awayScore === awayScore) pontos = 3;
    const playerIdx = data.ranking.findIndex((player) => player.id === p.userId);
    (playerIdx < 0)
      ? data.ranking.push({ id: p.userId, usuario: p.userName, pontos: pontos })
      : data.ranking[playerIdx].pontos += pontos;
    return ({ ...p, pontos: pontos });
  }).sort((a, b) => a.pontos < b.pontos ? 1 : (a.pontos > b.pontos) ? -1 : 0);
  if (rankingDaRodada[0].pontos === 0) {
    response = 'Ninguém pontuou na última rodada!';
    data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()][data.activeRound.matchId].ranking = response;
    data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()][data.activeRound.matchId].palpites = rankingDaRodada;
    writeData(data);
    return client.sendMessage(contatoGrupo, response);
  }
  response = `🏁🏁 Resultado do bolão da ${matchInfo.event.roundInfo.round}ª rodada 🏁🏁\n`;
  response += `\nPartida: ${matchInfo.event.homeRedCards ? '🟥'.repeat(matchInfo.event.homeRedCards) : ''}${matchInfo.event.homeTeam.name} ${homeScore} x ${awayScore} ${matchInfo.event.awayTeam.name}${matchInfo.event.awayRedCards ? '🟥'.repeat(matchInfo.event.awayRedCards) : ''}\n`;
  rankingDaRodada.forEach((pos, idx) => {
    const medal = (idx === 0) ? '🥇 ' : (idx === 1) ? '🥈 ' : (idx === 2) ? '🥉 ' : '';
    (pos.pontos > 0)
      ? response += `\n${medal}${pos.userName} fez ${pos.pontos} ponto(s) com o palpite ${pos.homeScore} x ${pos.awayScore}`
      : response += `\n${pos.userName} zerou com o palpite ${pos.homeScore} x ${pos.awayScore}`
  });
  const nextMatch = pegaProximaRodada();
  if (nextMatch.error) return client.sendMessage(contatoGrupo, 'Bolão finalizado! Sem mais rodadas para disputa');
  const showStats = setTimeout(() => getStats(data.activeRound.matchId), 10000);
  const calculatedTimeout = (nextMatch.hora - 115200000) - today.getTime(); // Abre nova rodada 36 horas antes do jogo
  const proximaRodada = setTimeout(() => abreRodada(), calculatedTimeout);
  const dataDaAbertura = new Date(today.getTime() + calculatedTimeout);
  const informaAbertura = setTimetout(() => client.sendMessage(contatoGrupo, `Próxima rodada com abertura programada para ${dataDaAbertura.toLocaleString('pt-br')}`), )
  data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()][data.activeRound.matchId].ranking = response;
  data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()][data.activeRound.matchId].palpites = rankingDaRodada;
  data.activeRound = ({ ...data.activeRound, matchId: null, palpiteiros: [] });
  writeData(data);
  return client.sendMessage(contatoGrupo, response);
}

async function getStats(matchId) {
  const today = new Date();
  const match = data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()][matchId];
  const homeTeam = match.homeTeam;
  const awayTeam = match.awayTeam;
  try {
    const responseFromApi = await fetchData(process.env.BOLAO_RAPIDAPI_URL + '/match/' + matchId + '/statistics');
    const matchStats = responseFromApi.statistics.find((item) => item.period === 'ALL');
    let formatStats = `Estatísticas de ${homeTeam} x ${awayTeam}`;
    matchStats.groups.forEach((stat) => {
      formatStats += `\n\n 👁‍🗨 *${stat.groupName}*`;
      stat.statisticsItems.forEach((s) => {
        formatStats += `\n${s.name}: ${s.home} x ${s.away}`
      });
    });
    return formatStats;
  } catch (err) {
    return ({ error: true });
  }
}

async function getOdds() {
  const today = new Date();
  const nextMatch = data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()][data.activeRound.matchId];
  if (nextMatch.odds) return client.sendMessage(data.activeRound.grupo + '@g.us')
  const leagueId = 1835 // Série B 2023
  const url = 'https://pinnacle-odds.p.rapidapi.com/kit/v1/markets';
  const options = {
    method: 'GET',
    url: url,
    params: {
      sport_id: '1',
      league_ids: leagueId,
      is_have_odds: 'true'
    },
    headers: {
      'X-RapidAPI-Key': process.env.BOLAO_RAPIDAPI_KEY,
      'X-RapidAPI-Host': process.env.BOLAO_PINNACLE_ODDS_HOST
    }
  };
  try {
    const response = await axios.request(options);
    const teamRegex = new RegExp(data.activeRound.slug, "i");
    const oddsObj = response.data.events.find((event) => event.home.match(teamRegex) || event.away.match(teamRegex));
    if (!oddsObj.is_have_odds) return client.sendMessage(data.activeRound.grupo + '@g.us', 'Partida sem odds registradas ☠️');
    const oddHome = oddsObj.periods.num_0.money_line.home;
    const oddDraw = oddsObj.periods.num_0.money_line.draw;
    const oddAway = oddsObj.periods.num_0.money_line.away;
    const messageResponse = `🍀 Odds para ${nextMatch.homeTeam} x ${nextMatch.awayTeam} (${nextMatch.rodada}ª rodada)
  
${nextMatch.homeTeam}: ${oddHome}
${nextMatch.awayTeam}: ${oddAway}
Empate: ${oddDraw}

👉 Odds de pinnacle.com`
    nextMatch.odds = oddsObj
    writeData(data);
    client.sendMessage(data.activeRound.grupo + '@g.us', messageResponse)
  } catch (error) {
    console.error(err);
    sendAdmin('Erro fetching odds', error)
  }
}

module.exports = {
  start,
  fetchData,
  abreRodada,
  publicaRodada,
  fechaRodada,
  pegaProximaRodada,
  getStats,
  getOdds,
}