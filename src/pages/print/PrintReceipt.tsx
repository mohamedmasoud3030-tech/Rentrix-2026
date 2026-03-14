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
      <ReceiptPrintable receipt={receipt} settings={settings} />
    </div>
  );
};

export default PrintReceipt;
