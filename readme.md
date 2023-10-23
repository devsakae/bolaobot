# BolãoBot

BolãoBot é um chatbot de WhatsApp (whatsapp.com) que funciona 24 horas por dia e organiza o bolão do seu grupo de futebol entre amigos!

Após a configuração inicial, o chatbot automaticamente irá abrir a rodada de palpites em 36 horas antes do apito inicial da próxima partida, buscando o resultado após o apito final, e calculando o ranking no dia seguinte.

### Funcionalidades

**Funcionalidades**:
- [x] Funcionamento sem banco de dados (salvamento em arquivo json);
- [x] Ranking completo e consolidado;
- [x] Cálculo automático do ranking logo após a partida;

**To-do list**:
- [ ] Ampliar a lista de clubes;
- [ ] Odds da partida na abertura da rodada;
- [ ] Administradores de acordo com a configuração do grupo;
- [ ] Permitir instalação em mais de um grupo;

### Requisitos de instalação

- [x] Possuir credenciais de conta de API de futebol (uso pago, por request);
- [x] Configurar o arquivo .env;
- [x] Servidor node v20.6.0 ou superior;
- [x] Ajuste wwebjs/src/Client.js (175) conforme issue #2473 de Set/5;

### Instruções de uso:

##### Comandos exclusivos de administrador

Verifica se bot está online

```!bolao```

Inicia um bolão novo

```!bolao start <time>```

Verifica palpites cadastrados

```!palpites```

##### Comandos inteligentes (resposta de acordo com função do usuário)

Administrador: Mostra o ranking completo e consolidado do bolão;
Usuário: Responde a mensagem com a colocação e pontos do usuário no ranking;
```!ranking```

Administrador: Mostra o histórico dos últimos 10 palpites do usuário
Usuário: Mostra o histórico dos últimos 3 palpites do usuário
```!historico <usuario>```

Administrador: Exclui o usuário do bolão
Usuário: Exclui todos os dados do usuário no bolão
```!bolao exclusao <usuario>```

Exclusividade: devsakae.tech
