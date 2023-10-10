const { client } = require('./src/whatsappconnection');
const { start } = require('./src/admin');
const { getCommand } = require('./utils/functions');
const data = require('./data/data.json');
const prompts = require('./data/prompts.json');
const { writeData } = require('./utils/fileHandler');

(async () => {
  console.log(prompts.admin.welcome);
  process.env.BOLAO_OWNER ? console.log('Telefone do administrador:', process.env.BOLAO_OWNER.slice(2, -5)) : console.error(prompts.admin.no_owner);
})();

client.on('message', async (m) => {
  if (m.author === process.env.BOLAO_OWNER && m.body.startsWith('!bolao')) {
    const command = getCommand(m.body);
    if (command && command.startsWith('config')) {
      const chat = await m.getChat();
      const requiredTeam = command.substring(6).trimStart();
      const checkBolaoAtivo = data.boloes.find((bolao) => bolao.name === requiredTeam);
      if (checkBolaoAtivo) {
        if (checkBolaoAtivo.status === 'ativo') return client.sendMessage(m.from, `Já existe um bolão ativo de ${requiredTeam}.\n\nPara cancelar, escreva *!bolao cancelar ${requiredTeam}*.`)
        return client.sendMessage(m.from, 'Reiniciando bolão')
      }
      let searchTeam = data.brasil.find((team) => team.name === requiredTeam);
      if (searchTeam) {
        const timeoutInicio = setTimeout(() => {
          start({ team: searchTeam, page: 0, m: m, group: chat });
          searchTeam = null;
        }, 3000);
        await chat.sendStateTyping();
        return client.sendMessage(m.from, `Iniciando bolão do *${searchTeam.name}*!`);
      }
      return client.sendMessage(m.from, prompts.bolao.no_team)
    }
    if (command && command.startsWith('cancelar')) {
      const bolaoIdToCancel = command.slice(8).trim();
      if (bolaoIdToCancel) {
        const bolaoFound = data.boloes.findIndex((bolao) => bolao.name === bolaoIdToCancel || bolao.id === bolaoIdToCancel);
        if (bolaoFound >= 0) {
          data.boloes[bolaoFound] = ({ ...data.boloes[bolaoFound], status: 'inativo' })
          writeData(data);
          return client.sendMessage(m.from, prompts.admin.cancelled);
        };
        return client.sendMessage(m.from, prompts.admin.verifyIdOrName);
      };
    }
    let specify_response = prompts.admin.not_specified_bolao;
    data.boloes.map((bolao) => {
      if (bolao.status === 'ativo') specify_response += `\n▪️ ${bolao.name}`;
    })
    return client.sendMessage(m.from, specify_response);
  }
  return;
});