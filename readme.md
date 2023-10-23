# BolãoBot

### Requisitos de instalação

- [ ] Criar o arquivo .env
- [ ] Node >= 20.6.0
- [ ] Ajuste wwebjs/src/Client.js (175)
```const INTRO_IMG_SELECTOR = 'div[role=\'textbox\']';```
- [ ] Ao finalizar versão, subir com scp * login@host (com sessão ssh válida)

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

**Licença premium** (~~R$ 29,90/mês~~ **OFERTA POR TEMPO LIMITADO**: R$ 14,90/mês):
- [x] Funcionamento em até 3 grupos;
- [x] Odds da partida na abertura da rodada;
- [x] Ranking completo e consolidado;
- [x] Vários administradores;
- [x] Cálculo automático do ranking logo após a partida;
- [x] Sem conta de API!
- [x] Sem banco de dados!
- [x] *NOVO*: Permite que usuários adicionem prêmios ao campeão

### Instruções de uso:

Inicie o bolão do seu clube de futebol com

    !bolao start <time (obrigatório)>

E pronto! O BolãoBot iniciará e administrará o seu bolão de forma automática até o final da temporada de jogos do seu time :)

#### >> Comandos inteligentes:

Administrador: Mostrar o ranking completo e consolidado do bolão
Usuário: Responde a mensagem com a colocação e pontos apenas do usuário

    !bolao ranking

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