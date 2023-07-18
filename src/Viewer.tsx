import React, { useState } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import { Swiper, SwiperSlide } from 'swiper/react';

import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

import type { PDFDocumentProxy } from 'pdfjs-dist';

import samplePDF from './main.pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

type PDFFile = string | File | null;

const Viewer = () => {
  const [file, setFile] = useState<PDFFile>(samplePDF);
  const [numPages, setNumPages] = useState<number>();

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;

    if (files && files[0]) {
      setFile(files[0] || null);
    }
  };

  const onDocumentLoadSuccess = ({
    numPages: nextNumPages,
  }: PDFDocumentProxy) => {
    setNumPages(nextNumPages);
  };

  return (
    <div className="Example">
      <header>
        <h1>react-pdf sample page</h1>
      </header>
      <div className="Example__container">
        <div className="Example__container__load">
          <label htmlFor="file">Load from file:</label>{' '}
          <input onChange={onFileChange} type="file" />
        </div>
        <div className="Example__container__document">
          <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
            <Swiper
              spaceBetween={50}
              slidesPerView={3}
              onSlideChange={() => console.log('slide change')}
              onSwiper={(swiper) => console.log(swiper)}
            >
              {Array.from(new Array(numPages), (_el, index) => (
                <SwiperSlide key={`slide_${index + 1}`}>
                  <div>
                    <Page
                      key={`page_${index + 1}`}
                      style={{ display: 'block' }}
                      pageNumber={index + 1}
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </Document>
        </div>
      </div>
    </div>
  );
};

export default Viewer;
