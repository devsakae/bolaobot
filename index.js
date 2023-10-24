const { client } = require('./src/bolao/wpconnect');
const data = require('./src/bolao/data/data.json');
const prompts = require('./src/bolao/data/prompts.json');
const { bolao } = require('./src/bolao');

(async () => {
  process.env.BOLAO_OWNER ? console.log('\n✔ Telefone do administrador:', process.env.BOLAO_OWNER.slice(2, -5), '\n') : console.error(prompts.admin.no_owner);
  console.log('Times liberados para disputa do bolão:')
  data.teams.forEach((team) => console.log('-', team.name))
  console.log('\n' + prompts.admin.welcome);
})();

client.on('message', async (m) => {
  await bolao(m);
});
