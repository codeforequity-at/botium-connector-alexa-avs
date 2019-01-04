const debug = require('debug')('botium-connector-alexa-avs-mp3-to-wav')
const mp3ToAudioBuffer = require('audio-decode')
const audioBufferToWav = require('audiobuffer-to-wav')
const arrayBufferToBuffer = require('arraybuffer-to-buffer')

module.exports = (mp3AsBuffer) => {
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
