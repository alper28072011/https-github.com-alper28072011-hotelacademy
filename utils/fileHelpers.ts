
import * as pdfjsLib from 'pdfjs-dist';

// IMPORTANT: Set the worker source for pdf.js to a CDN to avoid complex bundler setup in this environment.
// In a standard React app, you might import the worker from the package.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            
            fullText += pageText + '\n';
        }
        
        return fullText.trim();
    } catch (error) {
        console.error("PDF Parsing Error:", error);
        throw new Error("PDF metni okunamadı. Lütfen dosyanın bozuk olmadığından emin olun.");
    }
};

export const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
};
