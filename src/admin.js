const prompts = require('../data/prompts.json');
const data = require('../data/data.json');
const mockMatch = require('../data/mockMatch.json');
const { client } = require('./wpconnect');
const axios = require('axios');
const { writeData } = require('../utils/fileHandler');
const { forMatch } = require('../utils/functions');
const { listaPalpites } = require('./user');
const rapidapiurl = 'https://footapi7.p.rapidapi.com/api';

function sendAdmin(what) { return client.sendMessage(process.env.BOLAO_OWNER, what); }

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

function ping() {
  return client.sendMessage(process.env.BOLAO_OWNER, 'pong')
}

async function start(info) {
  const team = data.teams[info.teamIdx];
  const grupo = info.to.split('@')[0];
  try {
    const dataFromApi = await fetchData(rapidapiurl + '/team/' + team.id + '/matches/next/' + info.page);
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
      team: team.slug
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
  const today = new Date();
  const horaNow = today.getTime();
  const nextMatch = pegaProximaRodada();
  if (nextMatch.error) return client.sendMessage(grupo, 'Nenhuma rodada prevista! Abra um novo bolão');
  data.activeRound = ({
    ...data.activeRound,
    listening: true,
    matchId: nextMatch.id,
    palpiteiros: [],
  });
  writeData(data);
  const limiteDeTempoParaPalpitesEmMinutos = 10; // Fazer configurável
  const limiteConvertidoEmMs = limiteDeTempoParaPalpitesEmMinutos * 60000;
  const timeoutInMs = nextMatch.hora - horaNow - limiteConvertidoEmMs;
  () => clearTimeout(encerramentoProgramado);
  const encerramentoProgramado = setTimeout(() => encerraPalpite(), 20000) // TEST
  // const encerramentoProgramado = setTimeout(() => encerraPalpite(), timeoutInMs)
  const texto = forMatch(nextMatch);
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
  const hours = 3;  // Prazo (em horas) para buscar o resultado da partida após o encerramento dos palpites
  const hoursInMs = hours * 3600000;
  const programaFechamento = setTimeout(() => fechaRodada(), 5000) // TEST
  // const programaFechamento = setTimeout(() => fechaRodada(), hoursInMs)
}

async function fechaRodada() {
  const today = new Date();
  const contatoGrupo = data.activeRound.grupo + '@g.us';
  const matchInfo = mockMatch; // TEST
  // const matchInfo = await fetchData(rapidapiurl + '/match/' + data.activeRound.matchId);
  const homeScore = matchInfo.event.homeScore.current;
  const awayScore = matchInfo.event.awayScore.current;
  const resultado = Number(matchInfo.event.homeScore.current) > Number(matchInfo.event.awayScore.current) ? 'V' : Number(matchInfo.event.homeScore.current) < Number(matchInfo.event.awayScore.current) ? 'D' : 'E';
  const rankingDaRodada = data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()][data.activeRound.matchId].palpites.map((p) => {
    // let playerInfo = { autor: p.userName, pontos: 0, placar: p.homeScore + ' x ' + p.awayScore }
    // if (p.homeScore === homeScore && p.awayScore === awayScore) {
    //   playerInfo.pontos = 3;
    //   return playerInfo;
    // }
    // if (p.resultado === resultado) playerInfo.pontos = 1;
    // if (p.resultado === resultado && (p.homeScore === homeScore || p.awayScore === awayScore)) playerInfo.pontos += 1;
    // return playerInfo;
    let playerInfo = { matchId: matchInfo.event.id, userId: p.userId, autor: p.userName, pontos: 0, placar: { homeScore: p.homeScore, awayScore: p.awayScore } }
    if (p.resultado === resultado) playerInfo.pontos = 1;
    if (p.resultado === resultado && (p.homeScore === homeScore || p.awayScore === awayScore)) playerInfo.pontos = 2;
    if (p.homeScore === homeScore && p.awayScore === awayScore) playerInfo.pontos = 3;
    data.historico.push(playerInfo);
    return playerInfo;
  }).sort((a, b) => a.pontos < b.pontos ? 1 : (a.pontos > b.pontos) ? -1 : 0);
  writeData(data);
  if (rankingDaRodada[0].pontos === 0) return client.sendMessage(contatoGrupo, 'Resultado do bolão: Ninguém pontuou na última rodada!');
  let response = `🏁🏁 Resultado do bolão da ${matchInfo.event.roundInfo.round}ª rodada 🏁🏁\n`;
  response += `\nPartida: ${matchInfo.event.homeRedCards ? '🟥'.repeat(matchInfo.event.homeRedCards) : ''}${matchInfo.event.homeTeam.name} ${homeScore} x ${awayScore} ${matchInfo.event.awayTeam.name}${matchInfo.event.awayRedCards ? '🟥'.repeat(matchInfo.event.awayRedCards) : ''}\n`;
  rankingDaRodada.forEach((pos, idx) => {
    const medal = (idx === 0) ? '🥇' : (idx === 1) ? '🥈' : (idx === 2) ? '🥉' : '';
    (pos.pontos > 0)
      ? response += `\n${medal} ${pos.autor} fez ${pos.pontos} ponto(s) com o palpite ${pos.placar.homeScore} x ${pos.placar.awayScore}`
      : response += `\n${pos.autor} zerou com o palpite ${pos.placar.homeScore} x ${pos.placar.awayScore}`
  });
  const nextMatch = pegaProximaRodada();
  if (nextMatch.error) return client.sendMessage(contatoGrupo, 'Bolão finalizado! Sem mais rodadas para disputa');
  const calculatedTimeout = (nextMatch.hora - 115200000) - today.getTime();
  const proximaRodada = setTimeout(() => abreRodada(), calculatedTimeout);
  data.activeRound = ({
    ...data.activeRound,
    matchId: null,
    palpiteiros: []
  })
  writeData(data);
  return client.sendMessage(contatoGrupo, response);
}

module.exports = {
  ping,
  start,
  abreRodada,
  fechaRodada,
}