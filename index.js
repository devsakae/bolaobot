const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const prompt = require('prompt-sync')();
const { config } = require('dotenv');
config();

try {
  var data = JSON.parse(fs.readFileSync('./data/config.json'));
} catch (err) {
  const BOT_OWNER = prompt('> Qual o telefone do bot owner (formato 551199887766)? ');
  const GROUP_ID = prompt('> Qual o ID (WhatsApp) do grupo? ');
  const CLUB_ID = prompt('> Qual o ID (Football Api7) do clube? ');
  data = { BOT_OWNER: BOT_OWNER + '@c.us', GROUP_ID: GROUP_ID, CLUB_ID: CLUB_ID };
  fs.writeFileSync('./data/config.json', JSON.stringify(data, null, 4), 'utf-8', (err) => {
    if (err) return console.error('Verifique se você possui permissão de escrita em /data?')
  })
};

const client = new Client({ authStrategy: new LocalAuth() });
client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('Bolão bot inicializado!'));
client.initialize();

client.on('message', async (message) => {
  if (message.hasQuotedMsg && ouvindopalpites) {
    const quotedMessage = await message.getQuotedMessage();
    if (quotedMessage.body.includes('Bolão aberto')) {
      if (data.RODADA.some((p) => p === message.author)) {
        await message.react('❌')
        return message.reply('Você já palpitou!')
      }
      data.RODADA.push(message.author);
      
      const regex = /\d+\s*[xX]\s*\d+/
      if (regex.test(message.body)) {
        habilitaPalpite(ouvindopalpites, message);
        return message.react('✅');
      }
    }
    return;
  }
  if (message.body === '!block' && message.author === process.env.BOT_OWNER) {
    botworking = false;
    return client.sendMessage(message.from, 'Entrei de férias 😎 🏖');
  }
  if (message.body === '!unblock' && message.author === process.env.BOT_OWNER) {
    botworking = true;
    return message.reply('Tô na área');
  }
  if (message.body.startsWith('!') && botworking) {
    message.from.includes(process.env.BOLAO_GROUP_ID) && bolaoSystemFunc(message);
  }
  if (message.from === process.env.BOT_OWNER) bolaoSystemFunc(message);
  return;
});

// Função que checa o resultado de uma partida e manda para o canal
async function confereResultado(to) {
  try {
    const idResponse = await buscaIdAtivo();
    if (idResponse.code === 404) {
      const response = organizaRanking(memoryRanking);
      return client.sendMessage(to, response);
    }
    if (idResponse.code === 500) return adminWarning(idResponse.message)
    const rankingDoJogo = await checkResults(idResponse.id);
    memoryRanking = rankingDoJogo.sort((a, b) => a.pontos < b.pontos ? 1 : (a.pontos > b.pontos) ? -1 : 0);
    let response = `🏆 Resultado do bolão da última partida 🏆
  
🥇 ${memoryRanking[0].autor} apostou *${memoryRanking[0].palpite}* (${memoryRanking[0].pontos} pontos)
🥈 ${memoryRanking[1].autor} apostou *${memoryRanking[1].palpite}* (${memoryRanking[1].pontos} pontos)
🥉 ${memoryRanking[2].autor} apostou *${memoryRanking[2].palpite}* (${memoryRanking[2].pontos} pontos)
--------\n`;
    const memoryRankingRest = memoryRanking.slice(3);
    memoryRankingRest.map((rest) => response += `${rest.autor} apostou ${rest.palpite} (${rest.pontos} pontos)\n`)
    response += '\nUsuários sem nome na lista enviem *!habilitar Nome ou apelido* para se cadastrar 👍';
    await database.collection('palpites').drop();
    await database.createCollection('palpites');
    return client.sendMessage(to, response);
  } catch (err) {
    console.error(err);
    return adminWarning(err);
  }
}

// Função que bloqueia novos palpites por expiração do prazo
async function encerraPalpite(message) {
  palpiters = [];
  const encerramento = '⛔️⛔️ Tempo esgotado! ⛔️⛔️\n\n'
  const listaDePalpites = await organizaPalpites({ method: 'jogo', id: id });
  client.sendMessage(to, encerramento + listaDePalpites);
  const hours = 4;
  const hoursInMs = hours * (60 * 60 * 1000);
  const agendaVerificacao = setTimeout(() => confereResultado(message.from), hoursInMs)
  ouvindopalpites = false;
  return;
}

// Escutador de comandos do bolão
async function bolaoSystemFunc(message) {
  if (message.from === process.env.BOT_OWNER && message.body === '/bolao start') {
    await database.collection(process.env.BOLAO_RAPIDAPI_CLUBID).drop();
    const response = await novoBolao(0);
    if (response.code === 500) return adminWarning(response.message);
    client.sendMessage(process.env.BOLAO_GROUP_ID + '@g.us', response.message);
  }
  if (message.author === process.env.BOT_OWNER) {
    switch (message.body) {
      case '!bolao':
        const newResponse = await proximaPartida();
        if (ouvindopalpites) {
          () => clearTimeout();
          const triggerImpedimento = setTimeout(() => encerraPalpite(message.from, newResponse.trigger.id), newResponse.trigger.timeoutms);
          return adminWarning('Bolão em andamento!');
        }
        if (newResponse.code === 500) return adminWarning(newResponse.error);
        if (newResponse.code === 404) return adminWarning(newResponse.message);
        ouvindopalpites = newResponse?.trigger.id;
        () => clearTimeout();
        const triggerImpedimento = setTimeout(() => encerraPalpite(message.from, newResponse.trigger.id), newResponse.trigger.timeoutms);
        return client.sendMessage(message.from, newResponse.message);
      case '!palpites':
        const miniRanking = await organizaPalpites({ method: 'jogo', id: ouvindopalpites });
        client.sendMessage(message.from, miniRanking);
        break;
      case '!ranking':
        if (ouvindopalpites) return message.reply('Ranking trancado porque estou recebendo palpites pra próxima partida do bolão');
        confereResultado(message.from);
        break;
      default:
        break;
    }
  }
  if (message.body.startsWith('!habilitar')) {
    const habilitado = await habilitaJogador(message);
    if (habilitado.code === 500) return adminWarning(habilitado.message);
    if (habilitado.code === 401) return message.reply(`Você já está habilitado como *${habilitado.jogador}*, não vai mudar de nome e pronto`);
    message.react('🎟');
    return client.sendMessage(message.author, habilitado.message);
  }
  return;
}