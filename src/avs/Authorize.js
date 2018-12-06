const getMac = require('getmac')
const request = require('request')

const _pressAnyKeyToContinue = () => {
  return new Promise((resolve) => {
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('data', () => resolve)
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
          productID: productID,
          productInstanceAttributes:
            {
              deviceSerialNumber: macAddress
            }
        }
      }

      request(
        {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded'
          },
          uri: `https://api.amazon.com/auth/O2/create/codepair?`,
          form
        }, function (error, response, body) {
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
    if (typeof code !== 'string') {
      const error = new TypeError('`code` must be a string.')
      return reject(error)
    }

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

module.exports.DeviceTokenRefreshRequest = (refreshToken, clientId) => {
  /*
  {
    "access_token": "{{STRING}}",
    "refresh_token": "{{STRING}}",
    "token_type": "bearer",
    "expires_in": {{INTEGER}}  }
  */
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
        resolve(body)
      })
  })
}

module.exports.RefreshTokenAcquireRequest = (clientId, productID) => {
  return _deviceAuthorizationRequest(clientId, productID)
    .then((deviceAuthorizationResponse) => {
      console.log(`Device code is ${deviceAuthorizationResponse.device_code}`)
      console.log(`Please login on ${deviceAuthorizationResponse.verification_uri} and enter ${deviceAuthorizationResponse.user_code}`) // Print the HTML for the Google homepage.
      console.log('Press any key after done')
      return _pressAnyKeyToContinue()
        .then(() => deviceAuthorizationResponse)
    })
    .then((deviceAuthorizationResponse) => _deviceTokenRequest(deviceAuthorizationResponse))
    .then((deviceTokenResponse) => {
      console.log(`Refresh token acquired`)
      console.log(`The proper Capabilities:`)
      console.log(`The proper Capabilities:`)
      console.log(`The proper Capabilities:`)
    })
}
