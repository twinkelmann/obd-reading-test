const OBD = require('obd-parser')
const poller = require('./poller')
const { EventEmitter } = require('events')

const getConnector = require('../obd-parser-serial-connection')

const connectorFn = getConnector({
  serialPath: '/dev/ttyUSB0',

  serialOpts: {
    baudRate: 38400,
  },
})

/**
 * Functions to apply to polled values to pre-adjust them
 */
const modifiers = {
  /**
   * Adjust the throttle value. Usually between 14 to a 78 in the Lexus IS 200
   * @param {number} value
   */
  throttle(value) {
    const offset = Math.max(value - 14, 0)
    return offset === 0 ? 0 : offset / (78 - 14)
  },
  /**
   * Make the RPM into a percentage
   * @param {number} value
   */
  rpm(value) {
    return value === 0 ? 0 : value / 6500
  },
}

/**
 * How often to poll values from the ECU
 */

const pollerInterval = 100
/**
 * How often to compute the logic based on the current values
 */
const computeInterval = 150
/**
 * How many readouts to skip before calculating the delta
 * Will afect the responsivness of the computation
 */
const deltaInterval = 3
/**
 * How much time before the values are reset to avoid being stuck if no new values come in
 */
const timeout = 3 * pollerInterval

const reporter = new EventEmitter()

/**
 * The compute function taking the current values and deltas as parameter
 * @param {{[x: string]: number}} values
 * @param {{[x: string]: number}} deltas
 */
function compute(values, deltas) {
  // instant calculations
  const speed = values['speed']
  const rpm = values['rpm']
  const throttle = values['throttle']

  const instant =
    throttle >= 0.95 ||
    (throttle >= 0.7 && rpm >= 0.61) /* 4000 RPM */ ||
    rpm >= 0.8 /* 5200 RPM */ ||
    speed >= 130

  // relative calculations
  const speedDelta = deltas['speed']
  const rpmDelta = deltas['rpm']
  const throttleDelta = deltas['throttle']

  const relative = throttleDelta >= 0.3 || rpmDelta >= 0.3 /* 2000 RPM */

  // no-go
  const noGo = speed < 5

  // TODO: remove log

  console.clear()
  console.log(new Date().toLocaleTimeString())
  console.log(
    'current',
    JSON.stringify(values, null, 2),
    'delta',
    JSON.stringify(deltas, null, 2)
  )

  reporter.emit('update', (instant || relative) && !noGo)
}

OBD.init(connectorFn).then(
  () => {
    /**
     * The values to poll
     */
    const pollers = {
      rpm: new OBD.PIDS.Rpm(),
      speed: new OBD.PIDS.VehicleSpeed(),
      throttle: new OBD.PIDS.ThrottlePosition(),
    }

    poller.start(
      OBD,
      pollers,
      modifiers,
      pollerInterval,
      computeInterval,
      deltaInterval,
      timeout,
      compute
    )
  },
  error => console.error('Could not initialize OBD connection:', error)
)

module.exports = reporter
