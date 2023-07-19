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
import { debounce } from 'throttle-debounce';

import samplePDF from './sample.pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

const swiper = new Swiper('.swiper', {
  cssMode: true,

  direction: 'horizontal',
  loop: false,

  slidesPerView: 'auto',
  spaceBetween: 0,
  centeredSlides: true,
  slideToClickedSlide: true,

  observer: true,
  observeParents: true,

  modules: [Pagination, Mousewheel, Keyboard],

  pagination: {
    el: '.swiper-pagination',
    clickable: true,
  },

  mousewheel: true,
  keyboard: true,
});

const dpr = window.devicePixelRatio || 1;
const container = document.querySelector('#container')!;

const renderPage = async (
  pdf: pdfjs.PDFDocumentProxy,
  pageNum: number
): Promise<HTMLCanvasElement> => {
  console.log(pageNum);
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

// type SlideElement = HTMLElement & { progress: number };

// At most one PDF is displayed at a time, use a global variable for simplicity
let currentPDF: string | URL | Uint8Array | ArrayBuffer | null = null;
const sep = ',';

const displayPDF = async (): Promise<void> => {
  if (!currentPDF) {
    return;
  }
  const pdf = await pdfjs.getDocument(currentPDF).promise;

  // Render visible page first (left, active, right)
  const minIndex = Math.max(swiper.activeIndex - 1, 0);
  const maxIndex = Math.min(swiper.activeIndex + 1, swiper.slides.length - 1);
  let prerendered = new Map();
  for (let i = minIndex; i <= maxIndex; i++) {
    const slide = swiper.slides[i];
    // TODO: On first load, slide is undefined, no prerender
    if (!slide) {
      continue;
    }
    if (slide.dataset.pages) {
      for (const pageNumString of slide.dataset.pages.split(sep)) {
        const pageNum = parseInt(pageNumString);
        if (isNaN(pageNum)) {
          continue;
        }
        prerendered.set(pageNum, renderPage(pdf, pageNum));
      }
    }
  }
  const canvases = await Promise.all(
    [...Array(pdf.numPages).keys()].map((i) =>
      prerendered.has(i + 1) ? prerendered.get(i + 1) : renderPage(pdf, i + 1)
    )
  );

  console.log(container.clientWidth, container.clientHeight);
  const maxWidth = Math.floor(container.clientWidth * dpr);
  let groups = [];
  let prevIndex = 0;
  let currWidth = 0;
  for (const [index, canvas] of canvases.entries()) {
    currWidth += canvas.width;
    if (currWidth > maxWidth) {
      // prevIndex <= index - 1 unless index === 0
      const group = canvases.slice(prevIndex, index);
      const pageNums = [...group.keys()].map((i) => i + prevIndex + 1);
      if (group.length > 0) {
        groups.push([group, pageNums]);
      }
      prevIndex = index;
      currWidth = canvas.width;
    }
  }
  // Push the rest
  groups.push([
    canvases.slice(prevIndex),
    [...Array(canvases.length - prevIndex).keys()].map(
      (i) => i + prevIndex + 1
    ),
  ]);

  container.replaceChildren();
  for (const [group, pageNums] of groups) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('swiper-slide');
    wrapper.classList.add('group');
    wrapper.dataset.pages = pageNums.join(sep);
    for (const canvas of group) {
      wrapper.appendChild(canvas);
    }
    container.appendChild(wrapper);
  }
};

// https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API
const printMIDIDevices = (midi: MIDIAccess): void => {
  for (const entry of midi.inputs) {
    const input = entry[1];
    console.log(
      `Input port [type:'${input.type}']` +
        ` id:'${input.id}'` +
        ` manufacturer:'${input.manufacturer}'` +
        ` name:'${input.name}'` +
        ` version:'${input.version}'`
    );
  }

  for (const entry of midi.outputs) {
    const output = entry[1];
    console.log(
      `Output port [type:'${output.type}']` +
        ` id:'${output.id}'` +
        ` manufacturer:'${output.manufacturer}'` +
        ` name:'${output.name}'` +
        ` version:'${output.version}'`
    );
  }
};

// https://webmidi-examples.glitch.me/
const parseMIDIMessage = (
  data: Uint8Array
): { command: number; pitch: number; velocity: number } => {
  const command = data[0] >> 4;
  const pitch = data[1];
  const velocity = data.length > 2 ? data[2] : 1;
  return {
    command,
    pitch,
    velocity,
  };
};

let notesOn = new Map<number, number>();

const noteOn = 9;
const noteOff = 8;

const onMIDIMessage = (event: Event): void => {
  const e = event as MIDIMessageEvent;
  const { command, pitch, velocity } = parseMIDIMessage(e.data);
  const timestamp = e.timeStamp;

  if (command === noteOff || (command === noteOn && velocity === 0)) {
    notesOn.delete(pitch);
  } else if (command === noteOn) {
    notesOn.set(pitch, timestamp);
  }
};

const setupMIDIDevices = (midi: MIDIAccess) => {
  printMIDIDevices(midi);
  midi.inputs.forEach((entry) => {
    // Override onmidimessage
    entry.onmidimessage = onMIDIMessage;
  });
};

const setupMIDI = async () => {
  let midi: MIDIAccess | null = null;
  try {
    midi = await navigator.requestMIDIAccess();
  } catch (e) {
    console.log(e);
    return;
  }
  setupMIDIDevices(midi);
  midi.addEventListener('statechange', (event) =>
    setupMIDIDevices(event.target as MIDIAccess)
  );
};

const main = async () => {
  currentPDF = samplePDF;
  displayPDF();
  new ResizeObserver(
    debounce(
      100,
      (() => {
        let flag = false;
        return () => {
          if (!flag) {
            flag = true;
            return;
          }
          displayPDF();
        };
      })()
    )
  ).observe(container);
  // TODO: container.clientHeight does not change
  setupMIDI();
};

main();

// TODO: pdf.js: cmap, font, text/annotation layer
// TODO: Loading indicator
// TODO: Navigation
// TODO: MIDI support
// TODO: On window size change
// TODO: Drag and drop
