const _ = require('lodash')

const _PATTERN = /([A-zÀ-ÿ-$]+|[0-9._]+|.|!|\?|'|"|:|;|,|-)/i

module.exports = (utterance) => {
  const results = utterance.split(_PATTERN)
  return _.without(results, '', ' ')
}
