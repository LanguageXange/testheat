const puppeteer = require("puppeteer");
const fs = require("fs");
const schedule = require("node-schedule");
const moment = require("moment-timezone");

// const cities = ["台南", "台北", "台中", "高雄", "桃園", "屏東", "花蓮"];

const isMinutes = false; // Change this to false for hours
const NUMBER = 1;

let interval;
if (isMinutes) {
  interval = `*/${NUMBER} * * * *`; // Every X minutes
} else {
  interval = `0 */${NUMBER} * * *`; // Every X hours (at the beginning of the hour)
}

const CITY_NAME = "台南";
const FILE_NAME = "heat_index_min.csv";
const URL = "https://hiosha.osha.gov.tw/content/info/heat1.aspx";

async function getHeatIndex(city) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    await page.goto(URL);
    await page.evaluate((city) => {
      const input = document.getElementById("ContentPlaceHolder1_txtAddress");
      input.value = city;
    }, city);
    const submitButton = await page.$('input[value="查詢"]');
    await submitButton.click();

    // Wait for 2 seconds before we get the heat index value
    const waitTime = 2000;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    await page.waitForSelector("#value_area");
    const heatIndexText = await page.evaluate(() => {
      const valueArea = document.getElementById("value_area");
      return valueArea.textContent.trim();
    });
    const taipeiTime = moment().tz("Asia/Taipei").format("YYYY-MM-DD HH:mm:ss");
    const csvData = `${taipeiTime},${city},${heatIndexText}\n`;

    fs.appendFileSync(FILE_NAME, csvData, (err) => {
      if (err) throw err;
      console.log("Heat Index saved to CSV:", FILE_NAME);
    });
  } catch (error) {
    console.error("Error scraping website:", error);
  } finally {
    await browser.close();
  }
}

getHeatIndex(CITY_NAME); // Run scraping initially

// Schedule scraping
schedule.scheduleJob(interval, () => getHeatIndex(CITY_NAME));
