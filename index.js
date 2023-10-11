const { client } = require('./src/wpconnect');
const { start, abreRodada } = require('./src/admin');
const { getCommand } = require('./utils/functions');
// const data = require('./data/data.json');
const data = require('./data/data.initial.json');
const prompts = require('./data/prompts.json');
const { writeData } = require('./utils/fileHandler');
const { habilitaPalpite } = require('./src/user');

(async () => {
  process.env.BOLAO_OWNER ? console.log('\n✔ Telefone do administrador:', process.env.BOLAO_OWNER.slice(2, -5), '\n') : console.error(prompts.admin.no_owner);
  console.log('\nTimes liberados para bolão:\n')
  data.teams.map((team) => console.log('\n- ', team.name))
  console.log(prompts.admin.welcome);
})();

client.on('message', async (m) => {
  if (m.hasQuotedMsg && data.listening.length > 0) {
    const isTopic = await m.getQuotedMessage();
    if (isTopic && isTopic.fromMe && isTopic.includes('Bolão aberto')) {
      const sender = await m.getContact(m.from);
      console.log('pushname', sender.pushname);
      console.log('name', sender.name);
      const matchId = isTopic.body.match(/partida:\d+/);
      console.log(matchId);
      habilitaPalpite({ m: m })
      return m.react('✅');
    }
    return;
  }

  if (m.author === process.env.BOLAO_OWNER && m.body.startsWith('!bolao')) {
    const command = getCommand(m.body);
    if (command && command.startsWith('config')) {
      const chat = await m.getChat();
      const searchedTeam = command.substring(6).trimStart()
      const teamIdx = data.conf.findIndex((team) => team.name === searchedTeam);
      if (Number(teamIdx) < 0) return client.sendMessage(m.from, prompts.bolao.no_team);
      if (data.conf[teamIdx].status === 'ativo') {
        return client.sendMessage(m.from, `Já existe um bolão ativo de ${data.conf[teamIdx].name}.\n\nPara cancelar, escreva *!bolao cancelar ${data.conf[teamIdx].name}*.`)
      }
      const timeoutInicio = setTimeout(() => start({ teamIdx: teamIdx, team: data.conf[teamIdx], page: 0, m: m, group: chat }), 5000);
      return await chat.sendStateTyping();;
    };
    if (command && command.startsWith('cancelar')) {
      const bolaoToCancel = command.slice(8).trim();
      if (bolaoToCancel) {
        const teamIdx = data.conf.findIndex((team) => team.name === bolaoToCancel || team.slug === bolaoToCancel);
        data.conf[teamIdx].status = "inativo";
        writeData(data);
        return client.sendMessage(m.from, prompts.admin.cancelled);
      };
    };
    if (data.listening.length === 1) return abreRodada({ m: m, id: data.listening[0] });
    if (data.listening.length > 1) return m.reply('Mais de um bolão aberto. Suporte em breve.');
    return m.reply('Esqueceu de alguma coisa?');
  }
  return;
});