import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReceiptPrintable } from '../../components/print/ReceiptPrintable';
import { useApp } from '../../contexts/AppContext';

const PrintReceipt: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { db } = useApp();

  const receipt = db.receipts.find((r) => r.id === id);
  const settings = db.settings;
  const contract = receipt ? db.contracts.find((item) => item.id === receipt.contractId) : null;
  const tenant = contract ? db.tenants.find((item) => item.id === contract.tenantId) : null;
  const unit = contract ? db.units.find((item) => item.id === contract.unitId) : null;
  const property = unit ? db.properties.find((item) => item.id === unit.propertyId) : null;

  useEffect(() => {
    if (receipt) {
      setTimeout(() => window.print(), 300);
    }
  }, [receipt]);

  if (!receipt) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background text-foreground" dir="rtl">
        <p className="text-lg font-black text-slate-800 dark:text-slate-100">الإيصال غير موجود</p>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>عودة</button>
      </div>
    );
  }

  return (
    <div className="p-4" dir="rtl">
      <ReceiptPrintable
        receipt={receipt}
        settings={settings}
        tenantName={tenant?.name || tenant?.fullName || 'مستأجر غير محدد'}
        unitName={unit?.name || unit?.unitNumber || 'وحدة غير محددة'}
        propertyName={property?.name || 'عقار غير محدد'}
      />
    </div>
  );
};

export default PrintReceipt;
