// Same tokenizer as in humanification
// $<variable name> will stay one token
const natural = require('natural')
const tokenizer = new natural.RegexpTokenizer({ pattern: /([A-zÀ-ÿ-$]+|[0-9._]+|.|!|\?|'|"|:|;|,|-)/i })

module.exports = (utterance) => {
  return tokenizer.tokenize(utterance)
  // splits hängst
  // return utterance.split(/\b/);
}
