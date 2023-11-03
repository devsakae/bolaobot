const data = require('../bolao/data/data.json');
const { client } = require('../connections');
const { formatLance } = require('./utils/functions');
const { fetchWithParams } = require('../../utils/fetchApi');

let modoNarrador = false;
let matchEvents = [];

const publicaLance = async (m, chat) => {
  await fetchWithParams({ url: process.env.FOOTBALL_API_URL + '/fixtures', host: process.env.FOOTBALL_API_HOST, params: { id: data.activeRound.matchId } })
  .then(({ response }) => {
    const { events } = response[0];
    const placar = `${response[0].teams.home.name} ${response[0].goals.home} x ${response[0].goals.away} ${response[0].teams.away.name}`
    if (events.length === matchEvents.length) return;
    if (response[0].fixture.status.short === 'FT') {
      () => clearInterval();
      client.sendMessage(m.from, `🛑 *Fim de jogo*! Resultado final: ${placar}`);
      matchEvents = [];
      return console.log('Partida finalizada');
    }
    const newEvents = matchEvents.length - events.length;
    matchEvents = events;
    let historico = 'Muita coisa acontecendo!\n';
    if (newEvents < -1) {
      if (events.some((ev) => ev.type === 'Goal')) chat.setSubject(placar);
      events.slice(newEvents).forEach((ev) => historico += `\n${formatLance(ev)}`);
      return client.sendMessage(m.from, historico);
    }
    let ultimoLance = formatLance(events.at(-1));
    if ((newEvents > -2) && events.at(-1).type === 'Goal') chat.setSubject(placar);
    return client.sendMessage(m.from, ultimoLance);
  })
  .catch((err) => console.error('ERRO:', err));
}

const narrador = async (m) => {
  const chat = await client.getChatById(m.from);
  if (modoNarrador) return;
  const today = new Date();
  const matchObj = data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()][data.activeRound.matchId];
  if (today.getTime() < matchObj.hora || today.getTime() > (matchObj.hora + (110 * 60000))) return m.reply('Modo narrador só funciona *durante* a partida 😔');
  modoNarrador = true;
  const backToNormal = setTimeout(() => modoNarrador = false, 24 * 3600000);
  let historico = 'Resumo do jogo até o momento'
  await fetchWithParams({ url: process.env.FOOTBALL_API_URL + '/fixtures', host: process.env.FOOTBALL_API_HOST, params: { id: data.activeRound.matchId } })
  .then(({ response }) => {
    const placar = `${response[0].teams.home.name} ${response[0].goals.home} x ${response[0].goals.away} ${response[0].teams.away.name}`;
    chat.setSubject(placar);
    historico += ` (${response[0].fixture.status.elapsed}' - ${response[0].fixture.status.long})\n`
    matchEvents = response[0].events;
    client.sendMessage(m.from, `🎙 Bem amigos do grupo! Acompanhe comigo os melhores lances de ${placar}!`)
    response[0].events.forEach((ev) => historico += `\n${formatLance(ev)}`)
  })
  .catch((err) => console.error(err));
  client.sendMessage(m.from, historico);
  const timerDeNarracao = setInterval(() => publicaLance(m, chat), 60000);
  const apitoFinal = setTimeout(() => {
    console.log('Encerramento programado');
    client.sendMessage(m.from, 'Modo narrador finalizado.');
    () => clearInterval(timerDeNarracao);
  }, 120 * 60000)
};

module.exports = {
  narrador,
}