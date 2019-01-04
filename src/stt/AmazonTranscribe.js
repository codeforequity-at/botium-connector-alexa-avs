const AWS = require('aws-sdk')
const uuidv1 = require('uuid/v1')

const Capabilities = {
  ALEXA_AVS_TTS_AMAZON_TRANSCRIBE_ACCESS_KEY_ID: 'ALEXA_AVS_TTS_AMAZON_TRANSCRIBE_ACCESS_KEY_ID',
  ALEXA_AVS_TTS_AMAZON_TRANSCRIBE_SECRET_ACCESS_KEY: 'ALEXA_AVS_TTS_AMAZON_TRANSCRIBE_SECRET_ACCESS_KEY',
  ALEXA_AVS_TTS_AMAZON_TRANSCRIBE_LANGUAGE_CODE: 'ALEXA_AVS_TTS_AMAZON_TRANSCRIBE_LANGUAGE_CODE'
}

class GoogleCloudSpeech {
  constructor (caps) {
    this.caps = caps
  }

  Validate () {
    if (!this.caps[Capabilities.ALEXA_AVS_TTS_AMAZON_TRANSCRIBE_ACCESS_KEY_ID]) throw new Error('ALEXA_AVS_TTS_AMAZON_TRANSCRIBE_ACCESS_KEY_ID capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_TTS_AMAZON_TRANSCRIBE_SECRET_ACCESS_KEY]) throw new Error('ALEXA_AVS_TTS_AMAZON_TRANSCRIBE_SECRET_ACCESS_KEY capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_TTS_AMAZON_TRANSCRIBE_LANGUAGE_CODE]) throw new Error('ALEXA_AVS_TTS_AMAZON_TRANSCRIBE_LANGUAGE_CODE capability required')
  }

  Build () {
    // Creates a client
    this.client = new AWS.TranscribeService({
      apiVersion: '2017-10-26',
      accessKeyId: this.caps[Capabilities.ALEXA_AVS_TTS_AMAZON_TRANSCRIBE_ACCESS_KEY_ID],
      secretAccessKey: this.caps[Capabilities.ALEXA_AVS_TTS_AMAZON_TRANSCRIBE_SECRET_ACCESS_KEY]
    })

    this.defaultRequest = {
      config: {
        MediaFormat: 'mp3',
        LanguageCode: this.caps[Capabilities.ALEXA_AVS_TTS_AMAZON_TRANSCRIBE_LANGUAGE_CODE]
      }
    }
  }

  Recognize (audio) {
    return new Promise((resolve, reject) => {
      const params = Object.assign(
        {
          Media: {MediaFileUri: audio},
          TranscriptionJobName: uuidv1()
        },
        this.defaultRequest)
      this.client.startTranscriptionJob(
        params,
        (err, data) => {
          if (err) {
            return reject(err)
          }
          return data
        }
      )
    })
  }

  Stop () {
    return Promise.resolve()
  }

  Clean () {
    this.defaultRequest = null
    this.client = null
    return Promise.resolve()
  }
}

module.exports = GoogleCloudSpeech
