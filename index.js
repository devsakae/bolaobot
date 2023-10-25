const { client, mongoclient } = require('./src/connections');
const data = require('./src/bolao/data/data.json');
const prompts = require('./src/bolao/data/prompts.json');
const { bolao } = require('./src/bolao');
const { quotes } = require('./src/quotes');

(async () => {
  try {
    await mongoclient.connect();
    await mongoclient
      .db('tigrebot')
      .command({ ping: 1 })
      .then((response) => {
        if (response) console.log('\n✔ Conexão com MongoDB');
        // MÓDULO BOLÃO - INÍCIO //
        if (!process.env.BOT_OWNER) return console.error(prompts.admin.no_owner);
        console.log('✔ Telefone do administrador:', process.env.BOLAO_OWNER.slice(2, -5))
        console.log('\nTimes liberados para disputa do bolão:');
        data.teams.forEach((team) => console.log('-', team.name));
        // MÓDULO BOLÃO - FIM //
      });
  } catch (err) {
    return console.error(err);
  } finally {
    console.log('\n' + prompts.admin.welcome);
  }
})();
// pm2 start npm --name "BolaoBot" -- start && pm2 monit

client.on('message', async (m) => {
  if (
    // m.from === '554896059196-1392584319@g.us' &&
    // (
    m.body.startsWith('!quote') ||
    m.body.startsWith('!addquote') ||
    m.body.startsWith('!jogounotigre') ||
    m.body.startsWith('!autor') ||
    m.body.startsWith('!data') ||
    m.body.startsWith('!delquote')
    // )
  ) {
    await quotes(m);
  }
  await bolao(m);
});
