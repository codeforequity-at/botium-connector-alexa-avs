const AWS = require('aws-sdk')
const mp3ToWav = require('../utils/mp3ToWav')
const debug = require('debug')('botium-connector-alexa-avs-tts-amazon-polly')

const Capabilities = {
  ALEXA_AVS_TTS_AMAZON_POLLY_REGION: 'ALEXA_AVS_TTS_AMAZON_POLLY_REGION',
  ALEXA_AVS_TTS_AMAZON_POLLY_ACCESS_KEY_ID: 'ALEXA_AVS_TTS_AMAZON_POLLY_ACCESS_KEY_ID',
  ALEXA_AVS_TTS_AMAZON_POLLY_SECRET_ACCESS_KEY: 'ALEXA_AVS_TTS_AMAZON_POLLY_SECRET_ACCESS_KEY',
  ALEXA_AVS_TTS_AMAZON_POLLY_LANGUAGE_CODE: 'ALEXA_AVS_TTS_AMAZON_POLLY_LANGUAGE_CODE'
}

class AmazonPolly {
  constructor (caps) {
    this.caps = caps
  }

  Validate () {
    if (!this.caps[Capabilities.ALEXA_AVS_TTS_AMAZON_POLLY_REGION]) throw new Error('ALEXA_AVS_TTS_AMAZON_POLLY_REGION capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_TTS_AMAZON_POLLY_ACCESS_KEY_ID]) throw new Error('ALEXA_AVS_TTS_AMAZON_POLLY_ACCESS_KEY_ID capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_TTS_AMAZON_POLLY_SECRET_ACCESS_KEY]) throw new Error('ALEXA_AVS_TTS_AMAZON_POLLY_SECRET_ACCESS_KEY capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_TTS_AMAZON_POLLY_LANGUAGE_CODE]) throw new Error('ALEXA_AVS_TTS_AMAZON_POLLY_LANGUAGE_CODE capability required')
  }

  Build () {
    // Creates a client
    this.client = new AWS.Polly({
      apiVersion: '2016-06-10',
      region: this.caps[Capabilities.ALEXA_AVS_TTS_AMAZON_POLLY_REGION],
      accessKeyId: this.caps[Capabilities.ALEXA_AVS_TTS_AMAZON_POLLY_ACCESS_KEY_ID],
      secretAccessKey: this.caps[Capabilities.ALEXA_AVS_TTS_AMAZON_POLLY_SECRET_ACCESS_KEY]
    })

    this.defaultRequest = {
      OutputFormat: 'mp3',
      VoiceId: 'Kimberly',
      LanguageCode: this.caps[Capabilities.ALEXA_AVS_TTS_AMAZON_POLLY_LANGUAGE_CODE]
    }
  }

  Synthesize (text) {
    debug('Synthesize called')
    return new Promise((resolve, reject) => {
      this.client.synthesizeSpeech(Object.assign({Text: text}, this.defaultRequest), (err, response) => {
        if (err) {
          return reject(err)
        }

        debug(`Synthesize finised`)
        return resolve(response.AudioStream)
      })
    })
      .then((response) => {
        return mp3ToWav(response)
      })
  }

  Stop () {
    return Promise.resolve()
  }

  Clean () {
    return Promise.resolve()
  }
}

module.exports = AmazonPolly
