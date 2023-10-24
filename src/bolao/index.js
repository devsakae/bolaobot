const data = require('./data/data.json');
const prompts = require('./data/prompts.json');
const { client } = require('../connections');
const { getCommand } = require('./utils/functions');
const { start, abreRodada, fechaRodada, pegaProximaRodada, getStats } = require('./admin');
const { habilitaPalpite, listaPalpites, getRanking } = require('./user');

const bolao = async (m) => {
  if (m.hasQuotedMsg && data.activeRound) {
    const isTopic = await m.getQuotedMessage();
    const matchingRegex = isTopic.body.match(/partida:\s\d+/);
    if (isTopic && isTopic.fromMe && matchingRegex) {
      const sender = await m.getContact(m.from);
      const matchId = matchingRegex[0].split(':')[1].trim();
      if (data.activeRound.matchId === Number(matchId)) {
        habilitaPalpite({ m: m, user: sender.pushname || sender.name, matchId: matchId })
        return m.react('🎟');
      }
      m.reply('Essa rodada não está ativa!');
    }
    return;
  }
  if (m.body.startsWith('!palpites') && data.activeRound && data.activeRound.listening) {
    console.log('Solicitação de palpites com !palpites')
    const palpiteList = listaPalpites();
    return client.sendMessage(m.from, palpiteList);
  };
  if (m.author === process.env.BOT_OWNER && m.body.startsWith('!ranking') && data.activeRound) {
    console.log('Owner disse !ranking')
    const command = getCommand(m.body);
    const ranking = command ? getRanking(command) : getRanking();
    client.sendMessage(m.from, ranking);
  }
  if (m.author === process.env.BOT_OWNER && m.body.startsWith('!stats')) {
    console.log('Owner disse !stats')
    const command = getCommand(m.body);
    if (!command) return m.reply('Especifique o ID da partida');
    const statsPack = await getStats(command);
    if (statsPack.error) return m.reply('Erro buscando estatísticas da partida');
    return client.sendMessage(m.from, statsPack);
  };
  if (m.author === process.env.BOT_OWNER && m.body.startsWith('!bolao')) {
    console.log('Owner disse !bolao')
    const command = getCommand(m.body);
    const grupo = m.from.split('@')[0];
    if (command && command.startsWith('start')) {
      const searchedTeam = command.substring(5).trimStart()
      const teamIdx = data.teams.findIndex((team) => team.name === searchedTeam || team.slug === searchedTeam);
      if (Number(teamIdx) < 0) return m.reply(prompts.bolao.no_team);
      if (data[grupo] && data[grupo][data.teams[teamIdx].slug]) return m.reply('Bolão já está ativo!');
      await start({ to: m.from, teamIdx: teamIdx, page: 0 });
      setTimeout(() => abreRodada(), 5000)
      return;
    };
    if (command && command.startsWith('calcula')) fechaRodada();
    return m.reply('Oi, tô vivo')
  }
  if (m.author === process.env.BOT_OWNER && m.body.startsWith("!restart")) {
    console.log('Owner disse !restart')
    if (data.activeRound.listening) {
      return client.sendMessage(m.author, 'Palpites ativos. Bot não pode ser reiniciado agora.');
    }
    const today = new Date();
    const nextMatch = pegaProximaRodada();
    if (nextMatch.error) return client.sendMessage(m.author, 'Bolão finalizado! Sem mais rodadas para disputa');
    const calculatedTimeout = (nextMatch.hora - 115200000) - today.getTime(); // Abre nova rodada 36 horas antes do jogo
    const proximaRodada = setTimeout(() => abreRodada(), calculatedTimeout);
    // const proximaRodada = setTimeout(() => abreRodada(), 10000); // TEST
    const quandoAbre = new Date(today.getTime() + calculatedTimeout);
    return client.reply(`Bolão programado para abertura de rodada em ${quandoAbre.toLocaleString('pt-br')}`);
  }
  return;
}

module.exports = { bolao };