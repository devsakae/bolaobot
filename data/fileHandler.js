const fs = require('fs');

function writeTeams(data) {
  fs.writeFileSync('./data/teams.json', JSON.stringify(data, null, 4), 'utf-8', (err) => {
    if (err) return console.error('Verifique se você possui permissão de escrita em /data?')
  })
}

module.exports = {
  writeTeams,
}