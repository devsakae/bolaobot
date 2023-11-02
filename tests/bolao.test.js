const { predictions } = require('../src/bolao/admin');

// test('enviroment variables', () => {
//   expect(process.env.BOT_OWNER).toBe('554891371440@c.us')
// })

test('predictions test', () => {
  predictions();
})