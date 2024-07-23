const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  page.on("response", async (response) => {
    const url = response.url();

    if (response.request().resourceType() === "image") {
      response.buffer().then((file) => {
        const fileName = url.split("/").pop();
        const filePath = path.resolve(__dirname+"/images", fileName);
        const writeStream = fs.createWriteStream(filePath);
        writeStream.write(file);
      });
    } else {
      console.log("ddd");
    }
  });
  await page.goto("https://www.wikipedia.org/");
  await browser.close();
})();
