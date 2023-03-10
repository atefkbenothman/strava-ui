import Redis from "ioredis"

const redis = new Redis(process.env.REDIS_URL || "")

const fetch = async (key: string, fetcher: any, expires: number, bypass: boolean) => {
  const existing = await get(key)
  if (bypass) {
    console.log("calling strava api")
    return set(key, fetcher, expires)
  }
  if (existing !== null) {
    console.log(`retrieving ${key} data from upstash/redis`)
    return existing
  }
  console.log(`calling strava api. key: <${key}> does not exist.`)
  return set(key, fetcher, expires)
}

const get = async (key: string) => {
  const value = await redis.get(key)
  if (value === null) {
    return null
  }
  return JSON.parse(value)
}

const set = async (key: string, fetcher: any, expires: number) => {
  const value = await fetcher()
  await redis.set(key, JSON.stringify(value), "EX", expires)
  return value
}

export default { fetch, set }
