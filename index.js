const puppeteer = require("puppeteer");
const axios = require("axios");
const xml2js = require("xml2js");
const fs = require("fs").promises;
const path = require("path");

// Function to get URLs from the sitemap
async function getSitemapUrls(sitemapUrl) {
  try {
    const { data: xml } = await axios.get(sitemapUrl);
    const result = await xml2js.parseStringPromise(xml);
    return result.urlset.url.map((entry) => entry.loc[0]);
  } catch (error) {
    console.error("Error fetching or parsing sitemap:", error);
    return [];
  }
}

// Function to extract images from a single page
async function extractImagesFromPage(page, url) {
  // Navigate to the page
  await page.goto(url, { waitUntil: "networkidle2" });

  // Extract image URLs using page.evaluate
  const imageUrls = await page.evaluate(() => {
    // Get all image elements
    try {
      if (
        document.querySelectorAll(".breadcrumb.hidden-sm-down>ol>li>a>span")[2]
          .textContent === "Capteurs"
      ) {
        const images = Array.from(document.querySelectorAll(".col-md-6 img"));
        // Return their src attributes
        return images.map((img) => img.src);
      } else {
        return [];
      }
    } catch (error) {
      console.log(error);
      return [];
    }
  });
  return imageUrls;
}

// Function to save images to disk
async function saveImage(imageUrl, browser) {
  const page = await browser.newPage();
  const response = await page.goto(imageUrl);
  const buffer = await response.buffer();
  const fileName = path.basename(imageUrl);
  const filePath = path.resolve(__dirname, "images", fileName);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  await page.close();
}

// Main function
async function main() {
  const sitemapUrl = "https://www.alliantech.com/1_fr_0_sitemap.xml"; // Replace with your sitemap URL

  const urls = await getSitemapUrls(sitemapUrl);
  if (urls.length === 0) return;

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    let l = 0;

    for (const url of urls) {
      const imageUrls = await extractImagesFromPage(page, url);
      await Promise.all(
        imageUrls.map((imageUrl) => saveImage(imageUrl, browser))
      );
      l += 1;
      console.log(l, " of ", urls.length);
    }
  } catch (error) {
    console.error("Error during processing:", error);
  } finally {
    await browser.close();
  }
}

// Run the main function
main().catch(console.error);
