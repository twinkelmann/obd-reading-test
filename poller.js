/**
 *
 * @param {typeof import('obd-parser')} OBD
 * @param {{[x:string]: import('obd-parser').PIDS.PID}} pids
 * @param {{[x:string]: (value: number) => number}} modifiers
 * @param {number} pollerInterval
 * @param {number} computeInterval
 * @param {number} deltaInterval
 * @param {(values: {[x:string]: number}) => void} compute
 */
function start(
  OBD,
  pids,
  modifiers,
  pollerInterval,
  computeInterval,
  deltaInterval,
  compute
) {
  const currentValues = {}
  const deltas = {}

  const pollers = {}

  // build all the pollers
  for (const pid in pids) {
    const poller = new OBD.ECUPoller({
      pid: pids[pid],
      interval: pollerInterval,
    })

    // extract the potential modifier for this pid
    const modifier = modifiers[pid]
    /**
     * @type number[]
     */
    const history = []

    poller.on('data', output => {
      /**
       * @type number
       */
      const raw = output.value || 0
      const value = modifier ? modifier(raw) : raw

      // store value
      currentValues[pid] = value
      history.push(value)

      const numValues = history.length

      // no delta when we don't have enough values
      if (numValues < deltaInterval) {
        deltas[pid] = 0
        return
      }

      // if there are too many values, remove them
      // TODO: only clear array from time to time ? and use length - deltaInterval to find the pervious value to use
      if (numValues > deltaInterval) {
        history.splice(0, numValues - deltaInterval)
      }

      // store delta
      deltas[pid] = value - history[0]
    })

    poller.startPolling()

    pollers[pid] = poller
  }

  setInterval(() => {
    compute(currentValues)
  }, computeInterval)

  return pollers
}

/**
 *
 * @param {{[x: string]: import('obd-parser').ECUPoller}} pollers
 */
function stop(pollers) {
  for (const poller in pollers) {
    pollers[poller].stopPolling()
  }
}

module.exports = {
  start,
  stop,
}
