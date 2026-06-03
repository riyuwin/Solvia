import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import Swal from "sweetalert2";

function formatToMMDDYYYY(dateValue) {
    if (!dateValue) return "";

    // Firestore Timestamp → JS Date
    const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);

    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();

    return `${month}-${day}-${year}`;
}

/* ================= LOAD IMAGE BY URL ================= */
const loadImageBytes = async (url) => {
    const res = await fetch(url);
    return await res.arrayBuffer();
};

/* ================= DRAW AREA PLACEMENT GRID WITH IMAGES ================= */
const drawAreaPlacementGrid = async ({
    pdfDoc,
    page,
    x,
    y,
    cellSize,
    areaPlacement = [],
    normalImgUrl,
    floodedImgUrl,
}) => {
    const totalCells = 36; // 5x5 grid
    const columns = 6;

    // Load and embed images
    const normalImgBytes = await loadImageBytes(normalImgUrl);
    const floodedImgBytes = await loadImageBytes(floodedImgUrl);

    const normalImage = await pdfDoc.embedPng(normalImgBytes);
    const floodedImage = await pdfDoc.embedPng(floodedImgBytes);

    for (let i = 0; i < totalCells; i++) {
        const col = i % columns;
        const row = Math.floor(i / columns);

        const cellX = x + col * cellSize;
        const cellY = y - row * cellSize;

        const isAffected = areaPlacement.includes(i);

        // Draw image in cell
        page.drawImage(isAffected ? floodedImage : normalImage, {
            x: cellX,
            y: cellY,
            width: cellSize,
            height: cellSize,
        });

        // Optional: border around each cell
        // 40/255 ≈ 0.157, 71/255 ≈ 0.278, 40/255 ≈ 0.157
        page.drawRectangle({
            x: cellX,
            y: cellY,
            width: cellSize,
            height: cellSize,
            borderColor: rgb(0.157, 0.278, 0.157),
            borderWidth: 0.5,
        });

    }
};

/* ================= CENTERED TEXT HELPER (MULTI-LINE) ================= */
const drawCenteredText = ({
    page,
    text,
    y,
    font,
    size,
    pageWidth = page.getSize().width,
    color = rgb(0, 0, 0),
    lineHeight = 14,
    maxWidth = pageWidth - 40,
}) => {
    const words = String(text || "").split(" ");
    let line = "";
    let currentY = y;

    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " ";
        const testWidth = font.widthOfTextAtSize(testLine, size);

        if (testWidth > maxWidth && i > 0) {
            const lineX = (pageWidth - font.widthOfTextAtSize(line, size)) / 2;
            page.drawText(line, { x: lineX, y: currentY, size, font, color });
            line = words[i] + " ";
            currentY -= lineHeight;
        } else {
            line = testLine;
        }
    }

    if (line) {
        const lineX = (pageWidth - font.widthOfTextAtSize(line, size)) / 2;
        page.drawText(line, { x: lineX, y: currentY, size, font, color });
    }

    return currentY;
};

/* ================= WRAPPED TEXT HELPER ================= */
const drawWrappedText = ({
    page,
    text,
    x,
    y,
    maxWidth,
    lineHeight,
    font,
    size,
    color = rgb(0, 0, 0),
}) => {
    const words = String(text || "").split(" ");
    let line = "";
    let currentY = y;

    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " ";
        const testWidth = font.widthOfTextAtSize(testLine, size);

        if (testWidth > maxWidth && i > 0) {
            page.drawText(line, { x, y: currentY, size, font, color });
            line = words[i] + " ";
            currentY -= lineHeight;
        } else {
            line = testLine;
        }
    }

    if (line) {
        page.drawText(line, { x, y: currentY, size, font, color });
    }

    return currentY;
};

/* ================= DEBUG GRID ================= */
const drawDebugGrid = (page, step = 50) => {
    const { width, height } = page.getSize();

    for (let x = 0; x <= width; x += step) {
        page.drawLine({
            start: { x, y: 0 },
            end: { x, y: height },
            thickness: 0.5,
            color: rgb(0.9, 0.9, 0.9),
        });

        page.drawText(`${x}`, {
            x: x + 2,
            y: height - 12,
            size: 8,
            color: rgb(0.5, 0.5, 0.5),
        });
    }

    for (let y = 0; y <= height; y += step) {
        page.drawLine({
            start: { x: 0, y },
            end: { x: width, y },
            thickness: 0.5,
            color: rgb(0.9, 0.9, 0.9),
        });

        page.drawText(`${y}`, {
            x: 2,
            y: y + 2,
            size: 8,
            color: rgb(0.5, 0.5, 0.5),
        });
    }
};

function formatToPeso(value) {
    return `PHP ${Number(value).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

/* ================= MAIN FUNCTION ================= */
export async function downloadPdfReport(report, users, typhoons, generatedBy) {
    try {

        /* MAP TYPHOONID TO NAME */
        const typhoonMap = {};
        typhoons.forEach(t => {
            typhoonMap[t.id] = t.name;
        });
        const typhoonName = typhoonMap[report.TyphoonID] || report.TyphoonID || "";

        /* === LOAD TEMPLATE === */
        const existingPdfBytes = await fetch(
            "/assets/file/farmer_report_template.pdf"
        ).then((res) => res.arrayBuffer());

        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const page = pdfDoc.getPages()[0];
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 9.5;

        const user = users?.[report.UserID] || {};

        /* === ENABLE GRID (COMMENT OUT WHEN DONE) === */
        /* drawDebugGrid(page, 50); */

        drawWrappedText({
            page,
            text: formatToMMDDYYYY(report.AddedAt),
            x: 170,
            y: 813,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${report.FarmerNumber || ""}`,
            x: 510,
            y: 813,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        /* === DRAW CONTENT === */
        drawWrappedText({
            page,
            text: `${user.LastName || ""}`,
            x: 43,
            y: 785,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        /* === DRAW CONTENT === */
        drawWrappedText({
            page,
            text: `${user.LastName || ""}`,
            x: 43,
            y: 785,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${user.FirstName || ""}`,
            x: 175,
            y: 785,
            maxWidth: 300,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${user.MiddleName || ""}`,
            x: 310,
            y: 785,
            maxWidth: 300,
            lineHeight: 14,
            font,
            size: fontSize,
        });


        /* drawWrappedText({
          page,
          text: `${user.ExtName || ""} ${user.ExtName || ""}`,
          x: 310,
          y: 780,
          maxWidth: 300,
          lineHeight: 14,
          font,
          size: fontSize,
        }); */

        drawWrappedText({
            page,
            text: `${user.Gender || ""}`,
            x: 43,
            y: 760,
            maxWidth: 300,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${user.Birthdate || ""}`,
            x: 175,
            y: 760,
            maxWidth: 200,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${user.MobileNumber || ""}`,
            x: 310,
            y: 760,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${user.Email || ""}`,
            x: 445,
            y: 760,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${user.StreetName || ""} ${user.Barangay || ""} ${user.Municipality || ""}, ${user.Province || ""}`,
            x: 43,
            y: 732,
            maxWidth: 540,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${formatToPeso(user.Fertilizer) || ""}`,
            x: 43,
            y: 695,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${formatToPeso(user.Seeds) || ""}`,
            x: 175,
            y: 695,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${formatToPeso(user.Labor) || ""}`,
            x: 310,
            y: 695,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${formatToPeso(user.LandPreparation) || ""}`,
            x: 445,
            y: 695,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${typhoonName || ""}`,
            x: 43,
            y: 658,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${report.CauseOfLosses || ""}`,
            x: 175,
            y: 658,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${report.DateOfLosses || ""}`,
            x: 310,
            y: 658,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${report.DateHarvest || ""}`,
            x: 445,
            y: 658,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${report.StageCultivation || ""}`,
            x: 155,
            y: 643,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${report.IrrigationStatus || ""}`,
            x: 410,
            y: 643,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${formatToPeso(report.BeforeCalamity) || ""}`,
            x: 110,
            y: 618,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${formatToPeso(report.AfterCalamity) || ""}`,
            x: 375,
            y: 618,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });


        drawWrappedText({
            page,
            text: `${report.Quadrant1 || 0}`,
            x: 43,
            y: 582,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${report.Quadrant2 || 0}`,
            x: 175,
            y: 582,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${report.Quadrant3 || 0}`,
            x: 310,
            y: 582,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${report.Quadrant4 || 0}`,
            x: 445,
            y: 582,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${formatToPeso(report.TotalDamageLoss) || ""}`,
            x: 43,
            y: 530,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `Yes`,
            x: 175,
            y: 530,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${report.TotalAreaLoss || "0"}`,
            x: 310,
            y: 530,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `${formatToPeso(report.RehabilitationCost) || ""}`,
            x: 445,
            y: 530,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });


        drawWrappedText({
            page,
            text: `Total Area Loss`,
            x: 370,
            y: 400,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });

        drawWrappedText({
            page,
            text: `= ${report.TotalAreaLoss || "0"}`,
            x: 370,
            y: 380,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });


        drawWrappedText({
            page,
            text: `Damage Visualization`,
            x: 43,
            y: 500,
            maxWidth: 150,
            lineHeight: 14,
            font,
            size: fontSize,
        });


        
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        /* === PREPARED BY SECTION (CENTERED) === */
        drawCenteredText({ page, text: "Prepared by:", y: 110, font, size: fontSize });
        drawCenteredText({ page, text: generatedBy.name, y: 70, font: boldFont, size: fontSize });

        let fullRole = generatedBy.role;
        if (generatedBy.role === "MAO") fullRole = `Municipal Agriculture Office (${generatedBy.currentUserMunicipality})`;
        else if (generatedBy.role === "PAO") fullRole = "Provincial Agriculture Office (PAO)";

        drawCenteredText({ page, text: fullRole, y: 50, font, size: 10 });


        /* await drawAreaPlacementGrid({
            pdfDoc,
            page,
            x: 43,
            y: 430,
            cellSize: 50,
            areaPlacement: report.AreaPlacement || [],
            normalImgUrl: "/assets/img/grass_farmland_1.png",  // green / normal
            floodedImgUrl: "/assets/img/flooded_farmland_1.png", // blue / flooded
        }); */

        await drawAreaPlacementGrid({
            pdfDoc,
            page,
            x: 43,
            y: 430,
            cellSize: 50,
            areaPlacement: report.AreaPlacement || [],
        });

        /* === SAVE === */
        const pdfBytes = await pdfDoc.save();

        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        /* === DEBUG VIEW === */
        window.open(url, "_blank");

        /* === DOWNLOAD === */
        const link = document.createElement("a");
        link.href = url;
        link.download = `Farmer_Report_${report.id}.pdf`;
        link.click();


        async function drawAreaPlacementGrid({
            pdfDoc,
            page,
            x,
            y,
            cellSize,
            areaPlacement = [],
        }) {
            const rightIndexes = [2, 8, 26, 32];
            const leftIndexes = [3, 9, 27, 33];
            const topIndexes = [18, 19, 22, 23];
            const botIndexes = [12, 13, 16, 17];
            const botRightIndex = 14;
            const botLeftIndex = 15;
            const topRightIndex = 20;
            const topLeftIndex = 21;

            for (let idx = 0; idx < 36; idx++) {
                const isAffected = areaPlacement.includes(idx);

                let imgPath = "";

                if (idx === topRightIndex)
                    imgPath = isAffected
                        ? "/assets/img/flood_grass_top_right.png"
                        : "/assets/img/grass_top_right.png";

                else if (idx === topLeftIndex)
                    imgPath = isAffected
                        ? "/assets/img/flood_grass_top_left.png"
                        : "/assets/img/grass_top_left.png";

                else if (idx === botRightIndex)
                    imgPath = isAffected
                        ? "/assets/img/flood_grass_bot_right.png"
                        : "/assets/img/grass_bot_right.png";

                else if (idx === botLeftIndex)
                    imgPath = isAffected
                        ? "/assets/img/flood_grass_bot_left.png"
                        : "/assets/img/grass_bot_left.png";

                else if (topIndexes.includes(idx))
                    imgPath = isAffected
                        ? "/assets/img/flood_grass_top.png"
                        : "/assets/img/grass_top.png";

                else if (botIndexes.includes(idx))
                    imgPath = isAffected
                        ? "/assets/img/flood_grass_bot.png"
                        : "/assets/img/grass_bot.png";

                else if (rightIndexes.includes(idx))
                    imgPath = isAffected
                        ? "/assets/img/flood_grass_right.png"
                        : "/assets/img/grass_right.png";

                else if (leftIndexes.includes(idx))
                    imgPath = isAffected
                        ? "/assets/img/flood_grass_left.png"
                        : "/assets/img/grass_left.png";

                else
                    imgPath = isAffected
                        ? "/assets/img/flood_grass_default.png"
                        : "/assets/img/grass_default.png";

                // Fetch image
                const imgBytes = await fetch(imgPath).then(res => res.arrayBuffer());
                const img = await pdfDoc.embedPng(imgBytes);

                const col = idx % 6;
                const row = Math.floor(idx / 6);

                page.drawImage(img, {
                    x: x + col * cellSize,
                    y: y - row * cellSize,
                    width: cellSize,
                    height: cellSize,
                });
            }
        }

    } catch (err) {
        Swal.fire("Error", err.message, "error");
    }
};
