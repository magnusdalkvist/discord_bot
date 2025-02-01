type EventType = "JOINED_CHANNEL" | "LEFT_CHANNEL" | "PLAYED_SOUND" | "STARTED_STEAMING" | "STOPPED_STREAMING"

interface Event {
  event: EventType
  timestamp: number
  user: {
    id: number
    name: string
    nick: string
    is_on_mobile: false
  }
  channel: {
    id: number
    name: string
  }
  sound?: {
    filename: string
    displayname: string
  }
}

export function processData(data: Event[]) {
  const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp)
  const userPresence: { [key: number]: boolean } = {}
  const hourlyData: { [key: number]: number[] } = {}
  const detailedData: { [key: string]: { userCount: number; hasFutureData: boolean } } = {}

  // Initialize hourlyData and detailedData with zeros
  for (let hour = 0; hour < 24; hour++) {
    hourlyData[hour] = []
    for (let minute = 0; minute < 60; minute += 15) {
      const timeKey = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      detailedData[timeKey] = { userCount: 0, hasFutureData: false }
    }
  }

  let lastTimestamp = 0
  sortedData.forEach((event) => {
    const date = new Date(event.timestamp * 1000)
    const hour = date.getHours()
    const minute = Math.floor(date.getMinutes() / 15) * 15

    if (event.event === "JOINED_CHANNEL") {
      userPresence[event.user.id] = true
    } else if (event.event === "LEFT_CHANNEL") {
      userPresence[event.user.id] = false
    }

    const currentUserCount = Object.values(userPresence).filter(Boolean).length

    hourlyData[hour].push(currentUserCount)

    const timeKey = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
    detailedData[timeKey] = { userCount: currentUserCount, hasFutureData: true }

    lastTimestamp = event.timestamp
  })

  // Mark future data
  Object.keys(detailedData).forEach((timeKey) => {
    const [hour, minute] = timeKey.split(":").map(Number)
    const timestamp = new Date(sortedData[0].timestamp * 1000).setHours(hour, minute, 0, 0) / 1000
    detailedData[timeKey].hasFutureData = timestamp <= lastTimestamp
  })

  const averageHourlyData = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    userCount:
      hourlyData[hour].length > 0
        ? Math.round(hourlyData[hour].reduce((sum, count) => sum + count, 0) / hourlyData[hour].length)
        : 0,
    hasFutureData: hourlyData[hour].length > 0,
  }))

  const detailedDataArray = Object.entries(detailedData).map(([time, data]) => ({
    time,
    userCount: data.userCount,
    hasFutureData: data.hasFutureData,
  }))

  return { averageHourlyData, detailedData: detailedDataArray }
}

