const axios = require("axios");

async function getFlightWeather(lat, lng) {
  try {
    // Отримуємо поточну погоду ТА погодинний прогноз на сьогодні
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,wind_speed_10m&hourly=temperature_2m,precipitation,wind_speed_10m&wind_speed_unit=ms&timezone=auto`;
    const response = await axios.get(url);
    const { current, hourly } = response.data;

    // Шукаємо погіршення погодних умов у найближчі 12 годин
    let forecastWarning = null;
    const currentHourIndex = new Date().getHours();

    for (
      let i = currentHourIndex;
      i < currentHourIndex + 12 && i < hourly.time.length;
      i++
    ) {
      if (hourly.wind_speed_10m[i] > 12 || hourly.precipitation[i] > 0) {
        const badTime = new Date(hourly.time[i]);
        const reason =
          hourly.wind_speed_10m[i] > 12 ? "штормові пориви вітру" : "опади";
        forecastWarning = `Увага! З ${badTime.getHours()}:00 очікуються ${reason}. Авіадоставка може бути призупинена.`;
        break;
      }
    }

    return {
      isSafe: current.wind_speed_10m <= 12 && current.precipitation === 0,
      current: {
        temp: current.temperature_2m,
        wind: current.wind_speed_10m,
        rain: current.precipitation,
      },
      forecastWarning,
    };
  } catch (error) {
    console.error("Помилка метео-радару:", error.message);
    return {
      isSafe: true,
      current: { temp: 20, wind: 2, rain: 0 },
      forecastWarning: null,
    };
  }
}

module.exports = { getFlightWeather };
