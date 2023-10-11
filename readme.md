# BolãoBot

### O que é?
BolãoBot é um chatbot de WhatsApp (whatsapp.com) que funciona 24 horas por dia e organiza o bolão do seu grupo!

**Limitações da versão gratuita**:
- [ ] Funcionamento em vários grupos;
- [x] Funcionamento em apenas um grupo;
- [ ] Odds da partida na abertura da rodada;
- [ ] Ranking completo e consolidado;
- [x] Ranking top 10 da rodada;
- [ ] Bolão de mais de 2.000 clubes
- [x] Bolão de clubes do Campeonato Brasileiro da Série B;
- [ ]  Vários administradores;
- [x] Necessário conta de API de futebol;
- [x] Necessário conta de MongoDB;

**Licença premium** (~~R$ 49,90/mês~~ **OFERTA POR TEMPO LIMITADO**: R$ 19,90/mês):
- [x] Funcionamento em até 3 grupos;
- [x] Odds da partida na abertura da rodada;
- [x] Ranking completo e consolidado;
- [x] Vários administradores;
- [x] Cálculo automático do ranking logo após a partida;
- [x] Necessário conta gratuita de API de futebol;
- [x] Sem banco de dados! Salvamento direto no seu servidor!
- [x] *NOVO*: Permite que usuários adicionem prêmios ao campeão

### Uso na versão gratuita

Instale com npm run config

Após a instalação completa no servidor, você deverá escrever no canal que deseja ativar o bolão:

    !bolao config <nome do time>

Para abrir a próxima rodada:

    !bolao start

Pedir o ranking:

    !ranking

### Uso na versão PREMIUM:

Após a instalação completa no servidor, você deverá escrever no canal que deseja ativar o bolão:

    !bolao config <nome do time>

E pronto! O BolãoBot iniciará e administrará o seu bolão de forma automática até o final da temporada de jogos do seu time :)

#### >> Comandos inteligentes:

Administrador: Mostrar o ranking completo e consolidado do bolão
Usuário: Mostrar a posição no ranking

    !ranking

Administrador: Mostra o histórico dos últimos 10 palpites do usuário
Usuário: Mostra o histórico dos últimos 3 palpites do usuário

    !historico <nome ou id do usuário>

Administrador: Exclui o usuário do bolão
Usuário: Exclui todos os dados do usuário no bolão

`!excluir <nome ou id do usuário>`

#### >> Administração:
Comandos válidos somente se o usuário é administrador do grupo

Pausa ou continua o bolão:

    !bolao [pausa / continua]

Interessou? Saiba mais em http://bolao.devsakae.tech