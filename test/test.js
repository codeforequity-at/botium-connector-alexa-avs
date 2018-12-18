const Connector = require('../index').PluginClass

const connector = new Connector(
  {
    caps:
      {
        'ALEXA_AVS_AVS_CLIENT_ID': 'xxx',
        'ALEXA_AVS_AVS_REFRESH_TOKEN': 'xxx',
        'ALEXA_AVS_AVS_LANGUAGE_CODE': 'en_US',
        'ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_PRIVATE_KEY': 'xxx',
        'ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_CLIENT_EMAIL': 'xxx',
        'ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_LANGUAGE_CODE': 'en_US',
        'ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY': 'xxx',
        'ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL': 'xxx',
        'ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE': 'en_US'
      },
    queueBotSays: (message) => console.log(`Alexa answered: "${message}"`)
  }
)

connector.Validate()
  .then(() => connector.Build())
  .then(() => connector.Start())
  .then(() => connector.UserSays('Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna?Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna?Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna?Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna?Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna?Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna?Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna?Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna?Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna?Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna?Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna?Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna?Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna?Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna? Alexa how is the weather in vienna?Alexa how is the weather in vienna? '))
  .then(() => connector.Stop())
  .then(() => connector.Clean())
  .catch((ex) => console.log(ex))
