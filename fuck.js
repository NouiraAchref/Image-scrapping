import axios from "axios";
import puppeteer from "puppeteer";
import xml2js from "xml2js";
import fs from "fs/promises";
import path from "path";
import { removeBackground } from "@imgly/background-removal-node";
import {Jimp} from "jimp";
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
async function saveImage2(imageUrl, imagesDir) {
  const fileName = path.basename(imageUrl);
  const filePath = path.resolve(imagesDir, fileName);
  try {
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, response.data);
  } catch (error) {
    console.error(`Error saving image ${imageUrl}:`, error);
  }
}
// Function to apply augmentations using Jimp
const applyAugmentations = async (image, outputDir, baseName) => {
  const augmentations = [
    {
      name: "Original",
      flip: false,
      rotate: 0,
      brightness: 0,
      contrast: 0,
      blur: 0,
      noise: false,
    },
    {
      name: "Horizontal Flip",
      flip: "horizontal",
      rotate: 0,
      brightness: 0,
      contrast: 0,
      blur: 0,
      noise: false,
    },
    {
      name: "Rotate 15°",
      flip: false,
      rotate: 15,
      brightness: 0,
      contrast: 0,
      blur: 0,
      noise: false,
    },
    {
      name: "Brightness +50%",
      flip: false,
      rotate: 0,
      brightness: 0.5,
      contrast: 0,
      blur: 0,
      noise: false,
    },
    {
      name: "Blur 5px",
      flip: false,
      rotate: 0,
      brightness: 0,
      contrast: 0,
      blur: 5,
      noise: false,
    },
    {
      name: "Random Noise",
      flip: false,
      rotate: 0,
      brightness: 0,
      contrast: 0,
      blur: 0,
      noise: true,
    },
  ];

  for (const aug of augmentations) {
    let augmentedImage = image.clone();

    if (aug.flip === "horizontal") {
      augmentedImage.flip(true, false);
    }
    if (aug.rotate) {
      augmentedImage.rotate(aug.rotate);
    }
    if (aug.brightness !== 0) {
      augmentedImage.brightness(aug.brightness);
    }
    if (aug.blur > 0) {
      augmentedImage.blur(aug.blur);
    }
    if (aug.noise) {
      augmentedImage.noise(50);
    }

    const outputFilePath = path.join(outputDir, `${baseName}-${aug.name}.jpg`);
    await saveImage2(outputDir, `${baseName}-${aug.name}.jpg`);
    console.log(`Saved augmented image: ${outputFilePath}`);
  }
};

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

    // Step 3: Load the saved image into Jimp and apply augmentations
    const image = await Jimp.read(filePath);
    await applyAugmentations(image, imagesDir, `aug-${index}-${fileName}`);
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
    for (const [index, url] of urls.entries()) {
      const imageUrls = await extractImagesFromPage(
        page,
        "https://www.alliantech.com/deplacements/16766-capteur-distance-haute-precision-as2100.html"
      );
      console.log(`Processing ${index + 1} of ${urls.length}`);

      // Save and augment images
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
