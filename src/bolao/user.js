const data = require('./data/data.json');
const { writeData } = require('./utils/fileHandler');

const habilitaPalpite = (info) => {
  const today = new Date();
  const regex = /\d+\s*[x]\s*\d+/i
  if (!info.m.body.match(regex)) return { error: true };
  const homeScore = info.m.body.match(regex)[0].match(/^\d+/i);
  const awayScore = info.m.body.match(regex)[0].match(/\d+$/i);
  const palpiPack = ({
    userId: info.m.author,
    userName: info.user,
    homeScore: Number(homeScore),
    awayScore: Number(awayScore),
    resultado: Number(homeScore) > Number(awayScore) ? 'V' : Number(homeScore) < Number(awayScore) ? 'D' : 'E',
  })
  data[info.m.from].activeRound.palpiteiros.push(info.m.author);
  data[info.m.from][data[info.m.from].activeRound.team.slug][today.getFullYear()][info.matchId].palpites.push(palpiPack);
  writeData(data);
  return { error: false };
};

const listaPalpites = (grupo) => {
  const today = new Date();
  const match = data[grupo][data[grupo].activeRound.team.slug][today.getFullYear()][data[grupo].activeRound.matchId];
  let resposta = `📢 Lista de palpites registrados para ${match.homeTeam} x ${match.awayTeam} - ${match.rodada}ª rodada ${match.torneio}\n`
  match.palpites.forEach((palpite) => resposta += `\n▪ ${palpite.homeScore} x ${palpite.awayScore} (${palpite.userName})`);
  return resposta;
};

const getRanking = (grupo) => {
  data[grupo].ranking.sort((a, b) => a.pontos < b.pontos ? 1 : (a.pontos > b.pontos) ? -1 : 0);
  writeData(data);
  let response = `🏆 RANKING DO BOLÃO 🏆 \n`;
  data[grupo][data[grupo].activeRound.team.slug].ranking.forEach((pos, idx) => {
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




