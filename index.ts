import '@unocss/reset/tailwind.css';
import 'pdfjs-dist/web/pdf_viewer.css';
import './index.css';

import * as pdfjs from 'pdfjs-dist';

import samplePDF from './sample.pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

const dpr = window.devicePixelRatio || 1;
const viewer = document.querySelector('#viewer')!;

const renderPage = async (
  pdf: pdfjs.PDFDocumentProxy,
  pageNum: number
): Promise<HTMLCanvasElement> => {
  const page = await pdf.getPage(pageNum);

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  const viewport = page.getViewport({
    scale: viewer.clientHeight / page.getViewport({ scale: 1 }).height,
  });
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = Math.floor(viewport.width) + 'px';
  canvas.style.height = Math.floor(viewport.height) + 'px';

  const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
  const renderContext = {
    canvasContext: context,
    viewport,
    transform,
  };
  await page.render(renderContext).promise;

  return canvas;
};

const main = async () => {
  const pdf = await pdfjs.getDocument(samplePDF).promise;
  const canvas = await renderPage(pdf, 1);
  const viewer = document.querySelector('#viewer')!;
  viewer.appendChild(canvas);
};

main();
