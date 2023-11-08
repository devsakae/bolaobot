const { default: axios } = require('axios');
const { client } = require('../connections');
const { fetchApi } = require('../../utils/fetchApi');

const oraculo = [
  'Sim. Definitivamente sim.',
  'É claro que não',
  'Por óbvio, a resposta é um retumbante SIM',
  'Jamais!!! Tá maluco??',
  'Hummmm... Pode ser...',
  'Claro claro, vai na frente que o Bot já vai',

]
let jokeLimit = false;

const replyUser = async (m) => {
  if (m.body.endsWith('?')) {
    const random = Math.floor(Math.random() * oraculo.length);
    return m.reply(oraculo[random]);
  }
  if (m.body.match(/piada/gi) && !jokeLimit) {
    jokeLimit = true;
    const joke = await getJokes();
    m.reply(joke.setup);
    const punchline = setTimeout(() => client.sendMessage(m.from, joke.punchline), 13000);
    const liberaNovaJoke = setTimeout(() => jokeLimit = false, 5400000);
    return;
  };
  const uselessFact = await getUselessFact();
  return m.reply(uselessFact);
}

const getUselessFact = async () => {
  try {
    const uselessFact = await axios.request({
      method: 'GET',
      url: 'https://uselessfacts.jsph.pl/api/v2/facts/random',
    });
    return uselessFact.data.text;
  } catch (err) {
    console.error(err)
    return client.sendMessage(process.env.BOT_OWNER, err);
  }
};

const getJokes = async () => {
  try {
    const joke = await fetchApi({
      url: 'https://dad-jokes.p.rapidapi.com/random/joke',
      host: 'dad-jokes.p.rapidapi.com',
    });
    return joke.body[0];
  } catch (err) {
    console.error(err)
    return client.sendMessage(process.env.BOT_OWNER, err);
  }
}

module.exports = {
  replyUser,
  getUselessFact,
  getJokes,
}