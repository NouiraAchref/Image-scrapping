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
  return await page.evaluate(() => {
    // Get all image elements
    try {
      if (
        document.querySelectorAll(".breadcrumb.hidden-sm-down>ol>li>a>span")[2]
          .textContent === "Capteurs"
      ) {
        // Return their src attributes
        return Array.from(document.querySelectorAll(".col-md-6 img")).map(
          (img) => img.src
        );
      } else {
        return [];
      }
    } catch (error) {
      console.log(error);
      return [];
    }
  });
}

// Function to save images to disk
async function saveImage(imageUrl, imagesDir) {
  const fileName = path.basename(imageUrl);
  const filePath = path.resolve(imagesDir, fileName);

  try {
    // const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    // await fs.mkdir(path.dirname(filePath), { recursive: true });
    // await fs.writeFile(filePath, response.data);
    await fs.appendFile("file.txt", imageUrl + "\n");
  } catch (error) {
    console.error(`Error saving image ${imageUrl}:`, error);
  }
}

// Main function
async function main() {
  const sitemapUrl = "https://www.alliantech.com/1_fr_0_sitemap.xml"; // Replace with your sitemap URL
  const imagesDir = path.resolve(__dirname, "images");

  const urls = await getSitemapUrls(sitemapUrl);
  if (urls.length === 0) return;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    for (const [index, url] of urls.entries()) {
      const imageUrls = await extractImagesFromPage(page, url);
      console.log(`Processing ${index + 1} of ${urls.length}`);

      // Use Promise.all to handle parallel saving of images
      await Promise.all(
        imageUrls.map((imageUrl) => saveImage(imageUrl, imagesDir))
      );
    }
  } catch (error) {
    console.error("Error during processing:", error);
  } finally {
    await page.close();
    await browser.close();
  }
}

// Run the main function
main().catch(console.error);
