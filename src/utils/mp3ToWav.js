const mp3ToAudioBuffer = require('audio-decode')
const audioBufferToWav = require('audiobuffer-to-wav')
const arrayBufferToBuffer = require('arraybuffer-to-buffer')
const isMP3 = require('is-mp3')

module.exports = async (mp3AsBuffer) => {
  // 1) Slice first two characters. Alexa returns the MP3 starting with \n\r
  // or just the HTTP message is not parsed well?
  // this MP3 is correct for a MP3 player, but not for mp3ToAudioBuffer.isMP3 module.
  // so i remove this \n\r
  if (mp3AsBuffer[2] === 73) {
    mp3AsBuffer = mp3AsBuffer.slice(2, mp3AsBuffer.length)
  }
  if (!isMP3(mp3AsBuffer)) {
    throw new Error(`The source does not looks as an mp3 [${mp3AsBuffer[0]}] [${mp3AsBuffer[1]}] [${mp3AsBuffer[2]}] `)
  }
  // 2 mp3Buffer -> audioBuffer (It is a generalized audio format?)
  // 3 audioBuffer -> wav array buffer (third buffer type in this function. But function wants it)
  // 4 wav array buffer -> wav buffer (buffer can be stored as file. Or wav-array-buffer could be written too?)
  const audioBuffer = await mp3ToAudioBuffer(mp3AsBuffer)
  const wavAsArrayBuffer = audioBufferToWav(audioBuffer)
  const buffer = arrayBufferToBuffer(wavAsArrayBuffer)
  return buffer
}
