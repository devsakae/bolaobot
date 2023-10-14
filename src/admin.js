const { client } = require('./wpconnect');
const axios = require('axios');
const { writeData } = require('../utils/fileHandler');
const data = require('../data/data.json');
const prompts = require('../data/prompts.json');
const { forMatch } = require('../utils/functions');
const { listaPalpites } = require('./user');
const rapidapiurl = 'https://footapi7.p.rapidapi.com/api';

function sendAdmin(what) {
  client.sendMessage(process.env.BOLAO_OWNER, what);
}

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
    // const dataFromApi = mockEvents;
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
  for (let key in data[grupo][slug][ano]) {
    if (data[grupo][slug][ano][key].hora > horaNow) return data[grupo][slug][ano][key];
  };
  return { error: true };
}

function abreRodada(info) {
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
  }),
  writeData(data);
  const limiteDeTempoParaPalpitesEmMinutos = 30; // Fazer configurável
  const limiteConvertidoEmMs = limiteDeTempoParaPalpitesEmMinutos * 60000;
  const timeoutInMs = nextMatch.hora - horaNow - limiteConvertidoEmMs;
  () => clearTimeout(encerramentoProgramado);
  const encerramentoProgramado = setTimeout(() => encerraPalpite(), timeoutInMs)
  const texto = forMatch(nextMatch);
  return client.sendMessage(grupo, texto);
}

function encerraPalpite() {
  const encerramento = '⛔️⛔️ Tempo esgotado! ⛔️⛔️\n\n'
  const listaDePalpites = listaPalpites();
  client.sendMessage(data.activeRound.grupo + '@g.us', encerramento + listaDePalpites);
  const hours = 4;  // Valor para buscar o resultado da partida, em horas
  const hoursInMs = hours * 3600000;
  const programaFechamento = setTimeout(() => fechaRodada(), hoursInMs)
  data.activeRound.listening = false;
  writeData(data);
}

async function fechaRodada() {
  const today = new Date();
  const contatoGrupo = data.activeRound.grupo + '@g.us';
  if (data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()][data.activeRound.matchId].palpites.length < 1) return client.sendMessage(contatoGrupo, 'Nenhum palpite foi cadastrado!');
  const matchInfo = await fetchData(rapidapiurl + '/match/' + data.activeRound.matchId);
  const homeScore = matchInfo.event.homeScore.current;
  const awayScore = matchInfo.event.awayScore.current;
  const resultado = Number(matchInfo.event.homeScore.current) > Number(matchInfo.event.awayScore.current) ? 'V' : Number(matchInfo.event.homeScore.current) < Number(matchInfo.event.awayScore.current) ? 'D' : 'E';
  const rankingDaRodada = data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()][data.activeRound.matchId].palpites.map((p) => {
    let playerInfo = { autor: p.userName, pontos: 0, placar: p.homeScore + ' x ' + p.awayScore }
    if (p.homeScore === homeScore && p.awayScore === awayScore) {
      playerInfo.pontos = 3;
      return playerInfo;
    } 
    if (p.resultado === resultado) playerInfo.pontos = 1;
    if (p.resultado === resultado && (p.homeScore === homeScore || p.awayScore === awayScore)) playerInfo.pontos += 1;
    return playerInfo;
  });
  rankingDaRodada.sort((a, b) => a.pontos < b.pontos ? 1 : (a.pontos > b.pontos) ? -1 : 0);
  let response = '🏁🏁 Resultado do bolão da última partida 🏁🏁\n';
  rankingDaRodada.forEach((pos, idx) => {
    const medal = (idx === 0) ? '🥇' : (idx === 1) ? '🥈' : (idx === 2) ? '🥉' : '';
    response += `\n${medal} ${pos.autor} fez ${pos.pontos} ponto(s) com o palpite ${pos.placar}`;
  });
  const nextMatch = pegaProximaRodada();
  if (nextMatch.error) return client.sendMessage(contatoGrupo, 'Fim do bolão! <resultado final>');
  const proximaRodada = setTimeout(() => abreRodada({ to: data.activeRound.grupo + '@g.us', teamIdx: teamIdx }), 12 * 3600000) // Abre nova rodada em 12 horas após fechar a última rodada
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