const { client } = require('./src/wpconnect');
const { start, abreRodada } = require('./src/admin');
const { getCommand } = require('./utils/functions');
const data = require('./data/data.json');
const prompts = require('./data/prompts.json');
const { habilitaPalpite, listaPalpites } = require('./src/user');
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
        return m.react('✅');
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
      return m.reply('Não foi você que acabou de pedir a lista de palpites? Toma um cartão amarelo pra você então!')
    }
    const palpiteList = listaPalpites();
    flooderList.push(m.author);
    const antiMala = setTimeout(() => {
      const advertido = flooderList.findIndex((f) => f === m.author);
      flooderList.splice(advertido, 1);
    }, carenciaFlooderList * 60 * 1000);
    return client.sendMessage(m.from, palpiteList);
  };
  if (m.author === process.env.BOLAO_OWNER && m.body.startsWith('!bolao')) {
    const command = getCommand(m.body);
    const grupo = m.from.split('@')[0];
    if (command && command.startsWith('config')) {
      const searchedTeam = command.substring(6).trimStart()
      const teamIdx = data.teams.findIndex((team) => team.name === searchedTeam || team.slug === searchedTeam);
      if (Number(teamIdx) < 0) return m.reply(prompts.bolao.no_team);
      if (data[grupo] && data[grupo][data.teams[teamIdx].slug]) return m.reply('Bolão já está ativo!')
      start({ to: m.from, teamIdx: teamIdx, page: 0 });
      setTimeout(() => abreRodada({ to: m.from, teamIdx: teamIdx }), 5000)
      const chat = await m.getChat();
      return await chat.sendStateTyping();
    };
    if (data.activeRound) return abreRodada({ to: m.from, teamIdx: data.teams.findIndex((team) => team.slug === data.activeRound.team) })
    return m.reply('Tô funcionando, só escreve aí o que tu precisa (ou quer ler as regras de novo?)')
  }
  return;
});