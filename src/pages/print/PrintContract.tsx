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
  const unit = contract ? db.units.find((item) => item.id === contract.unitId) : null;
  const property = unit ? db.properties.find((item) => item.id === unit.propertyId) : null;
  const owner = property ? db.owners.find((item) => item.id === property.ownerId) : null;
  const tenant = contract ? db.tenants.find((item) => item.id === contract.tenantId) : null;

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
      <ContractPrintable
        contract={contract}
        settings={settings}
        tenantName={tenant?.name || tenant?.fullName || 'مستأجر غير محدد'}
        unitName={unit?.name || unit?.unitNumber || 'وحدة غير محددة'}
        propertyName={property?.name || 'عقار غير محدد'}
        ownerName={owner?.name || 'مالك غير محدد'}
      />
    </div>
  );
};

export default PrintContract;
