const trigger = require('./trigger')
const { exec } = require('child_process')

const eurobeat =
  process.env.HOME + '/Dropbox/Deja\\ Vu\\ -\\ Perfect\\ Loop.wav'
const command = `mplayer -loop 0 ${eurobeat}`

/**
 * How much time after an "off" signal is given should the mode stop
 */
const fallof = 3000

let mode = false
let fallofStart = null

trigger.on('update', newMode => {
  // mode changed to on
  if (newMode && !mode) {
    fallofStart = null
    mode = true
    console.log('activated!')

    if (!audio) {
      audio = exec(command)
    }
  }

  // mode changed to off
  if (!newMode && mode) {
    const now = Date.now()
    if (fallofStart) {
      // check the fallof
      if (now - fallofStart >= fallof) {
        mode = false
        console.log('stoped!')

        if (audio) {
          // TODO: implement volume fallof
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
