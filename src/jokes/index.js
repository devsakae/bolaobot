const { default: axios } = require('axios');
const { sendAdmin } = require('../bolao/utils/functions');
const { client } = require('../connections');

let jokeLimit = false;

const replyUser = async (m) => {
  if (m.body.match(/piada/gi) && !jokeLimit) {
    jokeLimit = true;
    const joke = await getJokes();
    m.reply(joke.setup);
    const punchline = setTimeout(() => client.sendMessage(m.from, joke.punchline), 2000);
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
    return sendAdmin(err);
  }
};

const getJokes = async () => {
  try {
    const joke = await axios.request({
      method: 'GET',
      url: 'https://dad-jokes.p.rapidapi.com/random/joke',
      headers: {
        'X-RapidAPI-Key': process.env.BOLAO_RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'dad-jokes.p.rapidapi.com',
      }
    });
    return joke.data.body[0];
  } catch (err) {
    return sendAdmin(err);
  }
}

module.exports = {
  replyUser,
  getUselessFact,
  getJokes,
}