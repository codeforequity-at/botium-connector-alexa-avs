const util = require('util')
const uuidv1 = require('uuid/v1')
const request = require('request')
const readlineSync = require('readline-sync')

const _keypress = (question) => {
  return new Promise((resolve, reject) => {
    resolve(readlineSync.question(question))
  })
}

/*
{
  "user_code": "{{STRING}}",
  "device_code": "{{STRING}}",
  "verification_uri": "{{STRING}}",
  "expires_in": {{INTEGER}},
  "interval": {{INTEGER}}
  "client_id": "{{STRING}}",
  "product_id": "{{STRING}}",
  "device_serial_number": "{{STRING}}"
}
 */
const _deviceAuthorizationRequest = (clientId, productID) => {
  return new Promise((resolve, reject) => {
    const deviceSerialNumber = uuidv1()
    console.log('Device serial number: ' + deviceSerialNumber)

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
                deviceSerialNumber: deviceSerialNumber
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
        return reject(new Error(`_deviceAuthorizationRequest failed: ${util.inspect(error)}`))
      }
      if (response && response.statusCode !== 200) {
        return reject(new Error(`_deviceAuthorizationRequest failed with status code ${response.statusCode}: ${util.inspect(body)}`))
      }
      body = JSON.parse(body)
      return resolve(
        Object.assign(
          body,
          {
            client_id: clientId,
            product_id: productID,
            device_serial_number: deviceSerialNumber
          }
        )
      )
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
        uri: `https://api.amazon.com/auth/O2/token`,
        form
      }, function (error, response, body) {
        if (error) {
          return reject(new Error(`_deviceTokenRequest failed: ${util.inspect(error)}`))
        }
        if (response && response.statusCode !== 200) {
          return reject(new Error(`_deviceTokenRequest failed with status code ${response.statusCode}: ${util.inspect(body)}`))
        }

        body = JSON.parse(body)
        resolve(body)
      })
  })
}

/*
{
  "access_token": "{{STRING}}",
  "refresh_token": "{{STRING}}",
  "token_type": "bearer",
  "expires_in": {{INTEGER}}
}
*/
const AccessTokenRefreshRequest = (clientId, clientSecret, refreshToken) => {
  return new Promise((resolve, reject) => {
    const form = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
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
          return reject(new Error(`AccessTokenRefreshRequest failed: ${util.inspect(error)}`))
        }
        if (response && response.statusCode !== 200) {
          return reject(new Error(`AccessTokenRefreshRequest failed with status code ${response.statusCode}: ${util.inspect(body)}`))
        }

        body = JSON.parse(body)
        resolve(body)
      })
  })
}

/*
        {
          "access_token": "{{STRING}}",
          "refresh_token": "{{STRING}}",
          "token_type": "bearer",
          "expires_in": {{INTEGER}}
          "user_code": "{{STRING}}",
          "device_code": "{{STRING}}",
          "verification_uri": "{{STRING}}",
          "interval": {{INTEGER}}
          "client_id": "{{STRING}}",
          "product_id": "{{STRING}}",
          "device_serial_number": "{{STRING}}"
         }
*/
const RefreshTokenAcquireRequest = (clientId, productID) => {
  console.log('Authorizing device...')

  let deviceAuthorizationResponse = null
  return _deviceAuthorizationRequest(clientId, productID)
    .then((response) => {
      deviceAuthorizationResponse = response
      console.log(`Please login on ${deviceAuthorizationResponse.verification_uri} and enter ${deviceAuthorizationResponse.user_code}`) // Print the HTML for the Google homepage.
      console.log('Press enter after done')
      return _keypress(' ')
    })
    .then(() => {
      console.log('Acquiring token...')
      return _deviceTokenRequest(deviceAuthorizationResponse)
    })
    .then((deviceTokenResponse) => {
      console.log('Token acquired: ' + JSON.stringify(deviceTokenResponse))
      return Object.assign(deviceAuthorizationResponse, deviceTokenResponse)
    })
}

const SendCapabilities = (accessToken, retryDelay = 0.5) => {
  return new Promise((resolve, reject) => {
    request(
      {
        method: 'PUT',
        uri: `https://api.amazonalexa.com/v1/devices/@self/capabilities`,
        headers: {
          'authorization': `Bearer ${accessToken}`
        },
        body: {
          envelopeVersion: '20160207',
          capabilities: [
            {
              'type': 'AlexaInterface',
              'interface': 'SpeechRecognizer',
              'version': '2.0'
            }
          ]
        },
        json: true
      },
      function (error, response, body) {
        if (error) {
          return reject(error)
        }
        if (response.statusCode === 204) {
          return resolve()
        }

        if (response.statusCode === 500) {
          retryDelay = retryDelay * 2
          if (retryDelay > 256) {
            return reject(new Error('Too mutch retry, giving up!'))
          }

          setTimeout(
            () => {
              return SendCapabilities(accessToken, retryDelay)
            },
            retryDelay * 1000)
        }

        return reject(response)
      }
    )
  })
}
module.exports = {
  AccessTokenRefreshRequest,
  RefreshTokenAcquireRequest,
  SendCapabilities
}
