import '@unocss/reset/tailwind.css';
// For text/annotation layers
// import 'pdfjs-dist/web/pdf_viewer.css';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/mousewheel';
import 'swiper/css/keyboard';
import './index.css';

import * as pdfjs from 'pdfjs-dist';
import Swiper from 'swiper';
import { Pagination, Mousewheel, Keyboard } from 'swiper/modules';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const cmapPath = '/-/cm/';
const fontPath = '/-/sf/';

const swiper = new Swiper('.swiper', {
  cssMode: true,

  direction: 'horizontal',
  loop: false,

  slidesPerView: 'auto',
  spaceBetween: 0,
  centeredSlides: true,
  slideToClickedSlide: true,

  modules: [Pagination, Mousewheel, Keyboard],

  pagination: {
    el: '.swiper-pagination',
    clickable: true,
  },

  mousewheel: true,
  keyboard: true,
});

const container = document.querySelector<HTMLElement>('#container')!;
const visualizers = document.querySelectorAll<HTMLElement>('.visualizer');
const effects = document.querySelectorAll<HTMLElement>('.effect');

type Page = {
  wrapper: HTMLDivElement;
  canvas: HTMLCanvasElement;
};

const renderPage = async (
  pdf: pdfjs.PDFDocumentProxy,
  pageNum: number,
): Promise<Page> => {
  const page = await pdf.getPage(pageNum);

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  const viewport = page.getViewport({
    scale: window.screen.height / page.getViewport({ scale: 1 }).height,
  });
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);

  const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
  const renderContext = {
    canvasContext: context,
    viewport,
    transform,
  };

  const overlay = document.createElement('div');
  overlay.classList.add('overlay');
  const spinner = document.createElement('div');
  spinner.classList.add('spinner');
  overlay.append(spinner);

  // Do not wait render
  (async () => {
    await page.render(renderContext).promise;
    overlay.remove();
  })();

  const wrapper = document.createElement('div');
  wrapper.classList.add('page');
  wrapper.append(canvas, overlay);

  return { wrapper, canvas };
};

let currentPDF: pdfjs.PDFDocumentProxy | null = null;
const mutateCurrentPDF = async <T>(func: () => Promise<T>): Promise<T> => {
  const res = await func();
  displayPDF(true); // Do not wait
  return res;
};

let cachedPages: Page[] | null = null;
const displayPDF = async (
  reload: boolean,
  containerRect?: DOMRectReadOnly,
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
        [...Array(pdf.numPages).keys()].map((i) => renderPage(pdf, i + 1)),
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
  for (const [index, { canvas }] of pages.entries()) {
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
    // Update canvas rect
    if (width <= containerWidth) {
      canvas.style.width = `${width}px`;
      canvas.style.height = `${containerHeight}px`;
    } else {
      canvas.style.width = `${containerWidth}px`;
      canvas.style.height = `${(containerWidth / width) * containerHeight}px`;
    }
  }
  // Push the rest
  groups.push(pages.slice(prevIndex));

  const nestedLengthEqual =
    container.children.length === groups.length &&
    groups.every(
      (group, i) =>
        container.children[i] instanceof HTMLElement &&
        group.length === container.children[i].children.length,
    );

  if (reload || !nestedLengthEqual) {
    let children = [];
    for (const group of groups) {
      const wrapper = document.createElement('div');
      wrapper.classList.add('swiper-slide');
      wrapper.classList.add('group');
      wrapper.append(...group.map(({ wrapper: w }) => w));
      children.push(wrapper);
    }
    container.replaceChildren(...children);
  }

  swiper.update();
};

const [noteMin, noteMax] = [21, 108];
const noteElements = new Map<number, HTMLElement[]>();

const setupNoteElements = (): void => {
  for (const note of [...Array(noteMax - noteMin + 1).keys()].map(
    (i) => i + noteMin,
  )) {
    let elements = [];
    for (const parent of [...visualizers, ...effects]) {
      const element = document.createElement('div');
      element.classList.add('note');
      parent.append(element);
      elements.push(element);
    }
    noteElements.set(note, elements);
  }
};

type Message = {
  command: number;
  note: number;
  velocity: number;
};

// https://webmidi-examples.glitch.me
const parseMIDIMessage = (data: Uint8Array): Message => {
  const command = data[0] >> 4;
  const note = data[1];
  const velocity = data.length > 2 ? data[2] : 1;
  return {
    command,
    note,
    velocity,
  };
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

const noteOn = 9;
const noteOff = 8;

const onMIDIMessage = (event: Event): void => {
  const e = event as MIDIMessageEvent;
  const { command, note, velocity } = parseMIDIMessage(e.data);
  // const timestamp = e.timeStamp;

  const elements = noteElements.get(note);
  if (!elements) {
    return;
  }

  if (command === noteOff || (command === noteOn && velocity === 0)) {
    for (const element of elements) {
      element.style.background = '';
    }
  } else if (command === noteOn) {
    for (const element of elements) {
      element.style.background = noteColors[note % noteColors.length];
    }
  }
};

const setupMIDIDevices = (midi: MIDIAccess): void => {
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API
  for (const entry of midi.inputs.values()) {
    console.log(
      `Port [type:${entry.type}]` +
        ` name:'${entry.name}'` +
        ` manufacturer:'${entry.manufacturer}'` +
        ` version:'${entry.version}'`,
    );
    // Override onmidimessage
    entry.removeEventListener('midimessage', onMIDIMessage);
    entry.addEventListener('midimessage', onMIDIMessage);
  }
};

const setupMIDI = async (): Promise<void> => {
  let midi: MIDIAccess | null = null;
  try {
    midi = await navigator.requestMIDIAccess({ sysex: false });
  } catch (e) {
    if (e instanceof Error) {
      console.log(e.message);
    }
    return;
  }
  setupMIDIDevices(midi);
  midi.addEventListener('statechange', () => midi && setupMIDIDevices(midi));
};

const getPDFDocument = async (
  source: string | URL | ArrayBuffer,
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
  reader.addEventListener('load', () => {
    const result = reader.result;
    if (!(result instanceof ArrayBuffer)) {
      return;
    }
    mutateCurrentPDF(async () => {
      currentPDF = await getPDFDocument(result);
    });
  });
  reader.readAsArrayBuffer(file);
};

const setupFileInput = (): void => {
  const upload = document.querySelector<HTMLElement>('#upload')!;
  const input = document.querySelector<HTMLInputElement>('#input')!;

  upload.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (!input.files || input.files.length === 0) {
      return;
    }
    readFileToPDF(input.files[0]);
  });
};

const setupDragAndDrop = (): void => {
  document.addEventListener('drop', (event: DragEvent) => {
    event.preventDefault();

    const transfer = event.dataTransfer;
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
  });

  document.addEventListener('dragover', (event: Event) => {
    event.preventDefault();
  });
};

const toggleFullscreen = (): void => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
};

const setupFullscreen = (): void => {
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      toggleFullscreen();
    }
  });
  document.addEventListener('dblclick', toggleFullscreen);
};

const requestWakeLock = async () => {
  try {
    await navigator.wakeLock.request('screen');
  } catch (e) {}
};

const setupWakeLock = (): void => {
  if ('wakeLock' in navigator) {
    requestWakeLock();
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    });
  }
};

const observeResizing = (): void => {
  new ResizeObserver((entries) => {
    for (const entry of entries) {
      displayPDF(false, entry.contentRect);
    }
  }).observe(container);
};

const main = (): void => {
  setupNoteElements();
  setupWakeLock();
  setupFullscreen();
  setupDragAndDrop();
  setupFileInput();
  setupMIDI();
  observeResizing();
};

main();
