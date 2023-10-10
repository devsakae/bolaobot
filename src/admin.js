const { client } = require('./whatsappconnection');
const axios = require('axios');
const { writeTeams } = require('../data/fileHandler');
const teams = require('../data/teams.json');
const rapidapiurl = 'https://footapi7.p.rapidapi.com/api';

async function fetchData(url) {
  try {
    const response = await axios.request({
      method: 'GET',
      url: url,
      headers: {
        'X-RapidAPI-Key': process.env.BOLAO_RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.BOLAO_RAPIDAPI_HOST,
      },
    });
    return response.data;
  } catch (err) {
    return 'ERROR';
  }
}

function ping() {
  return client.sendMessage(process.env.BOLAO_OWNER, 'pong')
}

async function start(info) {
  (Number(info.page) < 1) && teams.boloes.push({ ...info.team, active: true, group: info.group });
  try {
    const dataFromApi = await fetchData(rapidapiurl + '/team/' + info.team.id + '/matches/next/' + info.page);
    teams[info.team.name] = dataFromApi.events;
    writeTeams(teams);
    while (dataFromApi.hasNextPage) {
      start({ ...info, page: info.page++ })
    }
    client.sendMessage(info.m.from, `👉 Bolão dos jogos do *${info.team.name}* criado!\n\nRegistre-se com *!habilitar [apelido]* (máx. 20 caracteres).`);
  } catch (err) {
    console.error(err);
    return { code: 500, message: err };
  }
}

module.exports = {
  ping,
  start,
}