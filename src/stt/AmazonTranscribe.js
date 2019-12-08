const AWS = require('aws-sdk')
const randomize = require('randomatic')
const debug = require('debug')('botium-connector-alexa-avs-stt-amazon-transcribe')
const util = require('util')
const AmazonS3URI = require('amazon-s3-uri')

const Capabilities = {
  ALEXA_AVS_STT_AMAZON_TRANSCRIBE_REGION: 'ALEXA_AVS_STT_AMAZON_TRANSCRIBE_REGION',
  ALEXA_AVS_STT_AMAZON_TRANSCRIBE_ACCESS_KEY_ID: 'ALEXA_AVS_STT_AMAZON_TRANSCRIBE_ACCESS_KEY_ID',
  ALEXA_AVS_STT_AMAZON_TRANSCRIBE_SECRET_ACCESS_KEY: 'ALEXA_AVS_STT_AMAZON_TRANSCRIBE_SECRET_ACCESS_KEY',
  ALEXA_AVS_STT_AMAZON_TRANSCRIBE_LANGUAGE_CODE: 'ALEXA_AVS_STT_AMAZON_TRANSCRIBE_LANGUAGE_CODE',
  ALEXA_AVS_STT_AMAZON_TRANSCRIBE_BUCKET_NAME: 'ALEXA_AVS_STT_AMAZON_TRANSCRIBE_BUCKET_NAME'
}

class AmazonTranscribe {
  constructor (caps) {
    this.caps = caps
    this.running = false
  }

  Validate () {
    if (!this.caps[Capabilities.ALEXA_AVS_STT_AMAZON_TRANSCRIBE_REGION]) throw new Error('ALEXA_AVS_STT_AMAZON_TRANSCRIBE_ACCESS_KEY_ID capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_STT_AMAZON_TRANSCRIBE_ACCESS_KEY_ID]) throw new Error('ALEXA_AVS_STT_AMAZON_TRANSCRIBE_ACCESS_KEY_ID capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_STT_AMAZON_TRANSCRIBE_SECRET_ACCESS_KEY]) throw new Error('ALEXA_AVS_STT_AMAZON_TRANSCRIBE_SECRET_ACCESS_KEY capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_STT_AMAZON_TRANSCRIBE_LANGUAGE_CODE]) throw new Error('ALEXA_AVS_STT_AMAZON_TRANSCRIBE_LANGUAGE_CODE capability required')
    if (!this.caps[Capabilities.ALEXA_AVS_STT_AMAZON_TRANSCRIBE_BUCKET_NAME]) throw new Error('ALEXA_AVS_STT_AMAZON_TRANSCRIBE_BUCKET_NAME capability required')
  }

  Build () {
    // Creates a client
    this.client = new AWS.TranscribeService({
      apiVersion: '2017-10-26',
      region: this.caps[Capabilities.ALEXA_AVS_STT_AMAZON_TRANSCRIBE_REGION],
      accessKeyId: this.caps[Capabilities.ALEXA_AVS_STT_AMAZON_TRANSCRIBE_ACCESS_KEY_ID],
      secretAccessKey: this.caps[Capabilities.ALEXA_AVS_STT_AMAZON_TRANSCRIBE_SECRET_ACCESS_KEY]
    })

    this.defaultRequest = {
      MediaFormat: 'mp3',
      LanguageCode: this.caps[Capabilities.ALEXA_AVS_STT_AMAZON_TRANSCRIBE_LANGUAGE_CODE]
    }

    this.s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      region: this.caps[Capabilities.ALEXA_AVS_STT_AMAZON_TRANSCRIBE_REGION],
      accessKeyId: this.caps[Capabilities.ALEXA_AVS_STT_AMAZON_TRANSCRIBE_ACCESS_KEY_ID],
      secretAccessKey: this.caps[Capabilities.ALEXA_AVS_STT_AMAZON_TRANSCRIBE_SECRET_ACCESS_KEY]
    })
  }

  Start () {
    debug('Start called')
    this.running = true
    return Promise.resolve()
  }

  Recognize (audio) {
    debug('Recognize called')
    return new Promise((resolve, reject) => {
      // 1. upload to S3
      const processId = randomize('a0', 10)
      const fileKey = 'to-transcribe-source-' + processId
      const params = {
        Bucket: this.caps[Capabilities.ALEXA_AVS_STT_AMAZON_TRANSCRIBE_BUCKET_NAME],
        Key: fileKey,
        Body: audio
      }
      debug(`S3 params ${util.inspect(params)}`)

      this.s3.upload(params, (err, s3Response) => {
        if (err) {
          return reject(new Error(`Upload to S3 failed: ${util.inspect(err)}`))
        }

        debug(`S3 upload succesfull ${util.inspect(s3Response)}`)

        // 2. Transcribe job start
        const transcriptionJobName = 'to-transcribe-job-' + processId

        const transcriptionParams = Object.assign(
          {
            Media: { MediaFileUri: s3Response.Location },
            TranscriptionJobName: transcriptionJobName,
            OutputBucketName: this.caps[Capabilities.ALEXA_AVS_STT_AMAZON_TRANSCRIBE_BUCKET_NAME]
          },
          this.defaultRequest)

        debug(`Transcription params ${util.inspect(transcriptionParams)}`)

        this.client.startTranscriptionJob(
          transcriptionParams,
          (err, data) => {
            if (err) {
              return reject(new Error(`Failed to start transcribe job: ${util.inspect(err)}`))
            }
            debug(`Transcription job started. Polling job ${transcriptionJobName} file ${s3Response.Location}`)

            let options = {
              client: this.client,
              s3: this.s3,
              fileKey: fileKey,
              bucket: this.caps[Capabilities.ALEXA_AVS_STT_AMAZON_TRANSCRIBE_BUCKET_NAME],
              transcriptionJobName: transcriptionJobName,
              mediaFileUri: s3Response.Location,
              isRunning: () => { return this.running }
            }

            // 2. polling the job
            return _startPolling(options)
              .then((data) => {
                if (this.running) {
                  debug('Polling finished, process stopped')
                  return Promise.reject(new Error('Already stopped'))
                }
                const { key } = AmazonS3URI(data.TranscriptionJob.Transcript.TranscriptFileUri)
                options = { ...options, outputfileKey: key }
                // 3. download result
                return _downloadTranscription(options)
                  .then((transcription) => {
                    // 4. clean up temporary files, and return the text
                    return _cleanup(options)
                      .then(() => {
                        debug(`Recognize finished: ${transcription}`)
                        return resolve(transcription)
                      })
                  })
              })
          }
        )
      })
    })
  }

  Stop () {
    debug('Stop called')
    this.running = false
    return Promise.resolve()
  }

  Clean () {
    this.defaultRequest = null
    this.client = null
    this.s3 = null
    return Promise.resolve()
  }
}

const _cleanup = (options) => {
  return new Promise((resolve, reject) => {
    options.s3.deleteObjects(
      {
        Bucket: options.bucket,
        Delete: {
          Objects: [
            {
              Key: options.fileKey
            },
            {
              Key: options.outputfileKey
            }
          ]
        }
      },
      (err, data) => {
        if (err) {
          return reject(new Error(`Failed to download transcription: ${util.inspect(err)}`))
        }
        debug(`S3 download transcribe succesfull ${util.inspect(data)}`)
        resolve(data)
      }
    )
  })
}

const _downloadTranscription = (options) => {
  return new Promise((resolve, reject) => {
    options.s3.getObject(
      {
        Bucket: options.bucket,
        Key: options.outputfileKey
      },
      (err, data) => {
        if (err) {
          return reject(new Error(`Failed to download transcription: ${util.inspect(err)}`))
        }
        debug(`S3 download transcribe succesful ${util.inspect(data)}`)
        const json = JSON.parse(data.Body.toString())
        debug(`S3 download transcribe as JSON ${JSON.stringify(json, null, 2)}`)
        if (json.results.transcripts.length !== 1) {
          return reject(new Error(`Unknown transcription format: ${util.inspect(json.results.transcripts)}`))
        }

        resolve(json.results.transcripts[0].transcript)
      }
    )
  })
}

const _startPolling = (options) => {
  return new Promise((resolve, reject) => {
    if (!options.isRunning()) {
      debug('Polling finished, process stopped')
      return reject(new Error('Already stopped'))
    }
    debug('Polling...')
    options.client.getTranscriptionJob(
      { TranscriptionJobName: options.transcriptionJobName },
      (err, data) => {
        if (err) {
          debug(`Failed to get transcribe job: ${util.inspect(err)}`)
          return reject(new Error(`Failed to get transcribe job: ${util.inspect(err)}`))
        }
        if (data.TranscriptionJob.TranscriptionJobStatus === 'IN_PROGRESS') {
          setTimeout(() => {
            _startPolling(options)
              .then((data) => resolve(data))
              .catch(err => reject(err))
          }, 1000)

          return
        }
        if (data.TranscriptionJob.TranscriptionJobStatus === 'FAILED') {
          debug(`Transcribe job is failed ${util.inspect(data)}`)
          return reject(new Error(`Transcription job failed ${util.inspect(data)}`))
        }
        if (data.TranscriptionJob.TranscriptionJobStatus !== 'COMPLETED') {
          debug(`Transcription job unknown status ${data.TranscriptionJob.TranscriptionJobStatus} result ${util.inspect(data)}`)
          return reject(new Error(`Transcription job unknown status ${data.TranscriptionJob.TranscriptionJobStatus} result ${util.inspect(data)}`))
        }

        debug(`Transcription job finished succesfull ${util.inspect(data)}`)
        return resolve(data)
      }
    )
  })
}

module.exports = AmazonTranscribe
