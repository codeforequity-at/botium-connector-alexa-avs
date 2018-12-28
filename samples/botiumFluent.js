const BotDriver = require('botium-core').BotDriver

const driver = new BotDriver()

driver.BuildFluent()
  .Start()
  .UserSaysText('ich möchte waschmittel kaufen ?')
  .WaitBotSaysText((msg) => {
    console.log(msg)
  })
  .WaitBotSaysText((msg) => {
    console.log(msg)
  })
  .WaitBotSaysText((msg) => {
    console.log(msg)
  })
  .UserSaysText('abbrechen bitte')
  .WaitBotSaysText((msg) => {
    console.log(msg)
  })
// .UserSaysText('Danke')
// .WaitBotSaysText(console.log)
  .Stop()
  .Clean()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
