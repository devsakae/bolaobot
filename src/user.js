const data = require('../data/data.json');
const { writeData } = require('../utils/fileHandler');

async function habilitaPalpite(info) {
  // info = { m: Message, bolao: '2023-criciuma-brasileiro-serie-b' }
  const regex = /\d+\s*[xX]\s*\d+/;
  let placar = info.m.body.match(regex)[0].split('x');
  if (placar.length < 2) placar = message.body.match(regex[0].split('X'));
  const homeScore = Number(placar[0].trim());
  const awayScore = Number(placar[1].trim());
  const resultado = Number(placar[0].trim()) > Number(placar[1].trim()) ? 'V' : Number(placar[0].trim()) < Number(placar[1].trim()) ? 'D' : 'E';
  console.log('Palpite computado', homeScore, ' (home) ', awayScore, ' (away) ', resultado, ' (resultado) ');
  // await database
  //   .collection('palpites')
  //   .insertOne({
  //     fone: message.author,
  //     jogo: Number(id),
  //     autor: username,
  //     palpite: { home: homeScore, away: awayScore, resultado: resultado },
  //   });
}

module.exports = { 
  habilitaPalpite,
}