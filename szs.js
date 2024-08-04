const puppeteer = require('puppeteer');
const axios = require('axios');
const xml2js = require('xml2js');
const fs = require('fs').promises;
const path = require('path');

// Function to get URLs from the sitemap
async function getSitemapUrls(sitemapUrl) {
  try {
    const { data: xml } = await axios.get(sitemapUrl);
    const result = await xml2js.parseStringPromise(xml);
    return result.urlset.url.map(entry => entry.loc[0]);
  } catch (error) {
    console.error('Error fetching or parsing sitemap:', error);
    return [];
  }
}

// Function to extract images from a single page
async function extractImagesFromPage(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2' });

  const imageUrls = [];
  page.on('response', async (response) => {
    if (response.request().resourceType() === 'image') {
      const responseUrl = response.url();
      imageUrls.push(responseUrl);
    }
  });

  await page.waitForTimeout(5000); // Wait for images to load
  return imageUrls;
}

// Function to save images to disk
async function saveImage(imageUrl, browser) {
  const page = await browser.newPage();
  const response = await page.goto(imageUrl);
  const buffer = await response.buffer();
  const fileName = path.basename(imageUrl);
  const filePath = path.resolve(__dirname, 'images', fileName);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  await page.close();
}

// Main function
async function main() {
  const sitemapUrl = 'https://www.alliantech.com/1_fr_0_sitemap.xml'; // Replace with your sitemap URL

  const urls = await getSitemapUrls(sitemapUrl);
  if (urls.length === 0) return;

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const url of urls) {
      const imageUrls = await extractImagesFromPage(page, url);
      await Promise.all(imageUrls.map(imageUrl => saveImage(imageUrl, browser)));
      console.log(`Images from ${url} saved.`);
    }
  } catch (error) {
    console.error('Error during processing:', error);
  } finally {
    await browser.close();
  }
}

// Run the main function
main().catch(console.error);