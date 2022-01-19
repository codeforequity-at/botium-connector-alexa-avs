const _ = require('lodash')
const axios = require('axios').default
const debug = require('debug')('botium-connector-alexa-avs-botium-speech-processing-base')

const Capabilities = {
  ALEXA_AVS_STT_URL: 'ALEXA_AVS_STT_URL',
  ALEXA_AVS_STT_PARAMS: 'ALEXA_AVS_STT_PARAMS',
  ALEXA_AVS_STT_METHOD: 'ALEXA_AVS_STT_METHOD',
  ALEXA_AVS_STT_BODY: 'ALEXA_AVS_STT_BODY',
  ALEXA_AVS_STT_HEADERS: 'ALEXA_AVS_STT_HEADERS',
  ALEXA_AVS_STT_TIMEOUT: 'ALEXA_AVS_STT_TIMEOUT',
  ALEXA_AVS_STT_SEND_TEXT_AS_PHRASE_HINT: 'ALEXA_AVS_STT_SEND_TEXT_AS_PHRASE_HINT',
  ALEXA_AVS_STT_SEND_TEXT_AS_PHRASE_HINT_USE_NEGATED: 'ALEXA_AVS_STT_SEND_TEXT_AS_PHRASE_HINT_USE_NEGATED',
  ALEXA_AVS_TTS_URL: 'ALEXA_AVS_TTS_URL',
  ALEXA_AVS_TTS_PARAMS: 'ALEXA_AVS_TTS_PARAMS',
  ALEXA_AVS_TTS_METHOD: 'ALEXA_AVS_TTS_METHOD',
  ALEXA_AVS_TTS_BODY: 'ALEXA_AVS_TTS_BODY',
  ALEXA_AVS_TTS_HEADERS: 'ALEXA_AVS_TTS_HEADERS',
  ALEXA_AVS_TTS_TIMEOUT: 'ALEXA_AVS_TTS_TIMEOUT'
}

const Defaults = {
  ALEXA_AVS_STT_METHOD: 'POST',
  ALEXA_AVS_STT_TIMEOUT: 10000,
  ALEXA_AVS_STT_SEND_TEXT_AS_PHRASE_HINT: true,
  ALEXA_AVS_STT_SEND_TEXT_AS_PHRASE_HINT_USE_NEGATED: true,
  ALEXA_AVS_TTS_METHOD: 'GET',
  ALEXA_AVS_TTS_TIMEOUT: 10000
}

class BotiumSpeechProcessingBase {
  constructor (caps) {
    this.caps = Object.assign({}, Defaults, caps)

    this.axiosSttParams = null
    this.axiosTtsParams = null
  }

  async Validate () {
    if (this.caps.ALEXA_AVS_STT_URL) {
      this.axiosSttParams = {
        url: this.caps.ALEXA_AVS_STT_URL,
        params: this._getParams(Capabilities.ALEXA_AVS_STT_PARAMS),
        method: this.caps.ALEXA_AVS_STT_METHOD,
        timeout: this.caps.ALEXA_AVS_STT_TIMEOUT,
        headers: this._getHeaders(Capabilities.ALEXA_AVS_STT_HEADERS)
      }
      this.axiosConvertParams = {
        url: this._getAxiosUrl(this.caps.ALEXA_AVS_STT_URL, '/api/convert/mp3tomonowav'),
        params: this._getParams(Capabilities.ALEXA_AVS_STT_PARAMS),
        method: 'POST',
        timeout: this.caps.ALEXA_AVS_STT_TIMEOUT,
        headers: {
          ...this._getHeaders(Capabilities.ALEXA_AVS_STT_HEADERS),
          'Content-Type': 'audio/mpeg'
        }
      }
      try {
        const { data } = await axios({
          ...this.axiosSttParams,
          url: this._getAxiosUrl(this.caps.ALEXA_AVS_STT_URL, '/api/status')
        })
        if (data && data.status === 'OK') {
          debug(`Checking STT Status response: ${this._getAxiosShortenedOutput(data)}`)
        } else {
          throw new Error(`Checking STT Status failed, response is: ${this._getAxiosShortenedOutput(data)}`)
        }
      } catch (err) {
        throw new Error(`Checking STT Status failed - ${this._getAxiosErrOutput(err)}`)
      }
    }
    if (this.caps.ALEXA_AVS_TTS_URL) {
      this.axiosTtsParams = {
        url: this.caps.ALEXA_AVS_TTS_URL,
        params: this._getParams(Capabilities.ALEXA_AVS_TTS_PARAMS),
        method: this.caps.ALEXA_AVS_TTS_METHOD,
        timeout: this.caps.ALEXA_AVS_TTS_TIMEOUT,
        headers: this._getHeaders(Capabilities.ALEXA_AVS_TTS_HEADERS)
      }
      try {
        const { data } = await axios({
          ...this.axiosTtsParams,
          url: this._getAxiosUrl(this.caps.ALEXA_AVS_TTS_URL, '/api/status')
        })
        if (data && data.status === 'OK') {
          debug(`Checking TTS Status response: ${this._getAxiosShortenedOutput(data)}`)
        } else {
          throw new Error(`Checking TTS Status failed, response is: ${this._getAxiosShortenedOutput(data)}`)
        }
      } catch (err) {
        throw new Error(`Checking TTS Status failed - ${this._getAxiosErrOutput(err)}`)
      }
    }
  }

  _getParams (capParams) {
    if (this.caps[capParams]) {
      if (_.isString(this.caps[capParams])) return JSON.parse(this.caps[capParams])
      else return this.caps[capParams]
    }
    return {}
  }

  _getBody (capBody) {
    if (this.caps[capBody]) {
      if (_.isString(this.caps[capBody])) return JSON.parse(this.caps[capBody])
      else return this.caps[capBody]
    }
    return null
  }

  _getHeaders (capHeaders) {
    if (this.caps[capHeaders]) {
      if (_.isString(this.caps[capHeaders])) return JSON.parse(this.caps[capHeaders])
      else return this.caps[capHeaders]
    }
    return {}
  }

  _getAxiosUrl (baseUrl, extUrl) {
    return baseUrl.substr(0, baseUrl.indexOf('/', 8)) + extUrl
  }

  _getAxiosShortenedOutput (data) {
    if (data) {
      if (_.isBuffer(data)) {
        try {
          data = data.toString()
        } catch (err) {
        }
      }
      return _.truncate(_.isString(data) ? data : JSON.stringify(data), { length: 200 })
    } else {
      return ''
    }
  }

  _getAxiosErrOutput (err) {
    if (err && err.response) {
      return `Status: ${err.response.status} / Response: ${this._getAxiosShortenedOutput(err.response.data)}`
    } else {
      return err.message
    }
  }
}

module.exports = {
  Capabilities,
  BotiumSpeechProcessingBase
}
