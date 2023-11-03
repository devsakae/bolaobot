const { client, mongoclient } = require('./src/connections');
const defaultdata = require('./src/bolao/data/example.json');
const prompts = require('./src/bolao/data/prompts.json');
const { bolao } = require('./src/bolao');
const { quotes } = require('./src/quotes');
const { predictions } = require('./src/bolao/admin');
const { replyUser } = require('./src/jokes');
const { narrador } = require('./src/narrador');

let modoNarrador = false;

(async () => {
  try {
    await mongoclient.connect();
    await mongoclient
      .db('tigrebot')
      .command({ ping: 1 })
      .then((response) => {
        if (response) console.log('\n✔ Conexão com MongoDB');
        // MÓDULO BOLÃO - INÍCIO //
        if (!process.env.BOT_OWNER)
          return console.error(prompts.admin.no_owner);
        console.log(
          '✔ Telefone do administrador:',
          process.env.BOT_OWNER.slice(2, -5),
        );
        console.log('\nTimes liberados para disputa do bolão:');
        let allTeams = defaultdata.teams[0].name;
        defaultdata.teams.shift();
        defaultdata.teams.forEach((team) => (allTeams += ' | ' + team.name));
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
  // Módulo Quotes (usa: MongoDB)
  if (
    m.body.startsWith('!quote') ||
    m.body.startsWith('!addquote') ||
    m.body.startsWith('!jogounotigre') ||
    m.body.startsWith('!autor') ||
    m.body.startsWith('!data') ||
    m.body.startsWith('!delquote')
  ) 
  await quotes(m);
  
  // Módulo Predictions (usa: RapidApi/Football Api)
  if (
    m.body.startsWith('!predict') &&
    (m.author === process.env.BOT_OWNER || m.from === process.env.BOT_OWNER)
  ) 
  await predictions(m.from);

  // Módulo Jokes (usa: RapidApi/Dad Jokes, Useless Fact Api)
  if (m.mentionedIds.includes(process.env.BOT_NUMBER)) {
    const chat = await m.getChat();
    chat.sendStateTyping();
    return await replyUser(m);
  };

  // Módulo narrador de jogo
  if (m.body.startsWith('!lancealance')) {
    if (modoNarrador) return;
    modoNarrador = true;
    await narrador(m);
    const backToNormal = setTimeout(() => modoNarrador = false, 3 * 3600000);
  }

  // Módulo Bolão (usa: RapidApi/Foot Api)
  await bolao(m);
});
