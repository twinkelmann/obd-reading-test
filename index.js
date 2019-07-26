const trigger = require('./trigger')
const { exec } = require('child_process')
const glob = require('fast-glob')

const externalStorage = '/mnt/storage'
const musicFormats = ['wav', 'mp3', 'flac', 'ogg']

// TODO: list songs with a drop timestamp (from a JSON file)
// and start a random song at the timestamp with mplayer.
// if song reaches the end, play another random one from the beginning
console.log(`Looking for files on ${externalStorage}`)
let eurobeat = glob.sync(
  musicFormats.map(format => `${externalStorage}/*.${format}`)
)[0]

if (eurobeat === undefined) {
  console.warn(
    `No ${musicFormats
      .join(', ')
      .toUpperCase()} music found on ${externalStorage}. Using default`
  )
  eurobeat = __dirname + '/music/deja_vu.mp3'
}

const command = `mplayer -loop 0 -msglevel all=-1 ${eurobeat}`

/**
 * How much time after an "off" signal is given should the mode stop
 */
const fallof = 10 * 1000

let mode = false
let fallofStart = null
let audio = null

trigger.on('update', newMode => {
  // mode should be on and isn't already
  if (newMode && !mode) {
    fallofStart = null
    mode = true
    console.log('activated!')

    if (!audio) {
      audio = exec(command)
    }
  }

  // mode should be off while audio is playing
  if (!newMode && audio) {
    const now = Date.now()
    if (fallofStart) {
      // check the fallof
      if (now - fallofStart >= fallof) {
        mode = false
        console.log('stopped!')

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
