import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ContractPrintable } from '../../components/print/ContractPrintable';
import { useApp } from '../../contexts/AppContext';

const PrintContract: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { db } = useApp();

  const contract = db.contracts.find((c) => c.id === id);
  const settings = db.settings;

  useEffect(() => {
    if (contract) {
      setTimeout(() => window.print(), 300);
    }
  }, [contract]);

  if (!contract) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background text-foreground" dir="rtl">
        <p className="text-lg font-black text-slate-800 dark:text-slate-100">العقد غير موجود</p>
        <button className="btn btn-primary" onClick={() => navigate(-1)}>عودة</button>
      </div>
    );
  }

  return (
    <div className="p-4" dir="rtl">
      <ContractPrintable contract={contract} settings={settings} />
    </div>
  );
};

export default PrintContract;
