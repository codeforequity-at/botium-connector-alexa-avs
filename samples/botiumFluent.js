const BotDriver = require('botium-core').BotDriver

const driver = new BotDriver()

driver.BuildFluent()
  .Start()
  .UserSaysText('Alexa how is the weather in vienna?')
  .WaitBotSaysText((msg) => {
    console.log(msg)
  })
  .UserSaysText('Alexa alarm')
  .WaitBotSaysText(console.log)
  .UserSaysText('Alexa wake up')
  .WaitBotSaysText(console.log)
  .Stop()
  .Clean()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
