const debug = require('debug')('botium-connector-alexa_avs')

const Capabilities = {
  ALEXA_AVS_TTS: 'ALEXA_AVS_TTS',
  ALEXA_AVS_STT: 'ALEXA_AVS_STT'
}

const Defaults = {
  [Capabilities.ALEXA_AVS_TTS]: 'GOOGLE_CLOUD_TEXT_TO_SPEECH',
  [Capabilities.ALEXA_AVS_STT]: 'GOOGLE_CLOUD_SPEECH'
}

class BotiumConnectorAlexaAvs {
  constructor ({ queueBotSays, caps }) {
    this.queueBotSays = queueBotSays
    this.caps = caps
  }

  Validate () {
    debug('Validate called')
    if (!this.caps[Capabilities.ALEXA_AVS_TTS]) this.caps[Capabilities.ALEXA_AVS_TTS] = Defaults[Capabilities.ALEXA_AVS_TTS]

    this.tts = new (require('./tts/' + _.startCase(Capabilities.ALEXA_AVS_TTS)))(this.caps)
    this.tts.Validate()

    this.stt = new (require('./stt/' + _.startCase(Capabilities.ALEXA_AVS_STT)))(this.caps)
    this.stt.Validate()

    this.avs = new (require('./AVS')).AVS(this.caps)
    this.avs.Validate()

    return Promise.resolve()
  }

  Build () {
    debug('Build called')

    this.tts.Build()
    this.stt.Build()
    this.avs.Build()

    return Promise.resolve()
  }

  Start () {
    debug('Start called')

    return Promise.resolve()
  }

  UserSays (userAsText) {
    debug('UserSays called')
    /*
    executing text-to-speech
    calling avs
    executing speech-to-text
     */
    return this.tts.Synthesize(userAsText)
      .then((userAsSpeech) => this.avs.Ask(userAsSpeech))
      .then((botAsSpeech) => this.stt.Recognize(botAsSpeech))
      .then((botAsText) => this.queueBotSays(botAsText))
  }

  Stop () {
    debug('Stop called')

    this.tts = null
    this.stt = null
    this.avs = null

    return Promise.resolve()
  }

  Clean () {
    debug('Clean called')
    return Promise.resolve()
  }
}

module.exports = {
  PluginVersion: 1,
  PluginClass: BotiumConnectorAlexaAvs
}
