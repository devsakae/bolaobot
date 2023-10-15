
function getCommand(raw) {
  const divide = raw.split(' ');
  if (divide.length > 1) return raw.substring(divide[0].length).trimStart();
  return false;
}

function forMatch(match) {
  const data = new Date(match.hora);
  return `🚨🚨 BOLÃO ABERTO! 🚨🚨

⚽️ ${match.homeTeam} x ${match.awayTeam} 🏆 ${match.torneio} 🗓 ${data.toLocaleString('pt-br')}

*COMO JOGAR*: Responda essa mensagem com apenas seu palpite, no formato:

👉👉 *<mandante> <placar> x <placar> <visitante>* 👈👈
ex.: ${match.homeTeam} ${Math.floor(Math.random() * 5)} x ${Math.floor(Math.random() * 5)} ${match.awayTeam}

Palpites válidos somente se enviados em até *10 minutos* antes da partida e o Bot tiver reagido à mensagem com o emoji 🎟. Se não tiver, o palpite não é válido!

*REGRAS*: Esse jogo é pra brincar, não é pra avacalhar!

✅ Acertou o placar em cheio: *3 pontos*
✅ Acertar vitória, empate ou derrota e o placar de um dos times: *2 pontos*
✅ Acertar vitória, empate ou derrota: *1 ponto*
🚫 Repetir palpite
🚫 Flood (leva cartão amarelo)
⚖️ Desempate: Palpite mais antigo leva

Boa sorte!

Sistema de bolão ©️ devsakae.tech
Id da partida: ${match.id}`;
}

module.exports = {
  getCommand,
  forMatch,
}