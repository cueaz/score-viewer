import '@unocss/reset/tailwind.css';
// import 'pdfjs-dist/web/pdf_viewer.css';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/mousewheel';
import 'swiper/css/keyboard';
import './index.css';

import * as pdfjs from 'pdfjs-dist';
import Swiper from 'swiper';
import { Pagination, Mousewheel, Keyboard } from 'swiper/modules';

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
  // Do not wait render
  page.render(renderContext);

  return canvas;
};

const setupSwiper = (): Swiper => {
  const swiper = new Swiper('.swiper', {
    cssMode: true,

    direction: 'horizontal',
    loop: false,

    slidesPerView: 'auto',
    spaceBetween: 0,
    centeredSlides: true,

    observer: true,

    modules: [Pagination, Mousewheel, Keyboard],

    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },

    mousewheel: {
      invert: true,
    },
    keyboard: true,
  });
  return swiper;
};

const displayPDF = async (url: string) => {
  const pdf = await pdfjs.getDocument(url).promise;
  const canvases = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) => renderPage(pdf, i + 1))
  );

  const maxWidth = Math.floor(container.clientWidth * dpr);
  console.log(container.clientWidth);
  let groups = [];
  let prevIndex = 0;
  let currWidth = 0;
  for (const [index, canvas] of canvases.entries()) {
    currWidth += canvas.width;
    if (currWidth > maxWidth) {
      // prevIndex <= index - 1 unless index === 0
      const group = canvases.slice(prevIndex, index);
      if (group.length > 0) {
        groups.push(group);
      }
      prevIndex = index;
      currWidth = canvas.width;
    }
  }
  // Push the rest
  groups.push(canvases.slice(prevIndex));

  container.replaceChildren();
  for (const group of groups) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('swiper-slide');
    wrapper.classList.add('group');
    for (const canvas of group) {
      wrapper.appendChild(canvas);
    }
    container.appendChild(wrapper);
  }
};

const main = async () => {
  setupSwiper();
  displayPDF(samplePDF);
};

main();

// TODO: MIDI support
// TODO: On window size change
// TODO: Drag and drop
