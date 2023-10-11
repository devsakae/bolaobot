const { client } = require('./wpconnect');
const axios = require('axios');
const { writeData } = require('../utils/fileHandler');
const data = require('../data/data.json');
const prompts = require('../data/prompts.json');
const { forMatch } = require('../utils/functions');
const rapidapiurl = 'https://footapi7.p.rapidapi.com/api';

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
    return 'ERROR';
  }
}

function ping() {
  return client.sendMessage(process.env.BOLAO_OWNER, 'pong')
}

async function start(info) {
  try {
    const dataFromApi = await fetchData(rapidapiurl + '/team/' + info.team.id + '/matches/next/' + info.page);
    if (dataFromApi.events.length < 1) return client.sendMessage(info.m.from, prompts.bolao.no_matches);
    const today = new Date();
    const nomeDoBolao = today.getFullYear() + '-' + info.team.slug + '-' + dataFromApi.events[0].tournament.slug;
    Number(info.page) < 1
      ? data[nomeDoBolao] = dataFromApi.events
      : data[nomeDoBolao].push(...dataFromApi.events);
    data.conf[info.teamIdx].status = 'ativo';
    writeData(data);
    while (dataFromApi.hasNextPage) return start({ ...info, page: info.page + 1 });
    const bolaoPack = {
      id: nomeDoBolao,
      name: dataFromApi.events[0].tournament.name + ' ' + today.getFullYear() + ' (jogos *' + info.team.name + '*)',
      created: today,
      players: []
    };
    data.conf[info.teamIdx].torneios.push(bolaoPack)
    writeData(data);
    client.sendMessage(info.m.from, `👉 Bolão ${bolaoPack.name} criado com sucesso!\n\n*${dataFromApi.events.length}* rodadas disponíveis no banco de dados`);
    abreRodada({ m: info.m, id: nomeDoBolao });
  } catch (err) {
    console.error(err);
    return { code: 500, message: err };
  }
}

async function buscaProximaPartida(bolaoId) {
  try {
  } catch (err) {
    return { code: 500, message: err };
  }
}

function abreRodada(info) {
  if (!data.listening.some((l) => l === info.id)) {
    data.listening.push(info.id);
    writeData(data);
  };
  const limiteDeTempoParaPalpitesEmMinutos = 30;
  const limiteDeTempoConvertidoEmSegundos = limiteDeTempoParaPalpitesEmMinutos * 60;
  const today = new Date();
  const todayStamp = today.getTime() / 1000

  const jogo = data[info.id].find((j) => j.startTimestamp > todayStamp);
  if (!jogo) return client.sendMessage(info.m.from, 'Nenhuma rodada prevista!')
  // const timeoutInMs = (jogo.startTimestamp - limiteDeTempoConvertidoEmSegundos - (Math.floor(todayStamp))) * 1000;
// const encerramentoProgramado = setTimeout(() => fechaRodada(jogo), timeoutInMs)
  const texto = forMatch(jogo);
  // const encerramentoProgramado = setTimeout(() => fechaRodada(jogo), 5000)
  return client.sendMessage(info.m.from, texto);
}

function fechaRodada(info) {
  console.log('encerrando rodada!')
  console.log(info);
}

async function encerraPalpite(message) {
  palpiters = [];
  const encerramento = '⛔️⛔️ Tempo esgotado! ⛔️⛔️\n\n'
  const listaDePalpites = await organizaPalpites({ method: 'jogo', id: id });
  client.sendMessage(to, encerramento + listaDePalpites);
  const hours = 4;
  const hoursInMs = hours * (60 * 60 * 1000);
  const agendaVerificacao = setTimeout(() => confereResultado(message.from), hoursInMs)
  ouvindopalpites = false;
  return;
}


module.exports = {
  ping,
  start,
  buscaProximaPartida,
  abreRodada,
  fechaRodada,
}