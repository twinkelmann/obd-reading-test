const trigger = require('./trigger')
const { exec } = require('child_process')

// TODO: list songs with a drop timestamp (from a JSON file)
// and start a random song at the timestamp with mplayer.
// if song reaches the end, play another random one from the beginning
const eurobeat =
  process.env.HOME + '/Dropbox/Deja\\ Vu\\ -\\ Perfect\\ Loop.wav'
const command = `mplayer -loop 0 -msglevel all=-1 ${eurobeat}`

/**
 * How much time after an "off" signal is given should the mode stop
 */
const fallof = 10 * 1000

let mode = false
let fallofStart = null
let audio = null

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
  if (!newMode && audio) {
    const now = Date.now()
    if (fallofStart) {
      // check the fallof
      if (now - fallofStart >= fallof) {
        mode = false
        console.log('stoped!')

        if (audio) {
          // TODO: implement volume fallof
          audio.stdin.write('q\n')
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
