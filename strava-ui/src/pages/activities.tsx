import React from "react"
import { useEffect, useRef } from "react"
// next
import { useRouter } from "next/router"
// mapbox
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"
// components
import Activity from "../components/activity"
import Calendar from "../components/calendar"
// redis
import cache from "src/cache"


export const getServerSideProps = async ({ query }) => {
  const token = query.clientAccessToken || ""

  const fetcher = async () => {
    const duration = 7
    try {
      const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=${duration}`, {
        headers: {
          Authorization: "Bearer " + token
        }
      })
      const data = await res.json()
      return data
    } catch (err) {
      console.log(err)
      return []
    }
  }

  const activityDetailsFetcher = async (id: number) => {
    try {
      const res = await fetch(`https://www.strava.com/api/v3/activities/${id}`, {
        headers: {
          Authorization: "Bearer " + token
        }
      })
      const data = await res.json()
      return data
    } catch (error) {
      console.error(error)
      return {}
    }
  }

  // get all activities from redis if exists
  const key = `allActivities-${new Date().getMonth().toString()}-${new Date().getDate().toString()}`
  let cachedActivities = await cache.fetch(key, fetcher, 60 * 60, false)

  // if all activities is not a list, try to overwrite the data
  if (!Array.isArray(cachedActivities)) {
    cachedActivities = await cache.fetch(key, fetcher, 60 * 60, true)
  }

  // get each activity details from redis if exists
  let activityDetails = {}
  for (let i = 0; i < cachedActivities.length; i++) {
    const activityDetailsKey = `activity-${cachedActivities[i].id}-details-${new Date().getMonth().toString()}-${new Date().getDate().toString()}`
    const cachedActivityDetails = await cache.fetch(activityDetailsKey, () => activityDetailsFetcher(cachedActivities[i].id), 60 * 60, false)
    activityDetails[cachedActivityDetails.id] = cachedActivityDetails
  }

  return { props: { activitiesProp: cachedActivities, activityDetailsProp: activityDetails } }
}

export default function Activities({ activitiesProp, activityDetailsProp }) {
  const router = useRouter()
  const data = router.query

  const [activities, setActivities] = React.useState<any[]>([])
  const [calendarData, setCalendarData] = React.useState<any[]>([])
  const [duration, setDuration] = React.useState(7)
  const [selectedActivity, setSelectedActivity] = React.useState(-1)

  mapboxgl.accessToken = process.env.ACCESS_TOKEN || ""

  useEffect(() => {
    async function fillActivityCalendar() {
      const activities = activitiesProp
      setActivities(activities)

      const allActivities = []
      for (let i = 0; i < (activities || []).length; i++) {
        const startDate = activities[i].start_date.substring(0, 10)
        const data = {
          day: startDate,
          activity: activities[i].distance / 10000
        }
        allActivities.push(data)
      }
      setCalendarData(allActivities)
    }

    fillActivityCalendar()

  }, [duration])

  function updateDuration(dur: number) {
    setDuration(dur)
  }

  return (
    <div>
      <div className="h-screen">
        <div className="m-auto">
          <div>
            <div>
              <div className="mx-6 my-6">
                <div className="">
                  <h1 className="text-3xl font-bold mb-6">
                    Activities
                  </h1>
                </div>
                <div className="">
                  <button className="btn bg-gray-300 text-sm rounded-full p-2 font-bold mb-6 mr-2" onClick={() => updateDuration(7)}>
                    7 days
                  </button>
                  <button className="btn bg-gray-300 text-sm rounded-full p-2 font-bold mb-6 mr-2 ml-2" onClick={() => updateDuration(14)}>
                    14 days
                  </button>
                  <button className="btn bg-gray-300 text-sm rounded-full p-2 font-bold mb-6 mr-2 ml-2" onClick={() => updateDuration(21)}>
                    21 days
                  </button>
                  <button className="btn bg-gray-300 text-sm rounded-full p-2 font-bold mb-6 mr-2 ml-2" onClick={() => updateDuration(31)}>
                    month
                  </button>
                  <button className="btn bg-gray-300 text-sm rounded-full p-2 font-bold mb-6 mr-2 ml-2" onClick={() => updateDuration(90)}>
                    3 month
                  </button>
                  <button className="btn bg-gray-300 text-sm rounded-full p-2 font-bold mb-6 mr-2 ml-2" onClick={() => updateDuration(180)}>
                    1/2 year
                  </button>
                </div>
                {
                  calendarData.length !== 0 ?
                    <Calendar data={calendarData} />
                    :
                    <></>
                }
              </div>
              {
                Array.isArray(activities) ?
                  activities.map(activity => (
                    <Activity key={activity.id} activity={activity} activityDetails={activityDetailsProp[activity.id]} />
                  ))
                  :
                  <>
                    <div className="mx-6 my-6">
                      <h1>No activities found...</h1>
                    </div>
                  </>
              }
            </div>
          </div>
        </div >
      </div >
    </div>
  )
}