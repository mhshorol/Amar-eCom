import React from 'react';

interface InvoiceProps {
  order: any;
  company: any;
  currencySymbol?: string;
}

export const A5Invoice = React.forwardRef<HTMLDivElement, InvoiceProps>(({ order, company, currencySymbol = '৳' }, ref) => {
  return (
    <div ref={ref} className="p-4 bg-[#ffffff] text-[#000000] font-sans relative" style={{ width: '210mm', minHeight: '148mm', margin: '0 auto' }}>
      {/* Top Black Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#000000]"></div>

      {/* Header Section */}
      <div className="flex justify-between items-start mt-1 mb-2">
        <div className="flex-1">
          {company.companyLogo ? (
            <img src={company.companyLogo} alt="Logo" className="h-12 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex items-center gap-1">
              <div className="grid grid-cols-2 gap-0.5">
                <div className="w-2 h-2 bg-[#000000]"></div>
                <div className="w-2 h-2 bg-[#000000]"></div>
                <div className="w-2 h-2 bg-[#000000]"></div>
                <div className="w-2 h-2 bg-[#000000]"></div>
              </div>
              <span className="text-xl font-bold tracking-tighter">KARUKARJO</span>
            </div>
          )}
        </div>
        <div className="text-right flex flex-col gap-0">
          <h2 className="text-lg font-bold text-[#000000] uppercase">{company.companyName || 'KARUKARJO LTD'}</h2>
          <p className="text-[10px] font-medium text-[#000000] uppercase max-w-[300px] ml-auto">
            {company.companyAddress || '44 PEACE TOWER, L# 01&06, NEW MODEL TOWN, HAZARIBAG, DHAKA'}
          </p>
          <p className="text-[10px] font-medium text-[#000000]">
            {company.companyMobile || '01932626364'} {company.companyPhone && `| ${company.companyPhone}`}
          </p>
          <p className="text-[10px] font-medium text-[#000000]">
            {company.companyEmail && `Email: ${company.companyEmail}`} {company.companyWebsite && `| ${company.companyWebsite}`}
          </p>
          {company.companyVat && (
            <p className="text-[10px] font-bold text-[#000000]">BIN/VAT: {company.companyVat}</p>
          )}
        </div>
      </div>

      <div className="border-b border-[#000000] mb-2"></div>

      {/* Info Section */}
      <div className="flex justify-between mb-4">
        <div className="max-w-[50%]">
          <h3 className="text-[10px] font-bold text-[#000000] uppercase tracking-wider mb-1">Customer Details</h3>
          <p className="text-base font-bold text-[#000000] mb-0.5">{order.customerName}</p>
          <p className="text-[14px] font-bold text-[#000000] mb-0.5">{order.customerPhone}</p>
          <p className="text-[13px] text-[#000000] leading-tight">
            {order.customerAddress}
            {order.area && `, ${order.area}`}
            {order.district && `, ${order.district}`}
          </p>
        </div>
        <div className="text-right space-y-1">
          <h3 className="text-[10px] font-bold text-[#000000] uppercase tracking-wider mb-1">Order Information</h3>
          <div className="flex justify-end gap-2">
            <span className="text-[11px] font-bold text-[#000000]">INVOICE ID:</span>
            <span className="text-[11px] font-bold text-[#000000] w-28">#{order.orderNumber || order.id.slice(0, 8)}</span>
          </div>
          <div className="flex justify-end gap-2">
            <span className="text-[11px] font-bold text-[#000000]">DATE:</span>
            <span className="text-[11px] font-bold text-[#000000] w-28">
              {order.createdAt?.toDate 
                ? order.createdAt.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : (order.createdAt?.seconds 
                  ? new Date(order.createdAt.seconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                )
              }
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <span className="text-[11px] font-bold text-[#000000]">PAYMENT:</span>
            <span className="text-[11px] font-bold text-[#000000] w-28 uppercase">{order.paymentMethod || 'COD'}</span>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <table className="w-full mb-4 border-collapse">
        <thead>
          <tr className="border-b border-[#000000] text-[10px] font-bold text-[#000000] uppercase">
            <th className="text-left py-1 w-8">SL</th>
            <th className="text-left py-1">Product Description</th>
            <th className="text-center py-1 w-16">Qty</th>
            <th className="text-right py-1 w-28">Unit Price</th>
            <th className="text-right py-1 w-28">Total</th>
          </tr>
        </thead>
        <tbody className="text-[11px]">
          {order.items?.map((item: any, idx: number) => (
            <tr key={idx} className="border-b border-[#f3f4f6]">
              <td className="py-1 text-left text-[#000000]">{idx + 1}</td>
              <td className="py-1">
                <p className="font-bold text-[#000000]">{item.name || item.productName || 'N/A'}</p>
                {item.variant && <p className="text-[9px] text-[#000000] uppercase">{item.variant}</p>}
              </td>
              <td className="text-center py-1 font-medium text-[#000000]">{item.quantity}</td>
              <td className="text-right py-1 font-medium text-[#000000]">{currencySymbol}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              <td className="text-right py-1 font-bold text-[#000000]">{currencySymbol}{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Section */}
      <div className="flex justify-between items-end">
        <div className="flex-1 max-w-[50%]">
          <div className="mb-4">
            <h4 className="text-[10px] font-bold text-[#000000] uppercase tracking-wider mb-1">Terms & Notes</h4>
            <p className="text-[11px] text-[#000000] italic whitespace-pre-line leading-tight">
              {order.notes || company.invoiceFooterNote || 'Thank you for your purchase. Please visit again!'}
            </p>
          </div>
          <div className="text-[9px] font-bold text-[#000000] uppercase space-y-0.5">
            <p>Shop Online at {company.companyWebsite || 'WWW.KARUKARJO.COM.BD'}</p>
            <p>Follow us on Facebook for latest updates</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="w-56 space-y-1">
            <div className="flex justify-between text-[12px]">
              <span className="font-bold text-[#000000]">SUBTOTAL</span>
              <span className="font-bold text-[#000000]">{currencySymbol}{order.subtotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="font-bold text-[#000000]">DELIVERY CHARGE</span>
              <span className="font-bold text-[#000000]">{currencySymbol}{order.deliveryCharge?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-[12px]">
                <span className="font-bold text-[#000000]">DISCOUNT</span>
                <span className="font-bold text-[#000000]">-{currencySymbol}{order.discount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-[12px] pt-1">
              <span className="font-bold text-[#000000]">GRAND TOTAL</span>
              <span className="font-bold text-[#000000]">{currencySymbol}{order.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="font-bold text-[#000000]">PAID AMOUNT</span>
              <span className="font-bold text-[#000000]">{currencySymbol}{order.paidAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-1">
              <span className="text-[#000000]">DUE AMOUNT</span>
              <span className="text-[#000000]">{currencySymbol}{order.dueAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {company.signatureImage && (
            <div className="flex flex-col items-center mr-4">
              <img src={company.signatureImage} alt="Signature" className="h-12 object-contain mb-0.5" referrerPolicy="no-referrer" />
              <div className="w-32 border-t border-[#000000]"></div>
              <p className="text-[9px] font-bold text-[#000000] uppercase mt-0.5">Authorized Signature</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Disclaimer */}
      <div className="absolute bottom-2 left-4 right-4 text-center border-t border-[#000000] pt-1">
        <p className="text-[9px] text-[#000000]">
          Generated on {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
});

export const POSInvoice = React.forwardRef<HTMLDivElement, InvoiceProps>(({ order, company, currencySymbol = '৳' }, ref) => {
  return (
    <div ref={ref} className="p-2 bg-[#ffffff] text-[#000000] font-mono" style={{ width: '80mm' }}>
      <div className="text-center mb-1">
        {company.companyLogo && (
          <img src={company.companyLogo} alt="Logo" className="h-8 object-contain mx-auto mb-1" referrerPolicy="no-referrer" />
        )}
        <h1 className="text-base font-bold uppercase">{company.companyName}</h1>
        <p className="text-[9px]">{company.companyAddress}</p>
        <p className="text-[9px]">Mob: {company.companyMobile}</p>
        <p className="text-[9px]">{company.companyWebsite}</p>
      </div>

      <div className="border-t border-b border-dashed border-[#000000] py-1 mb-1 text-[11px]">
        <div className="flex justify-between">
          <span>Order: #ORD-{order.orderNumber || order.id.slice(0, 8)}</span>
          <span>
            {order.createdAt?.toDate 
              ? order.createdAt.toDate().toLocaleDateString()
              : (order.createdAt?.seconds 
                ? new Date(order.createdAt.seconds * 1000).toLocaleDateString()
                : new Date().toLocaleDateString()
              )
            }
          </span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Cust: {order.customerName}</span>
          <span>{order.customerPhone}</span>
        </div>
      </div>

      <table className="w-full text-[9px] mb-1">
        <thead>
          <tr className="border-b border-dashed border-[#000000]">
            <th className="text-left py-0.5 w-5">SL</th>
            <th className="text-left py-0.5">Item</th>
            <th className="text-center py-0.5">Qty</th>
            <th className="text-right py-0.5">Price</th>
          </tr>
        </thead>
        <tbody>
          {order.items?.map((item: any, idx: number) => (
            <tr key={idx}>
              <td className="py-0.5">{idx + 1}</td>
              <td className="py-0.5">{item.name || item.productName || 'N/A'}</td>
              <td className="text-center py-0.5">{item.quantity}</td>
              <td className="text-right py-0.5">{currencySymbol}{(item.quantity * item.price).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-dashed border-[#000000] pt-1 space-y-0.5 text-[9px]">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{currencySymbol}{order.subtotal?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Delivery:</span>
          <span>{currencySymbol}{order.deliveryCharge?.toLocaleString()}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>-{currencySymbol}{order.discount?.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Total:</span>
          <span>{currencySymbol}{order.totalAmount?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Paid:</span>
          <span>{currencySymbol}{order.paidAmount?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-bold text-sm">
          <span>Due:</span>
          <span>{currencySymbol}{order.dueAmount?.toLocaleString()}</span>
        </div>
      </div>

      <div className="text-center mt-2 text-[9px]">
        <p className="whitespace-pre-line">{company.invoiceFooterNote || '*** Thank You ***\nPlease visit again'}</p>
      </div>
    </div>
  );
});
