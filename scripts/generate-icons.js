/**
 * PWA 아이콘 생성 스크립트
 *
 * 사용법:
 * 1. sharp 설치: npm install sharp --save-dev
 * 2. 실행: node scripts/generate-icons.js
 *
 * SVG에서 다양한 크기의 PNG 아이콘을 생성합니다.
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const SOURCE_SVG = path.join(__dirname, "../public/icons/icon.svg");
const OUTPUT_DIR = path.join(__dirname, "../public/icons");

async function generateIcons() {
  console.log("Generating PWA icons...");

  // SVG 파일 확인
  if (!fs.existsSync(SOURCE_SVG)) {
    console.error("Source SVG not found:", SOURCE_SVG);
    process.exit(1);
  }

  // 출력 디렉토리 확인
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 각 크기별 아이콘 생성
  for (const size of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}.png`);

    try {
      await sharp(SOURCE_SVG)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`Created: icon-${size}.png`);
    } catch (error) {
      console.error(`Failed to create icon-${size}.png:`, error.message);
    }
  }

  // Apple Touch Icon (180x180)
  try {
    await sharp(SOURCE_SVG)
      .resize(180, 180)
      .png()
      .toFile(path.join(OUTPUT_DIR, "apple-touch-icon.png"));
    console.log("Created: apple-touch-icon.png");
  } catch (error) {
    console.error("Failed to create apple-touch-icon.png:", error.message);
  }

  // Favicon (32x32)
  try {
    await sharp(SOURCE_SVG)
      .resize(32, 32)
      .png()
      .toFile(path.join(__dirname, "../public/favicon.png"));
    console.log("Created: favicon.png");
  } catch (error) {
    console.error("Failed to create favicon.png:", error.message);
  }

  console.log("\nIcon generation complete!");
  console.log("Make sure to also create shortcut icons if needed.");
}

generateIcons().catch(console.error);
