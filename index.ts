import '@unocss/reset/tailwind.css';
import 'pdfjs-dist/web/pdf_viewer.css';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/mousewheel';
import 'swiper/css/keyboard';
import './index.css';

import * as pdfjs from 'pdfjs-dist';
import Swiper from 'swiper';
import { Pagination, Mousewheel, Keyboard } from 'swiper/modules';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

const cmapPath = '/_/cm/';
const fontPath = '/_/sf/';

const swiper = new Swiper('.swiper', {
  cssMode: true,

  direction: 'horizontal',
  loop: false,

  slidesPerView: 'auto',
  spaceBetween: 0,
  centeredSlides: true,
  slideToClickedSlide: true,

  // observer: true,
  // observeParents: true,

  modules: [Pagination, Mousewheel, Keyboard],

  pagination: {
    el: '.swiper-pagination',
    clickable: true,
  },

  mousewheel: true,
  keyboard: true,
});

const dpr = window.devicePixelRatio || 1;
const screenHeight = window.screen.height;

const container = document.querySelector<HTMLElement>('#container')!;
const visualizers = document.querySelectorAll<HTMLElement>('.visualizer');
const effects = document.querySelectorAll<HTMLElement>('.effect');

type Page = {
  page: pdfjs.PDFPageProxy;
  canvas: HTMLCanvasElement;
  textLayer: HTMLDivElement;
};

const computeViewport = (
  page: pdfjs.PDFPageProxy,
  height: number
): pdfjs.PageViewport =>
  page.getViewport({
    scale: height / page.getViewport({ scale: 1 }).height,
  });

const renderPage = async (
  pdf: pdfjs.PDFDocumentProxy,
  pageNum: number
): Promise<Page> => {
  const page = await pdf.getPage(pageNum);

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  const viewport = computeViewport(page, screenHeight);
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);

  const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
  const renderContext = {
    canvasContext: context,
    viewport,
    transform,
  };
  // Do not wait render
  page.render(renderContext);

  // Text layer
  const textLayer = document.createElement('div');
  textLayer.classList.add('textLayer');
  textLayer.style.setProperty('--scale-factor', `${viewport.scale}`);

  (async () => {
    const textContent = await page.getTextContent();
    pdfjs.renderTextLayer({
      textContentSource: textContent,
      container: textLayer,
      viewport,
    });
  })();

  return { page, canvas, textLayer };
};

let currentPDF: pdfjs.PDFDocumentProxy | null = null;
const mutateCurrentPDF = async <T>(func: () => Promise<T>): Promise<T> => {
  const res = await func();
  displayPDF(true); // Do not await
  return res;
};

let cachedPages: Page[] | null = null;
const displayPDF = async (
  reload: boolean,
  containerRect?: DOMRectReadOnly
): Promise<void> => {
  if (!currentPDF) {
    return;
  }
  const pdf = currentPDF;

  let pages;
  if (!reload && cachedPages) {
    pages = cachedPages;
  } else {
    pages = (
      await Promise.allSettled(
        [...Array(pdf.numPages).keys()].map((i) => renderPage(pdf, i + 1))
      )
    )
      .filter((result) => result.status === 'fulfilled')
      .map((result) => (result as PromiseFulfilledResult<Page>).value);
    cachedPages = pages;
  }

  const containerWidth = containerRect?.width || container.clientWidth;
  const containerHeight = containerRect?.height || container.clientHeight;

  let groups = [];
  let prevIndex = 0;
  let currWidth = 0;
  for (const [index, page] of pages.entries()) {
    const { page: p, canvas, textLayer } = page;
    // canvas aspect ratio * container.height = width
    const width = (canvas.width / canvas.height) * containerHeight;
    currWidth += width;
    if (currWidth > containerWidth) {
      // prevIndex <= index - 1 unless index === 0
      const group = pages.slice(prevIndex, index);
      if (group.length > 0) {
        groups.push(group);
      }
      prevIndex = index;
      currWidth = width;
    }
    // Update children sizing
    canvas.style.width = `${width}px`;
    canvas.style.height = `${containerHeight}px`;
    const viewport = computeViewport(p, containerHeight);
    textLayer.style.setProperty('--scale-factor', `${viewport.scale}`);
    pdfjs.updateTextLayer({
      container: textLayer,
      viewport,
      textDivs: [],
    });
  }
  // Push the rest
  groups.push(pages.slice(prevIndex));

  const nestedLengthEqual =
    groups.length === container.children.length &&
    groups.every(
      (group, i) =>
        container.children[i] instanceof HTMLElement &&
        group.length === container.children[i].children.length
    );

  if (reload || !nestedLengthEqual) {
    let children = [];
    for (const group of groups) {
      const wrapper = document.createElement('div');
      wrapper.classList.add('swiper-slide');
      wrapper.classList.add('group');
      for (const { canvas, textLayer } of group) {
        const pageWrapper = document.createElement('div');
        pageWrapper.classList.add('page');
        pageWrapper.append(canvas, textLayer);
        wrapper.appendChild(pageWrapper);
      }
      children.push(wrapper);
    }
    container.replaceChildren(...children);
  }

  swiper.update();
};

// https://webmidi-examples.glitch.me
const parseMIDIMessage = (
  data: Uint8Array
): { command: number; note: number; velocity: number } => {
  const command = data[0] >> 4;
  const note = data[1];
  const velocity = data.length > 2 ? data[2] : 1;
  return {
    command,
    note,
    velocity,
  };
};

let notesOn = new Map<number, number>();
const mutateNotesOn = <T>(func: () => T): T => {
  const res = func();
  visualizeMIDI();
  return res;
};

const noteOn = 9;
const noteOff = 8;

const onMIDIMessage = (event: Event): void => {
  const e = event as MIDIMessageEvent;
  const { command, note, velocity } = parseMIDIMessage(e.data);
  const timestamp = e.timeStamp;

  if (command === noteOff || (command === noteOn && velocity === 0)) {
    mutateNotesOn(() => notesOn.delete(note));
  } else if (command === noteOn) {
    mutateNotesOn(() => notesOn.set(note, timestamp));
  }
};

const setupMIDIDevices = (midi: MIDIAccess): void => {
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API
  for (const entry of midi.inputs.values()) {
    console.log(
      `Input port [type:'${entry.type}']` +
        ` manufacturer:'${entry.manufacturer}'` +
        ` name:'${entry.name}'` +
        ` version:'${entry.version}'`
    );
    // Override onmidimessage
    entry.onmidimessage = onMIDIMessage;
  }
};

const noteColors = [
  '#f38a9c',
  '#29c0e6',
  '#e29f49',
  '#9fa4fe',
  '#93be63',
  '#e48dc8',
  '#07c8c0',
  '#f3906e',
  '#6bb4fd',
  '#c1b043',
  '#c796eb',
  '#58c792',
]; // total 12
const inactiveColor = 'var(--inactive)';

const visualizeMIDI = (): void => {
  if (notesOn.size === 0) {
    for (const visualizer of visualizers) {
      visualizer.style.background = inactiveColor;
    }
    for (const effect of effects) {
      effect.style.background = 'transparent';
    }
    return;
  }

  const colors = [...notesOn.keys()]
    .sort((a, b) => a - b)
    .map((note) => noteColors[note % noteColors.length]);
  const ratios = [...colors.keys(), colors.length].map(
    (i) => `${(i / colors.length) * 100}%`
  );
  const breaks = colors.map(
    (color, i) => `${color} ${ratios[i]} ${ratios[i + 1]}`
  );
  const gradient = `linear-gradient(to right, ${breaks.join(', ')})`;
  for (const visualizer of visualizers) {
    visualizer.style.background = gradient;
  }
  for (const effect of effects) {
    effect.style.background = gradient;
  }
};

const setupMIDI = async (): Promise<void> => {
  let midi: MIDIAccess | null = null;
  try {
    midi = await navigator.requestMIDIAccess();
  } catch (e) {
    if (e instanceof Error) {
      console.log(e.message);
    }
    return;
  }
  setupMIDIDevices(midi);
  midi.onstatechange = () => midi && setupMIDIDevices(midi);
};

const getPDFDocument = async (
  source: string | URL | ArrayBuffer
): Promise<pdfjs.PDFDocumentProxy> => {
  const options = {
    cMapUrl: cmapPath,
    standardFontDataUrl: fontPath,
    ...(source instanceof ArrayBuffer ? { data: source } : { url: source }),
  };
  return await pdfjs.getDocument(options).promise;
};

const readFileToPDF = (file: File): void => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result as ArrayBuffer;
    mutateCurrentPDF(async () => {
      currentPDF = await getPDFDocument(result);
    });
  };
  reader.readAsArrayBuffer(file);
};

const setupFileInput = (): void => {
  const welcome = document.querySelector<HTMLElement>('#welcome')!;
  const input = document.querySelector<HTMLInputElement>('#input')!;

  welcome.onclick = () => input.click();
  input.onchange = () => {
    if (!input.files || input.files.length === 0) {
      return;
    }
    readFileToPDF(input.files[0]);
  };
};

const setupDragAndDrop = (): void => {
  container.ondrop = (event: Event) => {
    event.preventDefault();

    const transfer = (event as DragEvent).dataTransfer;
    if (!transfer) {
      return;
    }

    const files = [...transfer.items]
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile()!) // Not null if kind is file
      .filter((file) => file.type === 'application/pdf');
    if (files.length === 0) {
      return;
    }
    readFileToPDF(files[0]);
  };

  container.ondragover = (event: Event) => {
    event.preventDefault();
  };
};

const main = (): void => {
  setupDragAndDrop();
  setupFileInput();
  setupMIDI();
  new ResizeObserver((entries) => {
    for (const entry of entries) {
      displayPDF(false, entry.contentRect);
    }
  }).observe(container);
};

main();

// TODO: pdf.js: text/annotation layer
// TODO: Loading indicator?
// TODO: Minify HTML
// TODO: RTL Direction/Writing Mode
// TODO: Wheel zoom
