const debug = require('debug')('botium-connector-alexa-avs-main')

const BotiumSpeechProcessingSTT = require('./stt/BotiumSpeechProcessing')
const BotiumSpeechProcessingTTS = require('./tts/BotiumSpeechProcessing')
const { AVS } = require('./avs/AVSSpeechClient')
const { loadHomophones, replaceHomophones } = require('./utils/homophones')

const Capabilities = {
  ALEXA_AVS_STT_HOMOPHONES: 'ALEXA_AVS_STT_HOMOPHONES'
}

class BotiumConnectorAlexaAvs {
  constructor ({ container, queueBotSays, caps }) {
    this.container = container
    this.queueBotSays = queueBotSays
    this.caps = caps
  }

  async Validate () {
    debug('Validate called')
    if (Object.keys(this.caps).find(c => c.startsWith('ALEXA_AVS_TTS'))) {
      this.tts = new BotiumSpeechProcessingTTS(this.caps)
      await this.tts.Validate()
    }
    if (Object.keys(this.caps).find(c => c.startsWith('ALEXA_AVS_STT'))) {
      this.stt = new BotiumSpeechProcessingSTT(this.caps)
      await this.stt.Validate()
    }
    this.avs = new AVS(this.caps, this.container.tempDirectory)
    await this.avs.Validate()
  }

  async Build () {
    debug('Build called')
    this.homophones = loadHomophones(this.caps[Capabilities.ALEXA_AVS_STT_HOMOPHONES])
    if (this.tts && this.tts.Build) await this.tts.Build()
    if (this.stt && this.stt.Build) await this.stt.Build()
    await this.avs.Build()
  }

  async Start () {
    debug('Start called')
    if (this.tts && this.tts.Start) await this.tts.Start()
    if (this.stt && this.stt.Start) await this.stt.Start()
    await this.avs.Start()
  }

  async UserSays (msg) {
    debug(`UserSays called: ${msg.messageText}`)

    if (!msg.attachments) {
      msg.attachments = []
    }
    let userAsSpeech = null

    if (msg.media && msg.media.length > 0) {
      const media = msg.media[0]
      if (!media.buffer) {
        throw new Error(`Media attachment ${media.mediaUri} not downloaded`)
      }
      if (!media.mimeType || !media.mimeType.startsWith('audio')) {
        throw new Error(`Media attachment ${media.mediaUri} mime type ${media.mimeType || '<empty>'} not supported (audio only)`)
      }
      userAsSpeech = media.buffer
      msg.attachments.push({
        name: media.mediaUri,
        mimeType: media.mimeType,
        base64: media.buffer.toString('base64')
      })
    } else {
      if (this.tts) {
        try {
          debug(`User text "${msg.messageText}" converting to speech...`)
          userAsSpeech = await this.tts.Synthesize(msg.messageText || '')
          debug(`User text "${msg.messageText}" conversion to speech succeeded`)
          msg.attachments.push({
            name: `alexa-avs-request-${msg.currentStepIndex}.wav`,
            mimeType: 'audio/wav',
            base64: userAsSpeech.toString('base64')
          })
        } catch (err) {
          debug(`AVS.UserSays failed to synthsize speech: ${err.message}`)
          throw err
        }
      } else {
        throw new Error('Text-To-Speech service not configured')
      }
    }
    try {
      debug('Alexa answering...')
      const audioBuffers = await this.avs.UserSays(userAsSpeech)
      debug('Alexa answered successfull')
      const mockMsg = { ...msg }
      setTimeout(() => this._processResponse(audioBuffers, mockMsg), 0)
    } catch (err) {
      debug(`AVS.UserSays failed: ${err.message}`)
      throw err
    }
  }

  async _processResponse (audioBuffers, mockMsg) {
    const { conversation, currentStepIndex } = mockMsg

    if (audioBuffers && audioBuffers.length > 0) {
      for (const audioBuffer of audioBuffers) {
        const botMsg = {
          sender: 'bot',
          sourceData: {
            audioBuffer: {
              format: audioBuffer.format,
              length: audioBuffer.payload.length
            }
          },
          messageText: null,
          media: [{
            mediaUri: `data:audio/mpeg3;base64,${audioBuffer.payload.toString('base64')}`,
            mimeType: 'audio/mpeg3'
          }]
        }
        if (this.stt) {
          try {
            debug(`Answer converting to text, format "${audioBuffer.format}", size ${audioBuffer.payload.length}...`)
            let botAsText = await this.stt.Recognize(audioBuffer.payload, conversation, currentStepIndex)
            if (botAsText) {
              debug(`Answer converted to text succeeded: ${botAsText}`)
              const replaced = replaceHomophones(this.homophones, botAsText)
              if (botAsText !== replaced) {
                debug(`Replaced homophones in text, translated to: ${replaced}`)
                botAsText = replaced
              }
            } else {
              debug('Answer converted to empty text')
            }
            botMsg.messageText = botAsText || ''
            this.queueBotSays(botMsg)
          } catch (err) {
            this.queueBotSays(new Error(`Answer conversion failed, format "${audioBuffer.format}", size ${audioBuffer.payload.length}: ${err.message}`))
          }
        } else {
          this.queueBotSays(botMsg)
        }
      }
      debug(`Answer handling ready, processed ${audioBuffers.length} audio responses.`)
    }
  }

  async Stop () {
    debug('Stop called')
    if (this.tts && this.tts.Stop) await this.tts.Stop()
    if (this.stt && this.stt.Stop) await this.stt.Stop()
    await this.avs.Stop()
  }

  async Clean () {
    debug('Clean called')

    if (this.tts && this.tts.Clean) await this.tts.Clean()
    if (this.stt && this.stt.Clean) await this.stt.Clean()
    await this.avs.Clean()

    this.homophones = null
    this.tts = null
    this.stt = null
    this.avs = null
  }
}

module.exports = BotiumConnectorAlexaAvs
