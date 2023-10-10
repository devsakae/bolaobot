const { client } = require('./src/whatsappconnection');
const { start, pong } = require('./src/admin');
const teams = require('./data/teams.json');

(async () => {
  console.log('Bem vindo ao BolãoBot! Aguarde, carregando a conexão com o WhatsApp...');
  console.log('Admin:', process.env.BOLAO_OWNER.slice(0, -5));
})();

client.on('message', async (m) => {
  if (m.from === process.env.BOLAO_OWNER || m.author === process.env.BOLAO_OWNER) {
    if (m.body.startsWith('/bolao config')) {
      const requiredTeam = m.body.slice(13).trim();
      if (teams.boloes.some((team) => team.name === requiredTeam)) {
        return client.sendMessage(m.from, `Já existe um bolão ativo de ${requiredTeam}.\n\nPara cancelar, escreva */bolao cancelar ${requiredTeam}*.`)
      }
      let searchTeam = teams.brasil.find((team) => team.name === requiredTeam);
      if (searchTeam) {
        const timeoutInicio = setTimeout(() => {
          start({ team: searchTeam, page: 0, m: m });
          searchTeam = null;
        }, 3000);
        return client.sendMessage(process.env.BOLAO_OWNER, 'Iniciando bolão em 3 segundos...');
      }
      return client.sendMessage(process.env.BOLAO_OWNER, 'Nenhum time cadastrado.')
    }
    if (m.body.startsWith('/bolao cancelar')) {
      const requiredTeam = m.body.slice(15).trim();
      
    }
    switch (m.body) {
      case '!ping':
        pong();
      case '!bolao':
        return client.sendMessage(m.from, 'Iniciando bolão');
      case '/bolao pause':
        return client.sendMessage(m.from, 'Pausando bolão');
      case '/bolao continue':
        return client.sendMessage(m.from, 'Continuando bolão');
      default:
        return;
    }
  }
  return;
});