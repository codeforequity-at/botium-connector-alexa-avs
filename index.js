const util = require('util')
const debug = require('debug')('botium-connector-alexa-avs-main')
const _ = require('lodash')

const { loadHomophones, replaceHomophones } = require('./src/utils/homophones')

const Capabilities = {
  ALEXA_AVS_TTS: 'ALEXA_AVS_TTS',
  ALEXA_AVS_STT: 'ALEXA_AVS_STT',
  ALEXA_AVS_STT_HOMOPHONES: 'ALEXA_AVS_STT_HOMOPHONES'
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
    this.homophones = loadHomophones(this.caps[Capabilities.ALEXA_AVS_STT_HOMOPHONES])
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

  async UserSays (mockMsg) {
    const { messageText, currentStepIndex } = mockMsg
    debug(`UserSays called: ${messageText}`)

    if (!mockMsg.attachments) {
      mockMsg.attachments = []
    }
    try {
      debug(`User text "${messageText}" converting to speech...`)
      const userAsSpeech = await this.tts.Synthesize(messageText)
      debug(`User text "${messageText}" conversion to speech succeeded`)
      mockMsg.attachments.push({
        name: `alexa-avs-request-${currentStepIndex}.wav`,
        mimeType: 'audio/wav',
        base64: userAsSpeech.toString('base64')
      })
      debug('Alexa answering...')
      const audioBuffers = await this.avs.UserSays(userAsSpeech)
      debug('Alexa answered successfull')
      setTimeout(() => this._processResponse(audioBuffers, mockMsg), 0)
    } catch (err) {
      debug(`AVS.UserSays failed: ${err.message}`)
      throw err
    }
  }

  async _processResponse (audioBuffers, mockMsg) {
    const { conversation, currentStepIndex } = mockMsg

    if (audioBuffers && audioBuffers.length > 0) {
      for (const [index, audioBuffer] of audioBuffers.entries()) {
        if (!this.stt) return

        try {
          debug(`Answer converting to text, format "${audioBuffer.format}", size ${audioBuffer.payload.length}...`)
          let botAsText = await this.stt.Recognize(audioBuffer.payload, conversation, currentStepIndex)
          if (botAsText) {
            debug(`Answer converted to text succeeded: ${botAsText}`)
            const replaced = replaceHomophones(this.homophones, botAsText)
            if (botAsText !== replaced) {
              debug(`Replaced homophones in text, translated to: ${botAsText}`)
              botAsText = replaced
            }
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
        } catch (err) {
          debug(`Answer conversion failed, format "${audioBuffer.format}", size ${audioBuffer.payload.length}: ${util.inspect(err)}`)
        }
      }
      debug(`Answer handling ready, processed ${audioBuffers.length} audio responses.`)
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

    this.homophones = null
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
