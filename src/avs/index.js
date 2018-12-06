'use strict'

const Buffer = require('buffer').Buffer
const httpMessageParser = require('http-message-parser')

const AMAZON_ERROR_CODES = require('./AmazonErrorCodes.js')
const Observable = require('./Observable.js')
const arrayBufferToString = require('./utils/arrayBufferToString.js')

class AVS {
  constructor (options = {}) {
    Observable(this)

    this._bufferSize = 2048
    this._inputChannels = 1
    this._outputChannels = 1
    this._leftChannel = []
    this._rightChannel = []
    this._audioContext = null
    this._recorder = null
    this._sampleRate = null
    this._outputSampleRate = 16000
    this._audioInput = null
    this._volumeNode = null
    this._debug = false
    this._token = null
    this._refreshToken = null
    this._clientId = null
    this._clientSecret = null
    this._deviceId = null
    this._deviceSerialNumber = null
    this._redirectUri = null
    this._audioQueue = []

    if (options.token) {
      this.setToken(options.token)
    }

    if (options.refreshToken) {
      this.setRefreshToken(options.refreshToken)
    }

    if (options.clientId) {
      this.setClientId(options.clientId)
    }

    if (options.clientSecret) {
      this.setClientSecret(options.clientSecret)
    }

    if (options.deviceId) {
      this.setDeviceId(options.deviceId)
    }

    if (options.deviceSerialNumber) {
      this.setDeviceSerialNumber(options.deviceSerialNumber)
    }

    if (options.redirectUri) {
      this.setRedirectUri(options.redirectUri)
    }

    if (options.debug) {
      this.setDebug(options.debug)
    }
  }

  _log (type, message) {
    if (type && !message) {
      message = type
      type = 'log'
    }

    setTimeout(() => {
      this.emit(AVS.EventTypes.LOG, message)
    }, 0)

    if (this._debug) {
      console[type](message)
    }
  }

  sendAudio (dataView) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const url = 'https://access-alexa-na.amazon.com/v1/avs/speechrecognizer/recognize'

      xhr.open('POST', url, true)
      xhr.responseType = 'arraybuffer'
      xhr.onload = (event) => {
        const buffer = new Buffer(xhr.response)

        if (xhr.status === 200) {
          const parsedMessage = httpMessageParser(buffer)
          resolve({xhr, response: parsedMessage})
        } else {
          let error = new Error('An error occured with request.')
          let response = {}

          if (!xhr.response.byteLength) {
            error = new Error('Empty response.')
          } else {
            try {
              response = JSON.parse(arrayBufferToString(buffer))
            } catch (err) {
              error = err
            }
          }

          if (response.error instanceof Object) {
            if (response.error.code === AMAZON_ERROR_CODES.InvalidAccessTokenException) {
              this.emit(AVS.EventTypes.TOKEN_INVALID)
            }

            error = response.error.message
          }

          this.emit(AVS.EventTypes.ERROR, error)
          return reject(error)
        }
      }

      xhr.onerror = (error) => {
        this._log(error)
        reject(error)
      }

      const BOUNDARY = 'BOUNDARY1234'
      const BOUNDARY_DASHES = '--'
      const NEWLINE = '\r\n'
      const METADATA_CONTENT_DISPOSITION = 'Content-Disposition: form-data; name="metadata"'
      const METADATA_CONTENT_TYPE = 'Content-Type: application/json; charset=UTF-8'
      const AUDIO_CONTENT_TYPE = 'Content-Type: audio/L16; rate=16000; channels=1'
      const AUDIO_CONTENT_DISPOSITION = 'Content-Disposition: form-data; name="audio"'

      const metadata = {
        messageHeader: {},
        messageBody: {
          profile: 'alexa-close-talk',
          locale: 'en-us',
          format: 'audio/L16; rate=16000; channels=1'
        }
      }

      const postDataStart = [
        NEWLINE, BOUNDARY_DASHES, BOUNDARY, NEWLINE, METADATA_CONTENT_DISPOSITION, NEWLINE, METADATA_CONTENT_TYPE,
        NEWLINE, NEWLINE, JSON.stringify(metadata), NEWLINE, BOUNDARY_DASHES, BOUNDARY, NEWLINE,
        AUDIO_CONTENT_DISPOSITION, NEWLINE, AUDIO_CONTENT_TYPE, NEWLINE, NEWLINE
      ].join('')

      const postDataEnd = [NEWLINE, BOUNDARY_DASHES, BOUNDARY, BOUNDARY_DASHES, NEWLINE].join('')

      const size = postDataStart.length + dataView.byteLength + postDataEnd.length
      const uint8Array = new Uint8Array(size)
      let i = 0

      for (; i < postDataStart.length; i++) {
        uint8Array[i] = postDataStart.charCodeAt(i) & 0xFF
      }

      for (let j = 0; j < dataView.byteLength; i++, j++) {
        uint8Array[i] = dataView.getUint8(j)
      }

      for (let j = 0; j < postDataEnd.length; i++, j++) {
        uint8Array[i] = postDataEnd.charCodeAt(j) & 0xFF
      }

      const payload = uint8Array.buffer

      xhr.setRequestHeader('Authorization', `Bearer ${this._token}`)
      xhr.setRequestHeader('Content-Type', 'multipart/form-data; boundary=' + BOUNDARY)
      xhr.send(payload)
    })
  }

  audioToBlob (audio) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([audio], {type: 'audio/mpeg'})

      resolve(blob)
    })
  }

  static get EventTypes () {
    return {
      LOG: 'log',
      ERROR: 'error',
      LOGIN: 'login',
      LOGOUT: 'logout',
      RECORD_START: 'recordStart',
      RECORD_STOP: 'recordStop',
      TOKEN_SET: 'tokenSet',
      REFRESH_TOKEN_SET: 'refreshTokenSet',
      TOKEN_INVALID: 'tokenInvalid'
    }
  }
}

module.exports = AVS
