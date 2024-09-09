import axios from "axios";
import puppeteer from "puppeteer";
import xml2js from "xml2js";
import fs from "fs/promises";
import path from "path";
import { removeBackground } from "@imgly/background-removal-node";
import { fileURLToPath } from "url";
import { Jimp } from "jimp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function removeImageBackground(imgSource) {
  try {
    const blob = await removeBackground(imgSource);
    const buffer = Buffer.from(await blob.arrayBuffer());
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch (error) {
    throw new Error("Error removing background: " + error.message);
  }
}

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

async function saveImage(imageUrl, imagesDir) {
  try {
    const fileName = path.basename(imageUrl);
    const filePath = path.resolve(imagesDir, fileName);
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, response.data);
    await fs.appendFile("file.txt", imageUrl + "\n");

    console.log(`Image saved: ${fileName}`);
  } catch (error) {
    console.error(`Error saving image ${imageUrl}:`, error);
  }
}

async function processImage(imageUrl, imagesDir) {
  try {
    const resultDataURL = await removeImageBackground(imageUrl);
    const base64Data = resultDataURL.split(";base64,").pop();
    const buffer = Buffer.from(base64Data, "base64");

    const image = await Jimp.read(buffer);
    image.resize(128, Jimp.AUTO).blur(18);

    const outputPath = path.resolve(imagesDir, "output.png");
    await image.writeAsync(outputPath);

    console.log("Background removed and image processed successfully.");
  } catch (error) {
    console.error("Error removing background:", error.message);
  }
}

async function main() {
  const image1 = await Jimp.read(
    "https://media.geeksforgeeks.org/wp-content/uploads/20190328185307/gfg28.png"
  );
  const image2 = await Jimp.read(
    "https://www.pngitem.com/pimgs/m/689-6892366_transparent-random-guy-png-png-download.png"
  );

  //call to blit function
  image1
    .blit(image2, 20, 40)
    //write image
    .write("blit1.png");
  image2.autocrop().write("blit2.png");
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

      await Promise.all(
        imageUrls.map(async (imageUrl) => {
          await processImage(imageUrl, imagesDir);
          await saveImage(imageUrl, imagesDir);
        })
      );
    }
  } catch (error) {
    console.error("Error during processing:", error);
  } finally {
    await page.close();
    await browser.close();
  }
}

main().catch(console.error);
