import '@unocss/reset/tailwind.css';
import 'pdfjs-dist/web/pdf_viewer.css';
import 'swiper/css';
import './index.css';

import * as pdfjs from 'pdfjs-dist';
import Swiper from 'swiper';

import samplePDF from './sample.pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

const dpr = window.devicePixelRatio || 1;
const container = document.querySelector('#container')!;

const renderPage = async (
  pdf: pdfjs.PDFDocumentProxy,
  pageNum: number
): Promise<HTMLCanvasElement> => {
  const page = await pdf.getPage(pageNum);

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  console.log(container.clientHeight, container.clientWidth);
  const viewport = page.getViewport({
    scale: container.clientHeight / page.getViewport({ scale: 1 }).height,
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
  // TODO: lazy-load pages
  const canvases = await Promise.all(
    Array.from({ length: 3 }, (_, i) => renderPage(pdf, i + 1))
  );
  canvases.forEach((canvas) => {
    const wrapper = document.createElement('div');
    wrapper.classList.add('swiper-slide');
    wrapper.appendChild(canvas);
    container.appendChild(wrapper);
  });
  // const canvas = await renderPage(pdf, 1);

  const _swiper = new Swiper('.swiper', {
    direction: 'horizontal',
    loop: false,
  });
};

main();
