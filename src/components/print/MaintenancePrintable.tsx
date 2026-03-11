
import React from 'react';

interface MaintenancePrintableProps {
  record: any;
}

export const MaintenancePrintable: React.FC<MaintenancePrintableProps> = ({ record }) => {
  return (
    <div className="p-8 space-y-6 text-right" dir="rtl">
      <h2 className="text-2xl font-bold border-b pb-4">طلب صيانة</h2>
      <div className="grid grid-cols-2 gap-4">
        <div><strong>رقم الطلب:</strong> {record.no}</div>
        <div><strong>التاريخ:</strong> {record.requestDate}</div>
        <div><strong>الوصف:</strong> {record.description}</div>
        <div><strong>التكلفة:</strong> {record.cost}</div>
      </div>
      <p className="mt-8">هذا نموذج مبسط لمعاينة طلب الصيانة...</p>
    </div>
  );
};
