const fs = require('fs')
const _ = require('lodash')
const debug = require('debug')('botium-connector-alexa-avs-homophones')

const loadHomophones = (capValue) => {
  const errMessages = []

  if (!capValue) return {}

  let fromValue = capValue
  if (_.isString(capValue)) {
    if (fs.existsSync(capValue)) {
      try {
        fromValue = fs.readFileSync(capValue).toString()
      } catch (err) {
        errMessages.push(`Could not load homophones list from file: ${err.message}`)
      }
    }
  }

  let result = null
  if (_.isObject(fromValue)) {
    result = fromValue
  } else if (_.isString(fromValue)) {
    try {
      const obj = JSON.parse(fromValue)
      result = obj
    } catch (err) {
      errMessages.push(`Could not parse homophones JSON: ${err.message}`)
    }
    if (!result) {
      const lines = fromValue.split('\n').map(l => l.trim()).filter(l => l)
      result = {}
      for (const line of lines) {
        const parts = line.split(/[,:;]+/).map(p => p.replace(/["]+/g, '').trim())
        if (parts.length > 1) {
          result[parts[0]] = parts.slice(1)
        }
      }
    }
  }

  if (!result || Object.keys(result).length === 0) {
    for (const em of errMessages) {
      debug(em)
    }
  } else {
    debug(`Processing homophones list: ${JSON.stringify(result, null, 2)}`)
    for (const homophone of Object.keys(result)) {
      const list = _.isArray(result[homophone]) ? result[homophone] : [result[homophone]]
      result[homophone] = list.map(l => new RegExp(l, 'gi'))
    }
    return result
  }
}

const replaceHomophones = (homophones, utterance) => {
  if (!homophones) return utterance

  let result = utterance
  for (const homophone of Object.keys(homophones)) {
    for (const r of homophones[homophone]) {
      result = result.replace(r, homophone)
    }
  }
  return result
}

module.exports = {
  loadHomophones,
  replaceHomophones
}
