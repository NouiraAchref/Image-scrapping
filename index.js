import axios from "axios";
import puppeteer from "puppeteer";
import xml2js from "xml2js";
import fs from "fs/promises";
import path from "path";
import { removeBackground } from "@imgly/background-removal-node";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NAVIGATION_TIMEOUT = 60000; // Set navigation timeout to 60 seconds
const RETRY_LIMIT = 3; // Set retry limit for page navigation

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
  await fs.writeFile(
    path.join(savePath, `${imageName}.png`),
    base64Data,
    "base64"
  );
}

// Function to wait and extract canvas elements
async function extractCanvasElements(page, retryLimit = RETRY_LIMIT) {
  let retryCount = 0;
  while (retryCount < retryLimit) {
    try {
      await page.waitForSelector("#output canvas", { timeout: 5000 });
      const canvasData = await page.$$eval("#output canvas", (canvases) =>
        canvases.map((canvas) => canvas.toDataURL())
      );
      return canvasData;
    } catch (error) {
      console.error("Error extracting canvas elements, retrying...", error);
      retryCount++;
      await new Promise((resolve) => setTimeout(resolve, 2000));
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
      timeout: 0,
    });

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
      "file:///C:/Users/Internet/Desktop/Projects/Image-scrapping/index.html",
      `${index}-${fileName.substring(0, fileName.lastIndexOf("."))}`
    );
  } catch (error) {
    console.error(`Error processing image ${mainImageUrl}:`, error.message);
  }
}

async function writeJsonToFile(
  filePath,
  id,
  name,
  modal,
  datasheet,
  userManual,
  link
) {
  try {
    // Use path.parse to get the filename without extension
    const fileNameWithoutExt = path.parse(id).name;

    const newJsonData = {
      id: fileNameWithoutExt, // Use the name without extension
      name: name,
      model: modal,
      datasheet: datasheet,
      userManual: userManual,
      link: link,
    };

    // Check if the file already exists
    let fileContent = [];

    try {
      // If file exists, read the existing content
      const existingContent = await fs.readFile(filePath, "utf-8");
      fileContent = JSON.parse(existingContent);
    } catch (err) {
      // If the file doesn't exist, initialize with an empty array
      if (err.code !== "ENOENT") throw err; // Only throw if it's not a 'file not found' error
    }

    // Append new data to the existing content
    fileContent.push(newJsonData);

    // Write the updated content back to the file
    const jsonString = JSON.stringify(fileContent, null, 2);
    await fs.writeFile(filePath, jsonString);

    console.log(`JSON data successfully appended to ${filePath}`);
  } catch (err) {
    console.error(`Error writing JSON to file: ${filePath}`, err);
    throw err;
  }
}

// Function to extract images and metadata from a page with retry logic
async function extractImagesFromPage(page, url, retryLimit = RETRY_LIMIT) {
  let retryCount = 0;
  while (retryCount < retryLimit) {
    try {
      await page.goto(url, {
        waitUntil: "networkidle2",
        timeout: NAVIGATION_TIMEOUT,
      });

      const { images, productTitle, productModal, datasheet, userManual } =
        await page.evaluate(() => {
          try {
            const breadcrumbText = document.querySelectorAll(
              ".breadcrumb.hidden-sm-down>ol>li>a>span"
            )[2]?.textContent;
            if (breadcrumbText !== "Capteurs") {
              return {
                images: [],
                productTitle: null,
                productModal: null,
                datasheet: null,
                userManual: null,
              };
            }

            const productTitle =
              document.querySelector(".col-md-6 .h1.product-h1")?.textContent ||
              null;
            const productModal =
              document.querySelector(".col-md-6 .product-h2")?.textContent ||
              null;

            const datasheetLink = document.querySelectorAll(
              ".product-info-btn-column a"
            )[0];
            const datasheet = datasheetLink
              ? "https://www.alliantech.com/" +
                datasheetLink.getAttribute("href")
              : "";

            const userManualLink = document.querySelectorAll(
              ".product-info-btn-column a"
            )[1];
            const userManual = userManualLink
              ? "https://www.alliantech.com/" +
                userManualLink.getAttribute("href")
              : "";

            const images = Array.from(
              document.querySelectorAll(".col-md-6 .thumb-container img")
            ).map((img) => img.src);

            return {
              images,
              productTitle,
              productModal,
              datasheet,
              userManual,
            };
          } catch (error) {
            console.error("Error extracting data from page:", error);
            return {
              images: [],
              productTitle: null,
              productModal: null,
              datasheet: null,
              userManual: null,
            };
          }
        });

      if (images.length > 0 && productTitle) {
        const imageId = path.basename(images[0]);
        await writeJsonToFile(
          "productsInfo.txt",
          imageId,
          productTitle,
          productModal,
          datasheet,
          userManual,
          url
        );
      }

      return images;
    } catch (error) {
      console.error(`Error processing page: ${url}, retrying...`, error);
      retryCount++;
      await new Promise((resolve) => setTimeout(resolve, 3000)); // wait before retrying
    }
  }

  throw new Error(
    `Failed to process page after ${RETRY_LIMIT} retries: ${url}`
  );
}

// Main function to process the sitemap and images
async function main() {
  const sitemapUrl = "https://www.alliantech.com/1_fr_0_sitemap.xml";
  const imagesDir = path.resolve(__dirname, "images");

  await fs.mkdir(imagesDir, { recursive: true });

  const urls = await getSitemapUrls(sitemapUrl);
  if (urls.length === 0) return;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    for (const [index, url] of urls.entries()) {
      console.log(`Processing ${index + 1} of ${urls.length}`);
      const imageUrls = await extractImagesFromPage(page, url);

      await Promise.all(
        imageUrls.map((imageUrl, imgIndex) =>
          saveImage(imageUrl, imagesDir, imgIndex)
        )
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
