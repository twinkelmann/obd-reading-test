const trigger = require('./trigger')

trigger.on('update', takumi => {
  console.log(`Takumi mode: ${takumi ? 'yes' : 'no'}`)

  // TODO: handle fallof when mode turn off
  // TODO: handle timeout when the mode hasn't been updated for a while
  // TODO: kick that Eurobeat in !
})
