const { client } = require('./src/wpconnect');
const { start, abreRodada } = require('./src/admin');
const { getCommand } = require('./utils/functions');
const data = require('./data/data.json');
const prompts = require('./data/prompts.json');
const { habilitaPalpite, listaPalpites, getRanking, getStats } = require('./src/user');
const carenciaFlooderList = 5
const carenciaYellowCard = 30
let flooderList = [];
let yellowCards = [];

(async () => {
  process.env.BOLAO_OWNER ? console.log('\n✔ Telefone do administrador:', process.env.BOLAO_OWNER.slice(2, -5), '\n') : console.error(prompts.admin.no_owner);
  console.log('Times liberados para disputa do bolão:')
  data.teams.forEach((team) => console.log('-', team.name))
  console.log('\n' + prompts.admin.welcome);
})();

client.on('message', async (m) => {
  if (yellowCards.includes(m.author)) return;
  if (flooderList.includes(m.author)) {
    m.react('🟨');
    yellowCards.push(m.author);
    setTimeout(() => {
      const ycidx = yellowCards.findIndex((y) => y === m.author);
      yellowCards.splice(ycidx, 1);
    }, carenciaYellowCard * 60 * 1000)
    return m.reply('DE NOVO?! Cartão amarelo pra você! 30 minutos sem poder falar comigo');
  };
  if (m.hasQuotedMsg && data.activeRound) {
    const isTopic = await m.getQuotedMessage();
    const matchingRegex = isTopic.body.match(/partida:\s\d+/);
    if (isTopic && isTopic.fromMe && matchingRegex) {
      if (data.activeRound.palpiteiros.some((p) => p === m.author)) {
        flooderList.push(m.author);
        const antiMala = setTimeout(() => {
          const advertido = flooderList.findIndex((f) => f === m.author);
          flooderList.splice(advertido, 1);
        }, carenciaFlooderList * 60 * 1000);
        return m.reply('Palpitando de novo pô?');
      }
      const sender = await m.getContact(m.from);
      const matchId = matchingRegex[0].split(':')[1].trim();
      if (data.activeRound.matchId === Number(matchId)) {
        habilitaPalpite({ m: m, user: sender.pushname || sender.name, matchId: matchId })
        return m.react('🎟');
      }
      m.reply('Essa rodada não está ativa!');
      flooderList.push(m.author);
      const antiMala = setTimeout(() => {
        const advertido = flooderList.findIndex((f) => f === m.author);
        flooderList.splice(advertido, 1);
      }, carenciaFlooderList * 60 * 1000);
    }
    return;
  }
  if (m.body.startsWith('!palpites') && data.activeRound && data.activeRound.listening) {
    if (flooderList.includes(m.author)) {
      m.react('🟨');
      return m.reply('Não foi você que acabou de pedir a lista de palpites? Toma um cartão amarelo pra você!')
    }
    const palpiteList = listaPalpites();
    flooderList.push(m.author);
    const antiMala = setTimeout(() => {
      const advertido = flooderList.findIndex((f) => f === m.author);
      flooderList.splice(advertido, 1);
    }, carenciaFlooderList * 60 * 1000);
    return client.sendMessage(m.from, palpiteList);
  };
  if (m.author === process.env.BOLAO_OWNER && m.body.startsWith('!stats')) {
    const command = getCommand(m.body);
    if (!command) return m.reply('Especifique o ID da partida');
    const statsPack = await getStats(command);
    if (statsPack.error) return m.reply('Erro buscando estatísticas da partida');
    return client.sendMessage(m.from, statsPack);
  };
  if (m.author === process.env.BOLAO_OWNER && m.body.startsWith('!bolao')) {
    const command = getCommand(m.body);
    const grupo = m.from.split('@')[0];
    if (command && command.startsWith('start')) {
      const searchedTeam = command.substring(5).trimStart()
      const teamIdx = data.teams.findIndex((team) => team.name === searchedTeam || team.slug === searchedTeam);
      if (Number(teamIdx) < 0) return m.reply(prompts.bolao.no_team);
      if (data[grupo] && data[grupo][data.teams[teamIdx].slug]) return m.reply('Bolão já está ativo!');
      const chat = await m.getChat();
      await start({ to: m.from, teamIdx: teamIdx, page: 0 });
      setTimeout(() => abreRodada(), 5000)
      await chat.sendStateTyping();
      return;
    };
    if (command && command.startsWith('ranking') && data.activeRound) {
      const ranking = (command.length > 7) ? getRanking(command.substring(7).trimStart()) : getRanking();
      client.sendMessage(m.from, ranking);
    }
    return m.reply('Oi, tô vivo')
  }
  return;
});
