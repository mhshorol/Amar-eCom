export const openPrintWindow = (elementHTML: string, title: string = 'Print Document', targetWin?: Window | null) => {
  const win = targetWin || window.open('', '_blank');
  if (!win) {
    console.error("Popup blocked. Please allow popups.");
    return false;
  }

  // gather all styles existing in the current document
  let styles = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    styles += node.outerHTML;
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        ${styles}
        <style>
          @media print {
            body, html { 
              visibility: visible !important;
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
            }
            body * {
              visibility: visible !important;
            }
            .no-print, .no-print * {
              display: none !important;
              visibility: hidden !important;
            }
          }
          /* Hide non-print elements globally inside the new window if any leaked */
          .no-print { display: none !important; }
        </style>
      </head>
      <body>
        ${elementHTML}
        <script>
          // Wait for custom fonts and images to load
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  win.document.open();
  win.document.write(htmlContent);
  win.document.close();
  return true;
};
