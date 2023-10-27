const data = require('./data/data.json');
const { writeData } = require('./utils/fileHandler');

async function habilitaPalpite(info) {
  const grupo = info.m.from.split('@')[0];
  const today = new Date();
  const regex = /\d+\s*[x]\s*\d+/i
  if (!info.m.body.match(regex)) return info.m.reply('Isso é um palpite? Onde?');
  const homeScore = info.m.body.match(regex)[0].match(/^\d+/i);
  const awayScore = info.m.body.match(regex)[0].match(/\d+$/i);
  const palpiPack = ({
    userId: info.m.author,
    userName: info.user,
    homeScore: Number(homeScore),
    awayScore: Number(awayScore),
    resultado: Number(homeScore) > Number(awayScore) ? 'V' : Number(homeScore) < Number(awayScore) ? 'D' : 'E',
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

function getRanking(round) {
  if (round) {
    const today = new Date();
    const historico = Object.values(data[data.activeRound.grupo][data.activeRound.team][today.getFullYear()])
    const gotcha = historico.find((match) => match.rodada === Number(round));
    if (gotcha) return gotcha.ranking;
    return 'Ranking não existe';
  };
  data.ranking.sort((a, b) => a.pontos < b.pontos ? 1 : (a.pontos > b.pontos) ? -1 : 0);
  writeData(data);
  let response = `🏆 RANKING DO BOLÃO 🏆 \n`;
  data.ranking.forEach((pos, idx) => {
    const medal = (idx === 0) ? '🥇 ' : (idx === 1) ? '🥈 ' : (idx === 2) ? '🥉 ' : `#${idx + 1} `;
    (pos.pontos > 0)
      ? response += `\n${medal}${pos.usuario} com ${pos.pontos} ponto(s)`
      : response += `\n👎 ${pos.usuario} (sem pontuação)`
  });
  return response;
};

module.exports = { 
  habilitaPalpite,
  listaPalpites,
  getRanking,
}