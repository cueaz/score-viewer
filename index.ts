import '@unocss/reset/tailwind.css';
import 'pdfjs-dist/web/pdf_viewer.css';
import './index.css';

import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();
