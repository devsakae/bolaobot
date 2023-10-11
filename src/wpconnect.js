const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({ authStrategy: new LocalAuth() });
client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('\nBolãoBot em funcionamento!\n'));
client.initialize();

module.exports = {
  client,
}