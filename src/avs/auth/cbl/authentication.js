const getMac = require('getmac')
const request = require('request')
var keypress = require('keypress')
// make `process.stdin` begin emitting "keypress" events
keypress(process.stdin)

const _keypress = (question) => {
  return new Promise((resolve, reject) => {
    process.stdin.on('keypress', function (ch, key) {
      process.stdin.pause()
      resolve(key)
    })

    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true)
    }
    process.stdin.resume()
  })
}

const _deviceAuthorizationRequest = (clientId, productID) => {
  return new Promise((resolve, reject) => {
    getMac.getMac(function (err, macAddress) {
      if (err) {
        reject(err)
        return
      }

      const form = {
        response_type: 'device_code',
        client_id: clientId,
        scope: 'alexa:all',
        scope_data:
        {
          'alexa:all': {
            productID: productID,
            productInstanceAttributes:
              {
                deviceSerialNumber: macAddress
              }
          }
        }
      }

      form.scope_data = JSON.stringify(form.scope_data)
      const requestObject =
        {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded'
          },
          uri: `https://api.amazon.com/auth/O2/create/codepair`,
          form
        }
      request(requestObject, function (error, response, body) {
        if (error) {
          reject(error)
          return
        }
        if (response && response.statusCode !== 200) {
          reject(body)
          return
        }
        body = JSON.parse(body)
        /*
        {
          "user_code": "{{STRING}}",
          "device_code": "{{STRING}}",
          "verification_uri": "{{STRING}}",
          "expires_in": {{INTEGER}},
          "interval": {{INTEGER}}
        }
         */
        resolve(body)
      })
    })
  })
}

const _deviceTokenRequest = (deviceAuthorizationResponse) => {
  /*
  {
    "user_code": "{{STRING}}",
    "device_code": "{{STRING}}",
    "verification_uri": "{{STRING}}",
    "expires_in": {{INTEGER}},
    "interval": {{INTEGER}}
  }
*/
  return new Promise((resolve, reject) => {
    const form = {
      grant_type: 'device_code',
      device_code: deviceAuthorizationResponse.device_code,
      user_code: deviceAuthorizationResponse.user_code
    }

    request(
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        },
        uri: `https://api.amazon.com/auth/O2/token?`,
        form
      }, function (error, response, body) {
        if (error) {
          throw error
        }
        if (response && response.statusCode !== 200) {
          throw body
        }

        body = JSON.parse(body)
        resolve(body)
      })
  })
}

module.exports.AccessTokenRefreshRequest = (clientId, refreshToken) => {
  return new Promise((resolve, reject) => {
    if (typeof code !== 'string') {
      const error = new TypeError('`code` must be a string.')
      return reject(error)
    }

    const form = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId
    }

    request(
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        },
        uri: `https://api.amazon.com/auth/O2/token?`,
        form
      }, function (error, response, body) {
        if (error) {
          throw error
        }
        if (response && response.statusCode !== 200) {
          throw body
        }

        body = JSON.parse(body)
        /*
        {
          "access_token": "{{STRING}}",
          "refresh_token": "{{STRING}}",
          "token_type": "bearer",
          "expires_in": {{INTEGER}}  }
        */
        resolve(body)
      })
  })
}

/*
        {
          "user_code": "{{STRING}}",
          "device_code": "{{STRING}}",
          "verification_uri": "{{STRING}}",
          "expires_in": {{INTEGER}},
          "interval": {{INTEGER}}
        }
*/
module.exports.RefreshTokenAcquireRequest = async (clientId, productID) => {
  console.log('Authorizing device, please wait...')
  const deviceAuthorizationResponse = await _deviceAuthorizationRequest(clientId, productID)
  console.log(`Please login on ${deviceAuthorizationResponse.verification_uri} and enter ${deviceAuthorizationResponse.user_code}`) // Print the HTML for the Google homepage.
  console.log('Press enter after done')
  await _keypress(' ')

  console.log('Acquiring token')
  const deviceTokenResponse = await _deviceTokenRequest(deviceAuthorizationResponse)
  console.log('Token acquired: ' + JSON.stringify(deviceTokenResponse))
  return deviceTokenResponse
}
