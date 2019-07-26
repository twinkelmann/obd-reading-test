const OBD = require('obd-parser')
const poller = require('./poller')
const { EventEmitter } = require('events')

const getConnector = require('obd-parser-serial-connection')

// TODO: auto-reopen connection when it closes
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

  // relative calculations
  const speedDelta = deltas['speed']
  const rpmDelta = deltas['rpm']
  const throttleDelta = deltas['throttle']

  // TODO: move rules to external file ?

  /**
   * List of all positive rules
   * If any of the following is true, the result is true
   * Unless a negative rule is true (see below)
   */
  const positiveRules = [
    /* crazy rules */
    throttle >= 0.97, // going full throttle
    rpm >= 0.82, // more than 5300 RPM
    speed >= 130, // You're breaking the law !
    /* speedDelta <= -30, // TODO: #RageYourDream */

    /* crusing rules */
    throttle >= 0.15 && rpm >= 0.6 && speed >= 60, // more than 4000 RPM from 60kmh with the foot down somewhat
    throttle >= 0.25 && rpm >= 0.55 && speed >= 60, // more than 3500 RPM from 60kmh with the foot quite far down
    throttle >= 0.1 && rpm >= 0.55 && speed >= 80, // more than 3500 RPM from 80kmh with the foot not so much down
    throttle >= 0.08 && rpm >= 0.6 && speed >= 80, // more than 4000 RPM from 80kmh with the foot even less down
    rpm >= 0.65 && speed >= 100, // more than 4200 RPM from 100kmh without the foot down

    /* acceleration rules */
    throttleDelta >= 0.4, // suddenly hard on the throttle
    rpmDelta >= 0.3, // suddenly more than 2000 extra RPM
    speedDelta >= 15, // suddenly 15kmh faster

    /* deceleration rules */
    speedDelta <= -20, // suddenly 20kmh slower (very hard braking)
    speedDelta <= -10 && speed >= 70, // suddenly 10kmh slower at high speed
  ]

  /**
   * List of all negative rules
   * If any of the following is true, the result is false
   */
  const negativeRules = [
    speed < 5, // going very slow
  ]

  // if the positive are NOT all FALSE
  // and the negatives are all NOT TRUE
  const result =
    !positiveRules.every(rule => !rule) && negativeRules.every(rule => !rule)

  // TODO: remove log
  // console.clear()
  console.log(new Date().toLocaleTimeString())
  console.log(
    'current',
    JSON.stringify(values, null, 2),
    'delta',
    JSON.stringify(deltas, null, 2)
  )
  console.log('result:', result)

  reporter.emit('update', result)
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
    console.log('ready')
  },
  error => console.error('Could not initialize OBD connection:', error)
)

module.exports = reporter
