const { default: axios } = require('axios');
const data = require('../bolao/data/data.json');
const { client } = require('../connections');
const { formatLance } = require('./utils/functions');

const matchId = 1053247 // TEST

let matchEvents = [];

const fetchApi = async (matchId) => {
  const response = await axios.request({
    method: 'GET',
    url: process.env.FOOTBALL_API_URL + '/fixtures',
    params: { id: matchId },
    headers: {
      'X-RapidAPI-Key': process.env.BOLAO_RAPIDAPI_KEY,
      'X-RapidAPI-Host': process.env.FOOTBALL_API_HOST
    }
  });
  return response.data.response[0];
}

const publicaLance = async (grupo) => {
  await fetchApi(matchId)
  .then((res) => {
    const { events } = res;
    if (events.length === matchEvents.length) return;
    if (res.fixture.status.short === 'FT') {
      () => clearInterval();
      client.sendMessage(grupo, `🛑 *Fim de jogo*❗️ Resultado final: ${res.teams.home.name} ${res.goals.home} x ${res.goals.away} ${res.teams.away.name}`);
      matchEvents = [];
      return console.log('Partida finalizada');
    }
    const newEvents = matchEvents.length - events.length;
    matchEvents = events;
    let historico = 'Muita coisa acontecendo!\n';
    if (newEvents < -1) {
      events.slice(newEvents).forEach((ev) => historico += `\n${formatLance(ev)}`);
      return client.sendMessage(grupo, historico);
    }
    let ultimoLance = formatLance(events.at(-1));
    return client.sendMessage(grupo, ultimoLance);
  })
  .catch((err) => console.error('ERRO:', err));
}

const narrador = async (m) => {
  let historico = 'Resumo do jogo até o momento'
  let placar = '';
  await fetchApi(matchId).then((res) => {
    historico += ` (${res.fixture.status.elapsed}' - ${res.fixture.status.long})\n`
    matchEvents = res.events;
    placar = `${res.teams.home.name} ${res.goals.home} x ${res.goals.away} ${res.teams.away.name}`
    res.events.forEach((ev) => historico += `\n${formatLance(ev)}`)
  });
  client.sendMessage(m.from, `🎙 Bem amigos do grupo! Acompanhe comigo os melhores lances de ${placar}!`)
  client.sendMessage(m.from, historico);
  const timerDeNarracao = setInterval(() => publicaLance(m.from), 180000); // TEST
  // const timerDeNarracao = setInterval(() => publicaLance(m.from), 60000);
  const apitoFinal = setTimeout(() => {
    console.log('Encerramento programado');
    client.sendMessage(m.from, 'Modo narrador finalizado.');
    () => clearInterval(timerDeNarracao);
  }, 120 * 60000)
};

module.exports = {
  narrador,
}