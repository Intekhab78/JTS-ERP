import React from 'react';
import Barcode from 'react-barcode';

// 2x3 cm physical label dimensions
// Width: 3cm (~113px), Height: 2cm (~75px) at standard 96dpi
// Using @page rule directly in the component so it applies when printing
const BarcodePrintTemplate = React.forwardRef(({ product }, ref) => {
  if (!product) return null;

  // Prefer barcode field, fallback to SKU, then to a placeholder
  const barcodeValue = product.barcode || product.sku || 'NO-BARCODE';

  return (
    <div ref={ref} className="bg-white print-container">
      <style type="text/css" media="print">
        {`
          @page {
            size: 3cm 2cm;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .print-container {
            width: 3cm;
            height: 2cm;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            box-sizing: border-box;
            padding: 2px;
          }
        `}
      </style>
      
      {/* Product Name (truncated if too long) */}
      <div 
        style={{ fontSize: '6px', fontWeight: 'bold', textAlign: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {product.name}
      </div>

      {/* Barcode itself */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Barcode 
          value={barcodeValue}
          format="CODE128"
          width={1} // Thinnest bar width
          height={25} // Height of the bars
          displayValue={true} // Show the text below the barcode
          fontSize={8} // Font size of the text below
          margin={0}
          background="transparent"
        />
      </div>
      
      {/* Optional: Add price or other small text if needed here */}
    </div>
  );
});

BarcodePrintTemplate.displayName = 'BarcodePrintTemplate';

export default BarcodePrintTemplate;
