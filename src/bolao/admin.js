const prompts = require('./data/prompts.json');
const data = require('./data/data.json');
const { client } = require('../connections');
const { listaPalpites } = require('./user');
const { writeData } = require('./utils/fileHandler');
const { forMatch, formatPredicts, sendAdmin } = require('./utils/functions');
const { fetchApi, fetchWithParams } = require('../../utils/fetchApi');

const start = async (info) => {
  const team = data.teams[info.teamIdx];
  const grupo = info.to.split('@')[0];
  try {
    const dataFromApi = await fetchApi({ url: process.env.FOOTAPI7_URL + '/team/' + team.id + '/matches/next/' + info.page, host: process.env.FOOTAPI7_HOST });
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
    abreRodada(info.to);
    return client.sendMessage(info.to, `👉 Bolão ${team.name} criado com sucesso!\n\n*${dataFromApi.events.length}* rodadas programadas para disputa`);
  } catch (err) {
    return sendAdmin(err);
  }
}

const pegaProximaRodada = () => {
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

const abreRodada = (group) => {
  const nextMatch = pegaProximaRodada();
  if (nextMatch.error) return client.sendMessage(group, 'Nenhuma rodada prevista! Abra um novo bolão');
  data.activeRound = ({
    ...data.activeRound,
    listening: true,
    matchId: nextMatch.id,
    palpiteiros: [],
  });
  writeData(data);
  publicaRodada(group);
}

const publicaRodada = (group) => {
  const today = new Date();
  const horaNow = today.getTime();
  const nextMatch = pegaProximaRodada();
  const texto = forMatch(nextMatch);
  const limiteDeTempoParaPalpitesEmMinutos = 10; // Fazer configurável
  const limiteConvertidoEmMs = limiteDeTempoParaPalpitesEmMinutos * 60000;
  const timeoutInMs = nextMatch.hora - horaNow - limiteConvertidoEmMs;
  () => clearTimeout(encerramentoProgramado);
  const encerramentoProgramado = setTimeout(() => encerraPalpite(group), timeoutInMs)
  sendAdmin(`Rodada reaberta, com término previsto em ${new Date(horaNow + timeoutInMs).toLocaleString('pt-br')}`)
  predictions();
  return client.sendMessage(group, texto);
}

const encerraPalpite = (group) => {
  const today = new Date();
  const encerramento = '⛔️⛔️ Tempo esgotado! ⛔️⛔️\n\n'
  data.activeRound.listening = false;
  writeData(data);
  const listaDePalpites = listaPalpites();
  if (data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()][data.activeRound.matchId].palpites.length < 1) return client.sendMessage(group, 'Nenhum palpite foi cadastrado!');
  client.sendMessage(group, encerramento + listaDePalpites);
  const hours = 8;  // Prazo (em horas) para buscar o resultado da partida após o encerramento dos palpites
  const hoursInMs = hours * 3600000;
  // const programaFechamento = setTimeout(() => fechaRodada(), 5000) // TEST
  const programaFechamento = setTimeout(() => fechaRodada(), hoursInMs);
  const comunicaNovoModulo = setTimeout(() => client.sendMessage(group, 'Ative o modo narrador escrevendo *!lancealance* após o início da partida 🐯'), 10 * 60000)
}

const fechaRodada = async (repeat) => {
  let response;
  const today = new Date();
  const grupo = data.activeRound.grupo + '@g.us';
  // const matchInfo = mockMatch; // TEST
  const matchInfo = await fetchApi({ url: process.env.FOOTAPI7_URL + '/match/' + data.activeRound.matchId, host: process.env.FOOTAPI7_HOST });
  if (matchInfo.event.status.code === 0) {
    clearTimeout();
    if (repeat && repeat > 3) return sendAdmin('Erro ao buscar informações da partida.\n\nVerifique o endpoint ', process.env.FOOTAPI7_URL + '/match/' + data.activeRound.matchId);
    sendAdmin(`Match de id ${data.activeRound.matchId} não finalizada. Será realizada a tentativa #${repeat + 1} novamente em 30 minutos.`)
    return setTimeout(() => fechaRodada(repeat + 1), 1800000);
  }
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
    return client.sendMessage(grupo, response);
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
  if (nextMatch.error) return client.sendMessage(grupo, 'Bolão finalizado! Sem mais rodadas para disputa. Veja como ficou o ranking escrevendo !ranking no canal (admin only)');
  const matchStats = await getStats(data.activeRound.matchId);
  client.sendMessage(grupo, matchStats);
  const calculatedTimeout = (nextMatch.hora - 115200000) - today.getTime(); // Abre nova rodada 36 horas antes do jogo
  const proximaRodada = setTimeout(() => abreRodada(), calculatedTimeout);
  const dataDaAbertura = new Date(today.getTime() + calculatedTimeout);
  const informaAbertura = setTimeout(() => client.sendMessage(grupo, `Próxima rodada com abertura programada para ${dataDaAbertura.toLocaleString('pt-br')}`), 3600000)
  data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()][data.activeRound.matchId].ranking = response;
  data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()][data.activeRound.matchId].palpites = rankingDaRodada;
  data.activeRound = ({ ...data.activeRound, matchId: null, palpiteiros: [] });
  writeData(data);
  return client.sendMessage(grupo, response);
}

const getStats = async (matchId) => {
  const today = new Date();
  const match = data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()][matchId];
  const homeTeam = match.homeTeam;
  const awayTeam = match.awayTeam;
  try {
    const responseFromApi = await fetchApi({ url: process.env.FOOTAPI7_URL + '/match/' + matchId + '/statistics', host: process.env.FOOTAPI7_HOST });
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

const predictions = async (group) => {
  const today = new Date();
  const nextMatch = data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()][data.activeRound.matchId];
  if (nextMatch && nextMatch.predictions) return client.sendMessage(group, nextMatch.predictions.stats);
  try {
    const getTeam = await fetchWithParams({ url: process.env.FOOTBALL_API_URL + '/teams', host: process.env.FOOTBALL_API_HOST, params: { name: data.activeRound.team } });
    // const getTeam = await axios.request(predictions_options('/teams', { name: data.activeRound.team }));
    if (getTeam.response.length < 1) throw new Error('Nenhum time foi encontrado. Verifique as configurações de time.')
    const teamId = getTeam.response[0].team.id;
    const getNextMatch = await fetchWithParams({ url: process.env.FOOTBALL_API_URL + '/fixtures', host: process.env.FOOTBALL_API_HOST, params: { team: teamId, next: '1' } });
    // const getNextMatch = await axios.request(predictions_options('/fixtures', { team: teamId, next: '1' }));
    if (!getNextMatch.response) throw new Error('Não existem previsões na API');
    const nextMatchId = getNextMatch.response[0].fixture.id;
    const getPredictions = await fetchWithParams({ url: process.env.FOOTBALL_API_URL + '/predictions', host: process.env.FOOTBALL_API_HOST, params: { fixture: nextMatchId } });
    // const getPredictions = await axios.request(predictions_options('/predictions', { fixture: nextMatchId }));
    const superStats = formatPredicts(getPredictions.response[0]);
    data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()][data.activeRound.matchId].predictions = { idMatch: nextMatchId, stats: superStats };
    writeData(data);
    return client.sendMessage(group, superStats);
  } catch (err) {
    console.error(err);
    return sendAdmin(err);
  }
}

module.exports = {
  start,
  abreRodada,
  publicaRodada,
  fechaRodada,
  pegaProximaRodada,
  getStats,
  predictions,
}