const util = require('util')
const debug = require('debug')('botium-connector-alexa-avs-main')
const _ = require('lodash')

const Capabilities = {
  ALEXA_AVS_TTS: 'ALEXA_AVS_TTS',
  ALEXA_AVS_STT: 'ALEXA_AVS_STT'
}

const Defaults = {
  [Capabilities.ALEXA_AVS_TTS]: 'BOTIUM_SPEECH_PROCESSING',
  [Capabilities.ALEXA_AVS_STT]: 'BOTIUM_SPEECH_PROCESSING'
}

class BotiumConnectorAlexaAvs {
  constructor ({ container, queueBotSays, caps }) {
    this.container = container
    this.queueBotSays = queueBotSays
    this.caps = caps
  }

  Validate () {
    debug('Validate called')
    if (!this.caps[Capabilities.ALEXA_AVS_TTS]) this.caps[Capabilities.ALEXA_AVS_TTS] = Defaults[Capabilities.ALEXA_AVS_TTS]
    if (!this.caps[Capabilities.ALEXA_AVS_STT]) this.caps[Capabilities.ALEXA_AVS_STT] = Defaults[Capabilities.ALEXA_AVS_STT]

    this.tts = new (require('./src/tts/' + _toModuleName(this.caps[Capabilities.ALEXA_AVS_TTS])))(this.caps, this.container.tempDirectory)
    this.tts.Validate && this.tts.Validate()

    this.stt = new (require('./src/stt/' + _toModuleName(this.caps[Capabilities.ALEXA_AVS_STT])))(this.caps, this.container.tempDirectory)
    this.stt.Validate && this.stt.Validate()

    this.avs = new (require('./src/avs/AVSSpeechClient')).AVS(this.caps, this.container.tempDirectory)
    this.avs.Validate()

    return Promise.resolve()
  }

  async Build () {
    debug('Build called')
    if (this.tts.Build) await this.tts.Build()
    if (this.stt.Build) await this.stt.Build()
    await this.avs.Build()
  }

  async Start () {
    debug('Start called')
    if (this.tts.Start) await this.tts.Start()
    if (this.stt.Start) await this.stt.Start()
    await this.avs.Start()
  }

  UserSays (mockMsg) {
    const { messageText, currentStepIndex } = mockMsg
    debug(`UserSays called: ${messageText}`)

    if (!mockMsg.attachments) {
      mockMsg.attachments = []
    }

    return new Promise((resolve, reject) => {
      debug(`User text "${messageText}" converting to speech...`)
      this.tts.Synthesize(messageText)
        .then((userAsSpeech) => {
          debug(`User text "${messageText}" conversion to speech succeeded`)
          mockMsg.attachments.push({
            name: `alexa-avs-request-${currentStepIndex}.wav`,
            mimeType: 'audio/wav',
            base64: userAsSpeech.toString('base64')
          })
          debug('Alexa answering...')
          return this.avs.UserSays(userAsSpeech)
        })
        .then((audioBuffers) => {
          debug('Alexa answered successfull')
          resolve()

          setTimeout(() => this._processResponse(audioBuffers, mockMsg), 0)
        })
        .catch(err => {
          debug(`AVS.UserSays failed: ${err.message}`)
          reject(err)
        })
    })
  }

  _processResponse (audioBuffers, mockMsg) {
    const { conversation, currentStepIndex } = mockMsg

    if (audioBuffers && audioBuffers.length > 0) {
      let processingPromise = Promise.resolve()
      audioBuffers.forEach((audioBuffer, index) => {
        processingPromise = processingPromise.then(() => {
          if (!this.stt) return

          debug(`Answer converting to text, format "${audioBuffer.format}", size ${audioBuffer.payload.length}...`)
          return this.stt.Recognize(audioBuffer.payload, conversation, currentStepIndex)
            .then((botAsText) => {
              if (botAsText) {
                debug(`Answer converted to text "${botAsText}" succeeded`)
              } else {
                debug('Answer converted to empty text')
              }
              const botMsg = {
                sender: 'bot',
                messageText: botAsText || '',
                sourceData: {
                  audioBuffer: {
                    format: audioBuffer.format,
                    length: audioBuffer.payload.length
                  }
                },
                attachments: [
                  {
                    name: `alexa-avs-response-${index}.mp3`,
                    mimeType: 'audio/mpeg3',
                    base64: audioBuffer.payload.toString('base64')
                  }
                ]
              }
              this.queueBotSays(botMsg)
            })
            .catch(err => {
              debug(`Answer conversion failed, format "${audioBuffer.format}", size ${audioBuffer.payload.length}: ${util.inspect(err)}`)
            })
        })
      })
      processingPromise.then(() => {
        debug(`Answer handling ready, processed ${audioBuffers.length} audio responses.`)
      })
    }
  }

  async Stop () {
    debug('Stop called')
    if (this.tts.Stop) await this.tts.Stop()
    if (this.stt.Stop) await this.stt.Stop()
    await this.avs.Stop()
  }

  async Clean () {
    debug('Clean called')

    if (this.tts.Clean) await this.tts.Clean()
    if (this.stt.Clean) await this.stt.Clean()
    await this.avs.Clean()

    this.tts = null
    this.stt = null
    this.avs = null
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
