const Capabilities = {
  ALEXA_AVS_BOTIUM_SPEECH_PROCESSING_URL: 'ALEXA_AVS_BOTIUM_SPEECH_PROCESSING_URL',
  ALEXA_AVS_BOTIUM_SPEECH_PROCESSING_APIKEY: 'ALEXA_AVS_BOTIUM_SPEECH_PROCESSING_APIKEY',
  ALEXA_AVS_TTS_BOTIUM_SPEECH_PROCESSING_LANGUAGE: 'ALEXA_AVS_TTS_BOTIUM_SPEECH_PROCESSING_LANGUAGE',
  ALEXA_AVS_STT_BOTIUM_SPEECH_PROCESSING_LANGUAGE: 'ALEXA_AVS_STT_BOTIUM_SPEECH_PROCESSING_LANGUAGE'
}

class BotiumSpeechProcessingBase {
  constructor (caps) {
    this.caps = caps
  }

  Validate () {
    if (!this.caps[Capabilities.ALEXA_AVS_BOTIUM_SPEECH_PROCESSING_URL]) throw new Error('ALEXA_AVS_BOTIUM_SPEECH_PROCESSING_URL capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_TTS_BOTIUM_SPEECH_PROCESSING_LANGUAGE]) throw new Error('ALEXA_AVS_TTS_BOTIUM_SPEECH_PROCESSING_LANGUAGE capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_STT_BOTIUM_SPEECH_PROCESSING_LANGUAGE]) throw new Error('ALEXA_AVS_STT_BOTIUM_SPEECH_PROCESSING_LANGUAGE capability required')
  }

  Build () {
    let baseUrl = this.caps[Capabilities.ALEXA_AVS_BOTIUM_SPEECH_PROCESSING_URL]
    if (!baseUrl.endsWith('/')) baseUrl = baseUrl + '/'

    this.defaultRequestConvert = {
      method: 'POST',
      uri: `${this.caps[Capabilities.ALEXA_AVS_BOTIUM_SPEECH_PROCESSING_URL]}api/convert/mp3tomonowav`,
      headers: {
        'Content-Type': 'audio/mpeg'
      },
      encoding: null
    }
    this.defaultRequestStt = {
      method: 'POST',
      uri: `${this.caps[Capabilities.ALEXA_AVS_BOTIUM_SPEECH_PROCESSING_URL]}api/stt/${this.caps[Capabilities.ALEXA_AVS_STT_BOTIUM_SPEECH_PROCESSING_LANGUAGE]}`,
      headers: {
        'Content-Type': 'audio/wav'
      }
    }
    this.defaultRequestTts = {
      method: 'GET',
      uri: `${this.caps[Capabilities.ALEXA_AVS_BOTIUM_SPEECH_PROCESSING_URL]}api/tts/${this.caps[Capabilities.ALEXA_AVS_TTS_BOTIUM_SPEECH_PROCESSING_LANGUAGE]}`,
      headers: {
        'Content-Type': 'audio/wav'
      },
      encoding: null
    }
    if (this.caps[Capabilities.ALEXA_AVS_BOTIUM_SPEECH_PROCESSING_APIKEY]) {
      this.defaultRequestConvert.headers.BOTIUM_API_TOKEN = this.caps[Capabilities.ALEXA_AVS_BOTIUM_SPEECH_PROCESSING_APIKEY]
      this.defaultRequestStt.headers.BOTIUM_API_TOKEN = this.caps[Capabilities.ALEXA_AVS_BOTIUM_SPEECH_PROCESSING_APIKEY]
      this.defaultRequestTts.headers.BOTIUM_API_TOKEN = this.caps[Capabilities.ALEXA_AVS_BOTIUM_SPEECH_PROCESSING_APIKEY]
    }
  }
}

module.exports = BotiumSpeechProcessingBase
