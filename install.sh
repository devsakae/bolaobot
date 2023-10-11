#!/bin/bash

printf "\n### Bem vindo ao BolãoBot v1.0 - http://bolao.devsakae.tech ###\n"
if ! test -f ./data/data.json; then
  printf "\n✔ Criando arquivo de configurações"
  cp ./data/example.json ./data/data.json
fi
  node --env-file=.env index.js