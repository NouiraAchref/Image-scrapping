import axios from "axios";
import puppeteer from "puppeteer";
import xml2js from "xml2js";
import fs from "fs/promises";
import path from "path";
import { removeBackground } from "@imgly/background-removal-node";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Function to save canvas images
async function saveCanvasToFile(page, canvasData, imageName, savePath) {
  const base64Data = canvasData.replace(/^data:image\/png;base64,/, "");

  // Ensure the write operation is awaited
  await fs.writeFile(
    path.join(savePath, `${imageName}.png`),
    base64Data,
    "base64"
  );
}

// Function to wait and extract canvas elements
async function extractCanvasElements(page, retryLimit = 3) {
  let retryCount = 0;
  while (retryCount < retryLimit) {
    try {
      // Wait for the canvas to be present on the page
      await page.waitForSelector("#output canvas", { timeout: 5000 });
      const canvasData = await page.$$eval("#output canvas", (canvases) =>
        canvases.map((canvas) => canvas.toDataURL())
      );
      return canvasData;
    } catch (error) {
      console.error("Error extracting canvas elements, retrying...", error);
      retryCount++;
      await new Promise((resolve) => setTimeout(resolve, 2000)); // wait before retrying
    }
  }
  throw new Error("Failed to extract canvas elements after retries.");
}

async function imagesIcrease(imageName, pageUrl, fileName) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(pageUrl, {
      waitUntil: "networkidle2",
      timeout: 0, // No timeout
    });

    // Simulate image upload
    const inputUploadHandle = await page.$("#uploadImage");
    const imagePath = path.resolve(__dirname, imageName);
    await inputUploadHandle.uploadFile(imagePath);

    const saveDirectory = path.join(
      __dirname,
      `augmented_images/${fileName.slice(fileName.indexOf("-") + 1)}`
    );
    try {
      await fs.access(saveDirectory);
    } catch (error) {
      await fs.mkdir(saveDirectory, { recursive: true });
    }

    // Extract canvas elements with retries
    const canvasElements = await extractCanvasElements(page);

    for (let i = 0; i < canvasElements.length; i++) {
      await saveCanvasToFile(
        page,
        canvasElements[i],
        `${i}${fileName}`,
        saveDirectory
      );
    }
  } catch (error) {
    console.error("Error in imagesIcrease:", error);
  } finally {
    await browser.close();
  }
}

// Function to remove the background from an image
async function removeImageBackground(imgSource) {
  try {
    const blob = await removeBackground(imgSource);
    const buffer = Buffer.from(await blob.arrayBuffer());
    const dataURL = `data:image/png;base64,${buffer.toString("base64")}`;
    return dataURL;
  } catch (error) {
    throw new Error("Error removing background: " + error);
  }
}

// Function to save images to disk and apply augmentation
async function saveImage(imageUrl, imagesDir, index) {
  const mainImageUrl = imageUrl.replace("home", "large");
  const fileName = path.basename(mainImageUrl);
  const filePath = path.resolve(imagesDir, `${index}-${fileName}`);

  try {
    const resultDataURL = await removeImageBackground(mainImageUrl);
    const base64Image = resultDataURL.split(";base64,").pop();

    await fs.writeFile(filePath, base64Image, { encoding: "base64" });

    await imagesIcrease(
      filePath,
      "file:///C:/Users/THANOS/Desktop/master/Image-scrapping/index.html",
      `${index}-${fileName.substring(0, fileName.lastIndexOf("."))}`
    );
  } catch (error) {
    console.error(`Error processing image ${mainImageUrl}:`, error.message);
  }
}

// Function to extract images from a single page
async function extractImagesFromPage(page, url) {
  await page.goto(url, { waitUntil: "networkidle2" });

  return await page.evaluate(() => {
    try {
      if (
        document.querySelectorAll(".breadcrumb.hidden-sm-down>ol>li>a>span")[2]
          .textContent === "Capteurs"
      ) {
        return Array.from(
          document.querySelectorAll(".col-md-6 .thumb-container img")
        ).map((img) => img.src);
      } else {
        return [];
      }
    } catch (error) {
      console.log(error);
      return [];
    }
  });
}

// Main function
async function main() {
  const sitemapUrl = "https://www.alliantech.com/1_fr_0_sitemap.xml"; // Replace with your sitemap URL
  const imagesDir = path.resolve(__dirname, "images");

  await fs.mkdir(imagesDir, { recursive: true });

  const urls = await getSitemapUrls(sitemapUrl);
  if (urls.length === 0) return;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const imageUrls = await extractImagesFromPage(
      page,
      "https://www.alliantech.com/deplacements/16766-capteur-distance-haute-precision-as2100.html"
    );

    await Promise.all(
      imageUrls.map((imageUrl, imgIndex) =>
        saveImage(imageUrl, imagesDir, imgIndex)
      )
    );
  } catch (error) {
    console.error("Error during processing:", error);
  } finally {
    await page.close();
    await browser.close();
  }
}

// Run the main function
main().catch(console.error);
