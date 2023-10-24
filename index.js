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
      });
  } catch (err) {
    console.error(err);
  }
  process.env.BOLAO_OWNER
    ? console.log(
        '✔ Telefone do administrador:',
        process.env.BOLAO_OWNER.slice(2, -5),
        '\n',
      )
    : console.error(prompts.admin.no_owner);
  console.log('Times liberados para disputa do bolão:');
  data.teams.forEach((team) => console.log('-', team.name));
  console.log('\n' + prompts.admin.welcome);
})();

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
