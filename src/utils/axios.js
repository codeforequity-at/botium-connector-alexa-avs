const _ = require('lodash')

const getAxiosShortenedOutput = (data) => {
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

const getAxiosErrOutput = (err) => {
  if (err && err.response) {
    return `Status: ${err.response.status} / Response: ${getAxiosShortenedOutput(err.response.data)}`
  } else {
    return err.message
  }
}

module.exports = {
  getAxiosShortenedOutput,
  getAxiosErrOutput
}
