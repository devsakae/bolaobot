const { client, mongoclient } = require('./src/connections');
const data = require('./src/bolao/data/data.json');
const defaultdata = require('./src/bolao/data/example.json');
const prompts = require('./src/bolao/data/prompts.json');
const { bolao } = require('./src/bolao');
const { quotes } = require('./src/quotes');
const { predictions } = require('./src/bolao/admin');

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
        console.log('✔ Telefone do administrador:', process.env.BOT_OWNER.slice(2, -5))
        console.log('\nTimes liberados para disputa do bolão:');
        let allTeams = defaultdata.teams[0].name
        defaultdata.teams.shift();
        defaultdata.teams.forEach((team) => allTeams += (' | ' + team.name));
        console.log(allTeams);
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
    m.body.startsWith('!quote') ||
    m.body.startsWith('!addquote') ||
    m.body.startsWith('!jogounotigre') ||
    m.body.startsWith('!autor') ||
    m.body.startsWith('!data') ||
    m.body.startsWith('!delquote')
  ) await quotes(m)
  if (m.body.startsWith('!teste') && m.author === process.env.BOT_OWNER) {
    const chat = m.getChat();
    (await chat).sendStateTyping();
    return await predictions(m.from);
  }
  await bolao(m);
});
