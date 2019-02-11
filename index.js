const debug = require('debug')('botium-connector-alexa-avs-main')
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

    this.avs = new (require('./src/avs/AVSSpeechClient')).AVS(this.caps)
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

  UserSays ({messageText, expectedAnswer}) {
    debug('UserSays called')
    return new Promise((resolve, reject) => {
      debug(`User text "${messageText}" converting to speech...`)
      this.tts.Synthesize(messageText)
        .then((userAsSpeech) => {
          debug(`User text "${messageText}" conversion to speech succeeded`)
          debug(`Alexa answering...`)
          return this.avs.UserSays(userAsSpeech)
        })
        .then((audioBuffers) => {
          debug(`Alexa answered succesfull`)

          const responseTexts = []
          if (audioBuffers && audioBuffers.length > 0) {
            let processingPromise = Promise.resolve()
            audioBuffers.forEach((audioBuffer) => {
              processingPromise = processingPromise.then(() => {
                debug(`Answer converting to text, format "${audioBuffer.format}", size ${audioBuffer.payload.length}...`)
                return this.stt.Recognize(audioBuffer.payload, expectedAnswer)
                  .then((botAsText) => {
                    if (botAsText) {
                      debug(`Answer converted to text "${botAsText}" succeeded`)
                      responseTexts.push(botAsText)
                    } else {
                      debug(`Answer converted to empty text, skipping`)
                    }
                  })
                  .catch(err => {
                    debug(`Answer conversion failed, format "${audioBuffer.format}", size ${audioBuffer.payload.length}: ${err}`)
                  })
              })
            })
            processingPromise.then(() => {
              debug(`Answer handling ready, processed ${audioBuffers.length} audio responses.`)
              resolve()

              responseTexts.forEach(messageText => {
                this.queueBotSays({ sender: 'bot', messageText })
              })
            })
          }
        })
        .catch(reject)
    })
  }

  Stop () {
    debug('Stop called')

    this.tts.Stop()
    this.stt.Stop()
    this.avs.Stop()

    return Promise.resolve()
  }

  Clean () {
    debug('Clean called')

    this.tts.Clean()
    this.stt.Clean()
    this.avs.Clean()

    this.tts = null
    this.stt = null
    this.avs = null

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
