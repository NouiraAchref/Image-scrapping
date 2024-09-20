import axios from "axios";
import puppeteer from "puppeteer";
import xml2js from "xml2js";
import fs from "fs/promises";
import path from "path";
import { removeBackground } from "@imgly/background-removal-node";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url); // Get the resolved path to the file
const __dirname = path.dirname(__filename); // Get the name of the directory

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

// Function to save canvas image to a file
async function saveCanvasToFile(page, selector, imageName, savePath) {
  const dataUrl = await page.$eval(selector, (canvas) => canvas.toDataURL());
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");

  // Ensure to await the write operation
  await fs.writeFile(
    path.join(savePath, `${imageName}.png`),
    base64Data,
    "base64"
  );
}

async function imagesIcrease(imageName, pageUrl) {
  // Launch browser
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Navigate to your page
  await page.goto(pageUrl, {
    waitUntil: "load",
  });

  // Simulate image upload
  const inputUploadHandle = await page.$("#uploadImage");
  const imagePath = path.resolve(__dirname, imageName);
  await inputUploadHandle.uploadFile(imagePath);
  const saveDirectory = path.join(__dirname, "augmented_images");
  // Define the directory to save images
  try {
    // Check if the directory exists
    await fs.access(saveDirectory);
  } catch (error) {
    // Directory doesn't exist, so create it
    await fs.mkdir(saveDirectory, { recursive: true });
  }

  // Get all canvas elements (augmented images)
  const canvasElements = await page.$$("#output canvas");

  for (let i = 0; i < canvasElements.length; i++) {
    await saveCanvasToFile(
      page,
      `#output canvas:nth-of-type(${i + 1})`,
      i,
      saveDirectory
    );
  }

  console.log("Images saved to:", saveDirectory);

  await browser.close();
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
    // Step 1: Remove background
    const resultDataURL = await removeImageBackground(mainImageUrl);
    const base64Image = resultDataURL.split(";base64,").pop();

    // Step 2: Save the base image with background removed
    await fs.writeFile(filePath, base64Image, { encoding: "base64" });
    console.log(`Image saved after background removal: ${filePath}`);

    // image augmentations
    await imagesIcrease(
      filePath,
      "file:///C:/Users/ASUS/Desktop/Image-scrapping/index.html"
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

  // Ensure the output directory exists
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
    // Save and augment images
    await Promise.all(
      imageUrls.map((imageUrl, imgIndex) =>
        saveImage(imageUrl, imagesDir, imgIndex)
      )
    );
    // for (const [index, url] of urls.entries()) {
    //   const imageUrls = await extractImagesFromPage(page, url);
    //   console.log(`Processing ${index + 1} of ${urls.length}`);

    //   // Save and augment images
    //   await Promise.all(
    //     imageUrls.map((imageUrl, imgIndex) =>
    //       saveImage(imageUrl, imagesDir, imgIndex)
    //     )
    //   );
    // }
  } catch (error) {
    console.error("Error during processing:", error);
  } finally {
    await page.close();
    await browser.close();
  }
}

// Run the main function
main().catch(console.error);
