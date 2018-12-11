const debug = require('debug')('botium-connector-alexa_avs')
const _ = require('lodash')

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
    if (!this.caps[Capabilities.ALEXA_AVS_STT]) this.caps[Capabilities.ALEXA_AVS_STT] = Defaults[Capabilities.ALEXA_AVS_STT]

    this.tts = new (require('./src/tts/' + _toModuleName(this.caps[Capabilities.ALEXA_AVS_TTS])))(this.caps)
    this.tts.Validate()

    this.stt = new (require('./src/stt/' + _toModuleName(this.caps[Capabilities.ALEXA_AVS_STT])))(this.caps)
    this.stt.Validate()

    this.avs = new (require('./src/avs/AVS')).AVS(this.caps)
    this.avs.Validate()

    return Promise.resolve()
  }

  Build () {
    debug('Build called')

    return Promise.all([this.tts.Build(), this.stt.Build(), this.avs.Build()])
  }

  Start () {
    debug('Start called')

    return Promise.resolve()
  }

  UserSays (userAsText) {
    debug('UserSays called')
    debug(`User text ${userAsText} converting to speech...`)
    return this.tts.Synthesize(userAsText)
      .then((userAsSpeech) => {
        debug(`User text ${userAsText} converted to speech succesful`)
        debug(`Alexa answering...`)
        return this.avs.Ask(userAsSpeech)
      })
      .then((botAsSpeech) => {
        debug(`Alexa answered succesful`)
        debug(`Answer converting to text...`)
        return this.stt.Recognize(botAsSpeech)
      })
      .then((botAsText) => {
        debug(`Answer converted to text ${botAsText} succesful`)
        return this.queueBotSays(botAsText)
      })
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

// ALEXA_AVS_TTS
// ->
// AlexaAvsTts
const _toModuleName = (capsName) => {
  return capsName
    .split('_')
    .map((item) => _.toLower(item))
    .map((item) => _.upperFirst(item))
    .join('')
}
module.exports = {
  PluginVersion: 1,
  PluginClass: BotiumConnectorAlexaAvs
}
