const prompts = require('./data/prompts.json');
const data = require('./data/data.json');
const { client } = require('../connections');
const { listaPalpites } = require('./user');
const { writeData } = require('./utils/fileHandler');
const { forMatch, formatPredicts, sendAdmin } = require('./utils/functions');
const { fetchWithParams } = require('../../utils/fetchApi');

const start = (info) => {
  if (Object.hasOwn(data, info.grupo) && Object.hasOwn(data[info.grupo], 'activeRound')) return client.sendMessage(info.grupo, `Este grupo já tem um bolão ativo dos jogos de ${info.team.name}.`)
  if (!Object.hasOwn(data, info.grupo)) {
    data[info.grupo] = {
      activeRound: {
        team: info.team,
        started: new Date(),
      },
    };
    writeData(data);
  }
  abreRodada(info.grupo);
  return client.sendMessage(
    info.grupo,
    `Bolão de jogos do *${info.team.name}* iniciado.`,
  );
};

const pegaProximaRodada = async (grupo) => {
  try {
    const getNextMatches = await fetchWithParams({
      url: process.env.FOOTBALL_API_URL + '/fixtures',
      host: process.env.FOOTBALL_API_HOST,
      params: {
        team: data[grupo].activeRound.team.id,
        next: 3,
      },
    });
    if (getNextMatches.response.length < 1)
      return client.sendMessage(grupo, prompts.bolao.no_matches);
    const today = new Date();
    Object.hasOwn(data, grupo) &&
    Object.hasOwn(grupo, 'activeRound') &&
    Object.hasOwn(data[grupo].activeRound, 'team')
      ? (data[grupo] = {
          ...data[grupo],
          [data[grupo].activeRound.team.slug]: {
            ...data[grupo][data[grupo].activeRound.team.slug],
            [today.getFullYear()]: {
              ...data[grupo][data[grupo].activeRound.team.slug][
                today.getFullYear()
              ],
            },
          },
        })
      : (data[grupo] = {
          ...data[grupo],
          [data[grupo].activeRound.team.slug]: {
            [today.getFullYear()]: {},
          },
        });
    let singleMatch;
    getNextMatches.response.forEach((event, idx) => {
      const matchPack = {
        id: event.fixture.id,
        homeTeam: event.teams.home.name,
        awayTeam: event.teams.away.name,
        hora: Number(event.fixture.timestamp) * 1000,
        torneio: event.league.name,
        torneioId: event.league.id,
        estadio: event.fixture.venue.name,
        status: event.fixture.status,
        rodada: event.league.round.match(/\d+$/gi)[0],
        palpites: [],
      };
      if (idx === 0) singleMatch = matchPack;
      data[grupo][data[grupo].activeRound.team.slug][today.getFullYear()][
        event.fixture.id
      ] = matchPack;
    });
    writeData(data);
    return singleMatch;
  } catch (err) {
    console.error(err);
    return { error: true };
  }
};

const abreRodada = async (grupo) => {
  const nextMatch = await pegaProximaRodada(grupo);
  if (nextMatch.error) return client.sendMessage(grupo, prompts.bolao.no_round);
  data[grupo].activeRound = {
    ...data[grupo].activeRound,
    listening: true,
    matchId: nextMatch.id,
    palpiteiros: [],
  };
  writeData(data);
  publicaRodada({ grupo: grupo, match: nextMatch });
};

const publicaRodada = ({ grupo, match }) => {
  const today = new Date();
  const horaNow = today.getTime();
  const texto = forMatch(match);
  const limiteDeTempoParaPalpitesEmMinutos = 10; // Fazer configurável
  const limiteConvertidoEmMs = limiteDeTempoParaPalpitesEmMinutos * 60000;
  const timeoutInMs = match.hora - horaNow - limiteConvertidoEmMs;
  () => clearTimeout(encerramentoProgramado);
  const encerramentoProgramado = setTimeout(
    () => encerraPalpite(grupo),
    timeoutInMs,
  );
  sendAdmin(
    `Rodada aberta! Previsão de término em ${new Date(
      horaNow + timeoutInMs,
    ).toLocaleString('pt-br')}`,
  );
  // predictions();
  return client.sendMessage(grupo, texto);
};

const encerraPalpite = (grupo) => {
  const today = new Date();
  const encerramento = '⛔️⛔️ Tempo esgotado! ⛔️⛔️\n\n';
  data[grupo].activeRound.listening = false;
  writeData(data);
  if (
    data[grupo][data[grupo].activeRound.team.slug][today.getFullYear()][
      data[grupo].activeRound.matchId
    ].palpites.length < 1
    )
    return client.sendMessage(grupo, 'Ninguém palpitou nessa rodada!');
  const listaDePalpites = listaPalpites(grupo);
  client.sendMessage(grupo, encerramento + listaDePalpites);
  const hours = 8; // Prazo (em horas) para buscar o resultado da partida após o encerramento dos palpites
  const hoursInMs = hours * 3600000;
  // const programaFechamento = setTimeout(() => fechaRodada(grupo), 5000) // TEST
  const programaFechamento = setTimeout(() => fechaRodada(grupo), hoursInMs);
  const comunicaNovoModulo = setTimeout(
    () =>
      client.sendMessage(
        grupo,
        'Ative o modo narrador escrevendo *!lancealance* após o início da partida 🐯',
      ),
    10 * 60000,
  );
};

const buscaResultado = async ({ grupo, tentativa }) => {
  if (tentativa > 5) return client.sendMessage(process.env.BOT_OWNER, 'Erro ao buscar resultado da partida. Verifique a API.');
  const matchInfo = await fetchWithParams({
    url: process.env.FOOTBALL_API_URL + '/fixtures',
    host: process.env.FOOTBALL_API_HOST,
    params: {
      id: data[grupo].activeRound.matchId,
    },
  });
  if ((!matchInfo || matchInfo.response[0].fixture.status.short !== 'FT')) {
    console.error('Fetch não realizado, será feita a tentativa n.', tentativa);
    const fetchAgain = setTimeout(() => fechaRodada({ grupo: grupo, tentativa: tentativa + 1 }), 45 * 60000);
    if (tentativa === 1) return { error: true }
    return;
  }
  return matchInfo
}

const fechaRodada = async (grupo) => {
  const matchInfo = await buscaResultado({ grupo: grupo, tentativa: 1 })
  if (matchInfo.error) return client.sendMessage(
    grupo,
    'Erro ao buscar resultado final da partida ' + data[grupo].activeRound.matchId + '. Será feita nova busca em alguns minutos.'
  );
  let response;
  const today = new Date();
  const homeScore = Number(matchInfo.response[0].goals.home);
  const awayScore = Number(matchInfo.response[0].goals.away);
  const resultado =
    homeScore > awayScore ? 'V' : homeScore < awayScore ? 'D' : 'E';
  const rankingDaRodada = data[grupo][data[grupo].activeRound.team.slug][
    today.getFullYear()
  ][data[grupo].activeRound.matchId].palpites
    .map((p) => {
      let pontos = 0;
      if (p.resultado === resultado) pontos = 1;
      if (
        p.resultado === resultado &&
        (p.homeScore === homeScore || p.awayScore === awayScore)
      )
        pontos = 2;
      if (p.homeScore === homeScore && p.awayScore === awayScore) pontos = 3;
      const playerIdx = data[grupo][data[grupo].activeRound.team.slug].ranking.findIndex(
        (player) => player.id === p.userId,
      );
      playerIdx < 0
        ? data[grupo][data[grupo].activeRound.team.slug].ranking.push({
            id: p.userId,
            usuario: p.userName,
            pontos: pontos,
          })
        : (data[grupo][data[grupo].activeRound.team.slug].ranking[playerIdx].pontos += pontos);
      return { ...p, pontos: pontos };
    })
    .sort((a, b) => (a.pontos < b.pontos ? 1 : a.pontos > b.pontos ? -1 : 0));
  if (rankingDaRodada[0].pontos === 0) {
    response = 'Ninguém pontuou na última rodada!';
    data[grupo][data[grupo].activeRound.team.slug][today.getFullYear()][data[grupo].activeRound.matchId] = {
      ...data[grupo][data[grupo].activeRound.team.slug][today.getFullYear()][data[grupo].activeRound.matchId],
      ranking: response,
      palpites: rankingDaRodada,
    };
    writeData(data);
    return sendAdmin(response) // client.sendMessage(grupo, response);
  }
  response = `🏁🏁 Resultado do bolão da ${data[grupo][data[grupo].activeRound.team.slug][today.getFullYear()][data[grupo].activeRound.matchId].rodada}ª rodada 🏁🏁\n`;
  response += `\nPartida: ${matchInfo.teams.home.name} ${matchInfo.teams.goals.home} x ${matchInfo.teams.goals.away} ${matchInfo.teams.away.name}\n`;
  rankingDaRodada.forEach((pos, idx) => {
    const medal =
      idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : '';
    pos.pontos > 0
      ? (response += `\n${medal}${pos.userName} fez ${pos.pontos} ponto(s) com o palpite ${pos.homeScore} x ${pos.awayScore} em ${pos.data}`)
      : (response += `\n${pos.userName} zerou com o palpite ${pos.homeScore} x ${pos.awayScore}`);
  });
  const nextMatch = pegaProximaRodada();
  if (nextMatch.error) return sendAdmin(prompts.bolao.encerra_bolao) // client.sendMessage(grupo, prompts.bolao.encerra_bolao);
  const calculatedTimeout = nextMatch.hora - 115200000 - today.getTime(); // Abre nova rodada 36 horas antes do jogo
  const proximaRodada = setTimeout(() => abreRodada(), calculatedTimeout);
  const dataDaAbertura = new Date(today.getTime() + calculatedTimeout);
  const informaAbertura = setTimeout(
    () =>
      client.sendMessage(
        grupo,
        `Próxima rodada com abertura programada para ${dataDaAbertura.toLocaleString(
          'pt-br',
        )}`,
      ),
    3600000,
  );
  data[grupo][data[grupo].activeRound.team.slug][today.getFullYear()][data[grupo].activeRound.matchId] = {
    ...data[grupo][data[grupo].activeRound.team.slug][today.getFullYear()][data[grupo].activeRound.matchId],
    ranking: response,
    palpites: rankingDaRodada,
  };
  data[grupo].activeRound = {
    ...data[grupo].activeRound,
    matchId: null,
    palpiteiros: []
  };
  writeData(data);
  return sendAdmin(response); // client.sendMessage(grupo, response);
};

const predictions = async (grupo) => {
  const today = new Date();
  const nextMatch =
    data[grupo][data[grupo].activeRound.team.slug][today.getFullYear()][
      data[grupo].activeRound.matchId
    ];
  if (nextMatch && Object.hasOwn(nextMatch, 'predictions'))
    return client.sendMessage(grupo, nextMatch.predictions.stats);
  try {
    const getPredictions = await fetchWithParams({
      url: process.env.FOOTBALL_API_URL + '/predictions',
      host: process.env.FOOTBALL_API_HOST,
      params: { fixture: data[grupo].activeRound.matchId },
    });
    const superStats = formatPredicts(getPredictions.response[0]);
    data[grupo][data[grupo].activeRound.team][today.getFullYear()][
      data[grupo].activeRound.matchId
    ].predictions = {
      stats: superStats,
    };
    writeData(data);
    return client.sendMessage(grupo, superStats);
  } catch (err) {
    console.error(err);
    return sendAdmin(err);
  }
};

module.exports = {
  start,
  abreRodada,
  publicaRodada,
  fechaRodada,
  pegaProximaRodada,
  predictions,
};
