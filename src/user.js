const data = require('../data/data.json');
const { writeData } = require('../utils/fileHandler');

async function habilitaPalpite(info) {
  // info = { m: Message, sender: Sender, matchId: 12345 }
  const grupo = info.m.from.split('@')[0];
  const today = new Date();
  const regex = /\d+\s*[xX]\s*\d+/;
  let placar = info.m.body.match(regex)[0].split('x');
  if (placar.length < 2) placar = message.body.match(regex[0].split('X'));
  const palpiPack = ({
    userId: info.m.author,
    userName: info.user,
    homeScore: Number(placar[0].trim()),
    awayScore: Number(placar[1].trim()),
    resultado: Number(placar[0].trim()) > Number(placar[1].trim()) ? 'V' : Number(placar[0].trim()) < Number(placar[1].trim()) ? 'D' : 'E',
  })
  data.activeRound.palpiteiros.push(info.m.author);
  data[grupo][data.activeRound.team][today.getFullYear()][info.matchId].palpites.push(palpiPack);
  writeData(data);
};

function listaPalpites() {
  const today = new Date();
  const match = data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()][data.activeRound.matchId];
  let resposta = `📢 Lista de palpites registrados para ${match.homeTeam} x ${match.awayTeam} - ${match.rodada}ª rodada ${match.torneio}\n`
  match.palpites.forEach((palpite) => resposta += `\n▪ ${palpite.homeScore} x ${palpite.awayScore} (${palpite.userName})`);
  return resposta;
};

function getRanking() {
  
}

module.exports = { 
  habilitaPalpite,
  listaPalpites,
  getRanking,
}