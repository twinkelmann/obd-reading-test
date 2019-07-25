const trigger = require('./trigger')
const { exec } = require('child_process')

const eurobeat =
  process.env.HOME + '/Dropbox/Deja\\ Vu\\ -\\ Perfect\\ Loop.wav'

/**
 * How much time after an "off" signal is given should the mode stop
 */
const fallof = 3000

let mode = false
let fallofStart = null

const command = `mplayer -loop 0 ${eurobeat}`

trigger.on('update', newMode => {
  if (newMode && !mode) {
    fallofStart = null
    mode = true
    console.log('activated!')
    // TODO: play music
    if (!audio) {
      audio = exec(command)
    }

    // if the mode isn't on, nothing else to check
  } else if (mode) {
    const now = Date.now()
    if (fallofStart) {
      // check the fallof
      if (now - fallofStart >= fallof) {
        mode = false
        console.log('stoped!')
        // TODO: stop music
        if (audio) {
          audio.kill()
          audio = null
        }
      }
    } else {
      // start the fallof
      fallofStart = now
    }
  }
})
