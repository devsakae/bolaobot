
function getCommand(raw) {
  const divide = raw.split(' ');
  if (divide.length > 1) return raw.substring(divide[0].length).trimStart();
  return false;
}

function forMatch(match) {
  const data = new Date(match.startTimestamp * 1000);
  return `🚨 Bolão aberto 🚨
  
Registre seu palpite para *${match.homeTeam.name}* x *${match.awayTeam.name}* que vai acontecer em ${data.toLocaleString('pt-br')}

❓ *COMO JOGAR*: Responda essa mensagem com apenas seu palpite, no formato *MANDANTE SCORE x SCORE VISITANTE* (ex.: ${match.homeTeam.name} 1 x 2 ${match.awayTeam.name}).

🛑 Atenção: Este é um sistema de teste, portanto pode haver alguns BUGs. Caso isso aconteça, favor reportar ao dono do Bot.

ℹ️ *REGRAS*: Palpites válidos somente se enviados em até *30 minutos* antes da partida.

  ✅ Placar em cheio: *3 pontos*
  ✅ Vitória, empate ou derrota: *1 ponto*
  ✅ Acertar o placar de um dos times: *Ponto extra!*

Boa sorte!
Sistema de bolão hiper mega 🔝 desenvolvido por devsakae.tech
Id da partida: ${match.id}`;
}

module.exports = {
  getCommand,
  forMatch,
}