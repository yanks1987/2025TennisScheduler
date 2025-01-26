const nodemailer = require('nodemailer');
const axios = require('axios');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const WEATHER_API_URL = 'http://api.weatherapi.com/v1/forecast.json';

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function checkRainInTimeRange(hourlyData, startHour, endHour) {
  const relevantHours = hourlyData.filter(hour => {
    const hourTime = new Date(hour.time).getHours();
    return hourTime >= startHour && hourTime <= endHour;
  });
  return !relevantHours.some(hour => hour.chance_of_rain > 30);
}

async function checkWeather() {
  try {
    const response = await axios.get(WEATHER_API_URL, {
      params: {
        key: WEATHER_API_KEY,
        q: 'London', // Change to your location
        days: 7,
        hour: 24
      },
    });

    const forecast = response.data.forecast.forecastday;
    const dryDays = forecast.filter(day => {
      const date = new Date(day.date);
      const isWeekendDay = isWeekend(date);
      
      if (isWeekendDay) {
        return checkRainInTimeRange(day.hour, 8, 10);
      } else {
        return checkRainInTimeRange(day.hour, 16, 18);
      }
    });

    const formattedDryDays = dryDays.map(day => {
      const date = new Date(day.date);
      const isWeekendDay = isWeekend(date);
      return {
        date: date.toLocaleDateString(),
        timeRange: isWeekendDay ? '8-10 AM' : '4-6 PM'
      };
    });

    const emailText = formattedDryDays.length > 0
      ? `Dry weather forecast:\n\n${formattedDryDays.map(day => 
          `${day.date}: No rain expected during ${day.timeRange}`
        ).join('\n')}`
      : 'No dry periods found in the forecast for the specified time ranges.';

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: 'Weekly Weather Forecast - Dry Periods',
      text: emailText
    });

    console.log('Weather check completed and email sent successfully');
  } catch (error) {
    console.error('Weather check failed:', error);
    throw error;
  }
}

// Execute the check
checkWeather();