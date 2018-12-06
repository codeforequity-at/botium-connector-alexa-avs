const yargs = require('yargs')
const getMac = require('getmac')
const request = require('request')

const argv = yargs.usage(
  'Usage: $0 -c [str] -p [str]')
  .demandOption(['c', 'p'])
  .alias('c', 'client-id')
  .nargs('c', 1)
  .describe('c', 'Client id')
  .alias('p', 'product-id')
  .nargs('p', 1)
  .describe('p', 'Product id')
  .version(false) // do not parse version from package.json
  .argv

getMac.getMac(function (err, macAddress) {
  if (err) throw err

  const uri = `https://api.amazon.com/auth/O2/create/codepair?`
  const form = {
    response_type: 'device_code',
    client_id: argv.c,
    scope: 'alexa:all',
    scope_data:
        {
          productID: argv.p,
          productInstanceAttributes:
            {
              deviceSerialNumber: macAddress
            }
        }
  }

  console.log(uri)
  request(
    { method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      uri,
      form,
      json: true
    }, function (error, response, body) {
      if (error) {
        throw error
      }
      if (response && response.statusCode !== 200) {
        throw body
      }

      console.log(`Please login on ${body.verification_uri} and enter ${body.user_code}`) // Print the HTML for the Google homepage.
    })
})
