const debug = require('debug')('botium-connector-alexa-avs-main')
const mp3ToAudioBuffer = require('audio-decode')
const audioBufferToWav = require('audiobuffer-to-wav')
const _ = require('lodash')
const arrayBufferToBuffer = require('arraybuffer-to-buffer')

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

  UserSays (userAsText) {
    debug('UserSays called')
    debug(`User text ${userAsText} converting to speech...`)
    return this.tts.Synthesize(userAsText)
      .then((userAsSpeech) => {
        debug(`User text ${userAsText} converted to speech succesful`)
        debug(`Alexa answering...`)
        return this.avs.UserSays(userAsSpeech)
      })
      .then((botAsSpeechMp3) => {
        debug(`Alexa answered succesful`)
        debug(`Answer converting to wav...`)
        return _mp3ToWav(botAsSpeechMp3)
      })
      .then((botAsSpeechWav) => {
        debug(`Alexa converted to wav`)
        debug(`Answer converting to text...`)
        return this.stt.Recognize(botAsSpeechWav)
      })
      .then((botAsText) => {
        debug(`Answer converted to text ${botAsText} succesful`)
        return this.queueBotSays(botAsText)
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

const _mp3ToWav = (mp3AsBuffer) => {
  // 1) Slice first two characters. Alexa returns the MP3 starting with \n\r
  // or just the HTTP message is not parsed well?
  // this MP3 is correct for a MP3 player, but not for mp3ToAudioBuffer.isMP3 module.
  // so i remove this \n\r
  if (mp3AsBuffer[2] !== 73) {
    debug('Error: The source does not looks as an mp3!!!')
    return Promise.reject(new Error(`The source does not looks as an mp3 [${mp3AsBuffer[0]}] [${mp3AsBuffer[1]}] [${mp3AsBuffer[2]}] `))
  }
  mp3AsBuffer = mp3AsBuffer.slice(2, mp3AsBuffer.length)
  // 2 mp3Buffer -> audioBuffer (It is a generalized audio format?)
  // 3 audioBuffer -> wav array buffer (third buffer type in this function. But function wants it)
  // 4 wav array buffer -> wav buffer (buffer can be stored as file. Or wav-array-buffer could be written too?)
  return mp3ToAudioBuffer(mp3AsBuffer)
    .then((audioBuffer) => {
      const wavAsArrayBuffer = audioBufferToWav(audioBuffer)
      const buffer = arrayBufferToBuffer(wavAsArrayBuffer)
      return buffer
    })
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
