async function handleMarksheetImage(event) {
    const file = event.target.files[0];

    if (!file) return;

    console.log("Marksheet selected:", file.name);
    console.log("Starting OCR...");

    try {
        const worker = await Tesseract.createWorker("eng");

        const result = await worker.recognize(file);

        console.log("OCR RESULT:");
        console.log(result.data.text);

        await worker.terminate();

    } catch (error) {
        console.error("OCR failed:", error);
    }
}

document
    .getElementById("marksheetGalleryInput")
    .addEventListener("change", handleMarksheetImage);

document
    .getElementById("marksheetCameraInput")
    .addEventListener("change", handleMarksheetImage);