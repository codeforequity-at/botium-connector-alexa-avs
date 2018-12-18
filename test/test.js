const Connector = require('../index').PluginClass

const connector = new Connector(
  {
    caps:
      {
        'ALEXA_AVS_AVS_CLIENT_ID': 'amzn1.application-oa2-client.30b9586bdef64da39b6823c5dd428ebd',
        'ALEXA_AVS_AVS_REFRESH_TOKEN': 'Atzr|IwEBIF2MzP5oMeBtxMxgkiOVrAm8qxhs4HEoPsDkCcUfsNhCAy7CCIOGy9RKnB9wTFAiCMj0Iit_nzDmH__UKrt98TAsTsfMa8AziPRPudGJ_iz34UfhkKyCDMTz0y8WSt1WCOEOtLhmBtcSiQL_W0V1IBzcxbMfNVWP60evMdJAsPbgPPU2VJJ5QGwkMWmWcs0R_3ia406bN_P9gs9tp5KYPHwknvZbWIIMuFQMKIUHiefqNnu5GTOCDMq1Gc_8Kit00eHAcUnoTLKjnl_1IrDcHi6KGthMtp_wvcpjycUci0zWzZinHHY_0igMjUd691xZ4T9YuEV8Q4Dtf8cEJKXH9by02r94YYSvRFK0wuSsV57SwvvpAx0UovVbFAd9_6WesLGFPbtAt3MAXuTt7lP7FfOljSLciL_gjq8dQ6JqPmQHo89XKEjW1uD5EDmd_ocAjf92QseS6DV1J-k9A4pL3vL7p2x8LTs1jV5Q-WGMh2LEoOiB2uU5EN92VZT8ZSO3q4jqTOteDhdxAL9t8a-RWBLL',
        'ALEXA_AVS_AVS_LANGUAGE_CODE': 'en_US',
        'ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_PRIVATE_KEY': '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCzK1UNvGUTGJPe\nYlGSsju5gZh/EffJ7H00eB9Q5l+1m06qpv9CN8wKSTt0br1K5Ny1/OmiZXixHv7I\nRCedPjRDUk2khx4QKX9Ck8v4M4pk+5S6rHxUEo7N4u0C0H3U+L/yKPxWWiBKXryv\nWn2x5SZp1f1arueC5VtK1Cym7xkRArj53x/gajGz4aEWs2viSPznlDQynfy1Jv9k\nOKuRzQ4lGGbJykff2czzd22EQR9Sy4oAGJVaU5M62ReFWuwd/+i05MkcaetrgSyY\n3ELMyqwCDGeJFoH32DOtUFZPrdxIicdllS2csE7o94zrz1cQshJ99l/Wpr5xg/nD\nWdulStzTAgMBAAECggEADm5CivkuEOQtYL99f3nAirfv7uglE4vrJ7M3Hn53nfp0\n0xThQVWaJwfv9HhI4cPeLQBCVxSiLG3pKnsmz6jnb7asz0AcwUN+Xv/lcUfBcVG8\nEG79Eo5uFxIccdoWEHW6jAgWDuRyblsECoGY1x+0QNj973Rf7DCJ8lR1hjqCw9ZY\nA3E0e5lyLHYvhtU5wb7Kh+ozV+Nz7y+TWlt1vL8aygrzS8w7raNcy8aLxQu7FJb3\nGK6fPSsTfb0PW0EXh8l+MKb/u+Yz+h4QaIvuv8O8CH8E19Jgc09H0Se5ZcXb3RC8\npWJlwEDIm0GsPXYEw3xQsujaJzV7OqWs7BMOocDDSQKBgQDznXBRR6L0kfi9jVxX\nA3GqUEc/xsfjdJjE9lwu1zAaPinsXG4Ui1ZQLMXw/002shg44D5P/+NU1Nz+/utj\neqej76u/L3dpphZJztTvD6x+rBDRXpnRk0MqJGXHL6NoEfdua5J2v/pyY9ADhaSb\npSu93mRMU7KTAc2qqCDNEAGB+wKBgQC8RyfVOfFShltxcUv+x9/q8ICqgUhYgwv1\nhA74PrTu/x7pc+fzUXTLpwgHroQc/Z8h52O+fR+6cU6DvYhZ6l6yILTQElfA+Tx+\n5qBTcCz0aVr9vhT8W2FngQiBIimPKGe7NGadatV9RFKOHwf40a7qOw4C7As1o5w8\n1aDbt6DxCQKBgB8GG7meH9h5hm3NRMcn/x+rXYd3rxj+Tj43CYJFkTCmXfxlwPcI\nz5MiQIryWEjw4TjNBeJ2OeMhwIsQt7VRd2vfJ8YPK2ve5NO9bUyMeHEhRHsFSx1v\nXYxOWk/Fd0/XieUb+ej5hdFveJwaNt5DaJCjc65ssj8aabCj/JlgwnBlAoGAIWWZ\nyjfZ96J/i/Ll4Q7BSGJa4GPIWnL8ZxOCuEQfQhmc+RonNcDoL8u0H/Cz3JScap4p\n0jtNqnu4yqOPESwCmiQ1DoeCa2eKdJQiMkq+nqgljMbv4AexknOP96AAsTUgmVNl\nNF0j+3FoF2+nsVo4ZbIN/TSzlFMuPphCTVcYREkCgYEAxGLCxx57sDdpeIMV3ztR\ncivteDbgU+T2dGodeWbYYXECOR2whf1uYliVVTUH8LRKD/NgXLrESHfrpak2Ar+3\nQHvC5/yy8TEDh2vteDDaaau1zjfcCQrY8ELSrzkSFtgo6gfXJiT6B00pmknrVAmd\nDwz9vMUf6Ljyrrq9Iw3AOhk=\n-----END PRIVATE KEY-----\n',
        'ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_CLIENT_EMAIL': 'botiumspeech-read@botiumspeech.iam.gserviceaccount.com',
        'ALEXA_AVS_TTS_GOOGLE_CLOUD_TEXT_TO_SPEECH_LANGUAGE_CODE': 'en_US',
        'ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_PRIVATE_KEY': '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCzK1UNvGUTGJPe\nYlGSsju5gZh/EffJ7H00eB9Q5l+1m06qpv9CN8wKSTt0br1K5Ny1/OmiZXixHv7I\nRCedPjRDUk2khx4QKX9Ck8v4M4pk+5S6rHxUEo7N4u0C0H3U+L/yKPxWWiBKXryv\nWn2x5SZp1f1arueC5VtK1Cym7xkRArj53x/gajGz4aEWs2viSPznlDQynfy1Jv9k\nOKuRzQ4lGGbJykff2czzd22EQR9Sy4oAGJVaU5M62ReFWuwd/+i05MkcaetrgSyY\n3ELMyqwCDGeJFoH32DOtUFZPrdxIicdllS2csE7o94zrz1cQshJ99l/Wpr5xg/nD\nWdulStzTAgMBAAECggEADm5CivkuEOQtYL99f3nAirfv7uglE4vrJ7M3Hn53nfp0\n0xThQVWaJwfv9HhI4cPeLQBCVxSiLG3pKnsmz6jnb7asz0AcwUN+Xv/lcUfBcVG8\nEG79Eo5uFxIccdoWEHW6jAgWDuRyblsECoGY1x+0QNj973Rf7DCJ8lR1hjqCw9ZY\nA3E0e5lyLHYvhtU5wb7Kh+ozV+Nz7y+TWlt1vL8aygrzS8w7raNcy8aLxQu7FJb3\nGK6fPSsTfb0PW0EXh8l+MKb/u+Yz+h4QaIvuv8O8CH8E19Jgc09H0Se5ZcXb3RC8\npWJlwEDIm0GsPXYEw3xQsujaJzV7OqWs7BMOocDDSQKBgQDznXBRR6L0kfi9jVxX\nA3GqUEc/xsfjdJjE9lwu1zAaPinsXG4Ui1ZQLMXw/002shg44D5P/+NU1Nz+/utj\neqej76u/L3dpphZJztTvD6x+rBDRXpnRk0MqJGXHL6NoEfdua5J2v/pyY9ADhaSb\npSu93mRMU7KTAc2qqCDNEAGB+wKBgQC8RyfVOfFShltxcUv+x9/q8ICqgUhYgwv1\nhA74PrTu/x7pc+fzUXTLpwgHroQc/Z8h52O+fR+6cU6DvYhZ6l6yILTQElfA+Tx+\n5qBTcCz0aVr9vhT8W2FngQiBIimPKGe7NGadatV9RFKOHwf40a7qOw4C7As1o5w8\n1aDbt6DxCQKBgB8GG7meH9h5hm3NRMcn/x+rXYd3rxj+Tj43CYJFkTCmXfxlwPcI\nz5MiQIryWEjw4TjNBeJ2OeMhwIsQt7VRd2vfJ8YPK2ve5NO9bUyMeHEhRHsFSx1v\nXYxOWk/Fd0/XieUb+ej5hdFveJwaNt5DaJCjc65ssj8aabCj/JlgwnBlAoGAIWWZ\nyjfZ96J/i/Ll4Q7BSGJa4GPIWnL8ZxOCuEQfQhmc+RonNcDoL8u0H/Cz3JScap4p\n0jtNqnu4yqOPESwCmiQ1DoeCa2eKdJQiMkq+nqgljMbv4AexknOP96AAsTUgmVNl\nNF0j+3FoF2+nsVo4ZbIN/TSzlFMuPphCTVcYREkCgYEAxGLCxx57sDdpeIMV3ztR\ncivteDbgU+T2dGodeWbYYXECOR2whf1uYliVVTUH8LRKD/NgXLrESHfrpak2Ar+3\nQHvC5/yy8TEDh2vteDDaaau1zjfcCQrY8ELSrzkSFtgo6gfXJiT6B00pmknrVAmd\nDwz9vMUf6Ljyrrq9Iw3AOhk=\n-----END PRIVATE KEY-----\n',
        'ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_CLIENT_EMAIL': 'botiumspeech-read@botiumspeech.iam.gserviceaccount.com',
        'ALEXA_AVS_STT_GOOGLE_CLOUD_SPEECH_LANGUAGE_CODE': 'en_US'
      },
    queueBotSays: (message) => console.log(`Alexa answered: "${message}"`)
  }
)

connector.Validate()
  .then(() => connector.Build())
  .then(() => connector.Start())
  .then(() => connector.UserSays('Alexa alarm'))
  .then(() => connector.UserSays('Alexa alarm'))
  .then(() => connector.UserSays('Alexa alarm'))
  .then(() => connector.Stop())
  .then(() => connector.Clean())
  .catch((ex) => console.log(ex))
