import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Building2, FileText, Home, Layers3, MapPin, PencilLine, PlusCircle, Printer, Receipt, Wrench } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import type { Property, Unit } from '../types';
import PageHeader from '../components/ui/PageHeader';
import SummaryStatCard from '../components/ui/SummaryStatCard';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import StatusPill from '../components/ui/StatusPill';
import TableWrapper, { Td, Th, Tr } from '../components/ui/TableWrapper';
import SearchFilterBar from '../components/shared/SearchFilterBar';
import AttachmentsManager from '../components/shared/AttachmentsManager';
import { formatCurrency, formatDate } from '../utils/helpers';

const propertyTypeLabels: Record<string, string> = {
  BUILDING: 'Ã™â€¦Ã˜Â¨Ã™â€ Ã™â€°',
  VILLA: 'Ã™ÂÃ™Å Ã™â€žÃ˜Â§',
  APARTMENT: 'Ã˜Â´Ã™â€šÃ˜Â©',
  OFFICE: 'Ã™â€¦Ã™Æ’Ã˜ÂªÃ˜Â¨',
  SHOP: 'Ã™â€¦Ã˜Â­Ã™â€ž',
  WAREHOUSE: 'Ã™â€¦Ã˜Â³Ã˜ÂªÃ™Ë†Ã˜Â¯Ã˜Â¹',
  LAND: 'Ã˜Â£Ã˜Â±Ã˜Â¶',
  OTHER: 'Ã˜Â£Ã˜Â®Ã˜Â±Ã™â€°',
};

const unitTypeLabels: Record<string, string> = {
  APARTMENT: 'Ã˜Â´Ã™â€šÃ˜Â©',
  STUDIO: 'Ã˜Â§Ã˜Â³Ã˜ÂªÃ™Ë†Ã˜Â¯Ã™Å Ã™Ë†',
  OFFICE: 'Ã™â€¦Ã™Æ’Ã˜ÂªÃ˜Â¨',
  SHOP: 'Ã™â€¦Ã˜Â­Ã™â€ž',
  WAREHOUSE: 'Ã™â€¦Ã˜Â³Ã˜ÂªÃ™Ë†Ã˜Â¯Ã˜Â¹',
  ROOM: 'Ã˜ÂºÃ˜Â±Ã™ÂÃ˜Â©',
  OTHER: 'Ã˜Â£Ã˜Â®Ã˜Â±Ã™â€°',
};

const unitStatusLabels: Record<string, string> = {
  VACANT: 'Ã˜Â´Ã˜Â§Ã˜ÂºÃ˜Â±Ã˜Â©',
  RENTED: 'Ã™â€¦Ã˜Â¤Ã˜Â¬Ã˜Â±Ã˜Â©',
  MAINTENANCE: 'Ã˜ÂªÃ˜Â­Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©',
};

const inputCls =
  'w-full rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none backdrop-blur-sm transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:focus:border-blue-400';
const labelCls = 'mb-1.5 block text-xs font-extrabold tracking-wide text-slate-600 dark:text-slate-300';
const actionButtonCls =
  'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors';
const ghostButtonCls =
  'border border-slate-200/80 bg-white/90 text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800';
const primaryButtonCls = 'bg-blue-600 text-white shadow-sm hover:bg-blue-700';
const tabButtonBase = 'rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors border';

type ViewMode = 'properties' | 'units';

type PropertyFormState = {
  ownerId: string;
  name: string;
  propertyType: Property['propertyType'];
  address: string;
  city: string;
  district: string;
  totalUnits: string;
  description: string;
};

type UnitFormState = {
  propertyId: string;
  unitNumber: string;
  unitType: Unit['unitType'];
  floor: string;
  areaSqm: string;
  roomsCount: string;
  bathroomsCount: string;
  expectedRent: string;
  status: Unit['status'];
  notes: string;
};

const emptyPropertyForm: PropertyFormState = {
  ownerId: '',
  name: '',
  propertyType: 'BUILDING',
  address: '',
  city: '',
  district: '',
  totalUnits: '',
  description: '',
};

const emptyUnitForm: UnitFormState = {
  propertyId: '',
  unitNumber: '',
  unitType: 'APARTMENT',
  floor: '',
  areaSqm: '',
  roomsCount: '',
  bathroomsCount: '',
  expectedRent: '',
  status: 'VACANT',
  notes: '',
};

const numberOrNull = (value: string) => {
  if (value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const displayPropertyType = (value: string | null | undefined) => propertyTypeLabels[value || 'OTHER'] || 'Ã˜Â£Ã˜Â®Ã˜Â±Ã™â€°';
const displayUnitType = (value: string | null | undefined) => unitTypeLabels[value || 'OTHER'] || 'Ã˜Â£Ã˜Â®Ã˜Â±Ã™â€°';
const displayUnitName = (unit: Partial<Unit>) => unit.name || unit.unitNumber || 'Ã™Ë†Ã˜Â­Ã˜Â¯Ã˜Â© Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã˜Â³Ã™â€¦Ã˜Â§Ã˜Â©';
const displayUnitStatus = (status: string | null | undefined) => unitStatusLabels[status || 'VACANT'] || 'Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã˜Â­Ã˜Â¯Ã˜Â¯';

const statusBadgeClass = (status: string | null | undefined) => {
  switch (status) {
    case 'RENTED':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
    case 'MAINTENANCE':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';
    default:
      return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300';
  }
};

const PropertiesAndUnits: React.FC = () => {
  const navigate = useNavigate();
  const { db, dataService, contractBalances } = useApp();
  const currency = db.settings?.currency || 'OMR';

  const [viewMode, setViewMode] = useState<ViewMode>('properties');
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('ALL');
  const [unitStatusFilter, setUnitStatusFilter] = useState<string>('ALL');
  const [propertyModalOpen, setPropertyModalOpen] = useState(false);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [propertyForm, setPropertyForm] = useState<PropertyFormState>(emptyPropertyForm);
  const [unitForm, setUnitForm] = useState<UnitFormState>(emptyUnitForm);

  const ownersMap = useMemo(() => new Map(db.owners.map((owner) => [owner.id, owner])), [db.owners]);
  const propertyMap = useMemo(() => new Map(db.properties.map((property) => [property.id, property])), [db.properties]);

  const unitsByProperty = useMemo(() => {
    const map = new Map<string, Unit[]>();
    db.units.forEach((unit) => {
      const current = map.get(unit.propertyId) || [];
      current.push(unit);
      map.set(unit.propertyId, current);
    });
    return map;
  }, [db.units]);

  const activeContractsByUnit = useMemo(() => {
    const map = new Map<string, typeof db.contracts[number]>();
    db.contracts
      .filter((contract) => contract.status === 'ACTIVE')
      .forEach((contract) => {
        map.set(contract.unitId, contract);
      });
    return map;
  }, [db.contracts]);

  const tenantsMap = useMemo(() => new Map(db.tenants.map((tenant) => [tenant.id, tenant])), [db.tenants]);

  const propertyRows = useMemo(() => {
    return db.properties
      .map((property) => {
        const units = unitsByProperty.get(property.id) || [];
        const occupied = units.filter((unit) => activeContractsByUnit.has(unit.id)).length;
        const maintenance = units.filter((unit) => unit.status === 'MAINTENANCE').length;
        const vacant = Math.max(units.length - occupied - maintenance, 0);
        const occupancyRate = units.length ? Math.round((occupied / units.length) * 100) : 0;
        const expectedRevenue = units.reduce((sum, unit) => sum + Number(unit.expectedRent || unit.rentDefault || 0), 0);
        const owner = ownersMap.get(property.ownerId);

        return {
          ...property,
          ownerName: owner?.name || 'Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã˜Â­Ã˜Â¯Ã˜Â¯',
          unitsCount: units.length,
          occupied,
          maintenance,
          vacant,
          occupancyRate,
          expectedRevenue,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [activeContractsByUnit, db.properties, ownersMap, unitsByProperty]);

  const unitRows = useMemo(() => {
    return db.units
      .map((unit) => {
        const property = propertyMap.get(unit.propertyId);
        const owner = property ? ownersMap.get(property.ownerId) : undefined;
        const contract = activeContractsByUnit.get(unit.id);
        const tenant = contract ? tenantsMap.get(contract.tenantId) : undefined;

        return {
          ...unit,
          displayName: displayUnitName(unit),
          propertyName: property?.name || 'Ã˜Â¹Ã™â€šÃ˜Â§Ã˜Â± Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã˜Â¹Ã˜Â±Ã™Ë†Ã™Â',
          ownerName: owner?.name || 'Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã˜Â­Ã˜Â¯Ã˜Â¯',
          tenantName: tenant?.name || tenant?.fullName || 'Ã˜Â¨Ã˜Â¯Ã™Ë†Ã™â€  Ã™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±',
          balance: contract ? contractBalances[contract.id]?.balance || 0 : 0,
        };
      })
      .sort((a, b) => a.propertyName.localeCompare(b.propertyName, 'ar') || a.displayName.localeCompare(b.displayName, 'ar'));
  }, [activeContractsByUnit, contractBalances, db.units, ownersMap, propertyMap, tenantsMap]);

  const totals = useMemo(() => {
    const totalUnits = unitRows.length;
    const rentedUnits = unitRows.filter((unit) => unit.status === 'RENTED' || activeContractsByUnit.has(unit.id)).length;
    const vacantUnits = unitRows.filter((unit) => unit.status === 'VACANT' && !activeContractsByUnit.has(unit.id)).length;
    const maintenanceUnits = unitRows.filter((unit) => unit.status === 'MAINTENANCE').length;
    const expectedRevenue = unitRows.reduce((sum, unit) => sum + Number(unit.expectedRent || unit.rentDefault || 0), 0);

    return {
      properties: propertyRows.length,
      units: totalUnits,
      rented: rentedUnits,
      vacant: vacantUnits,
      maintenance: maintenanceUnits,
      occupancyRate: totalUnits ? ((rentedUnits / totalUnits) * 100).toFixed(1) : '0.0',
      expectedRevenue,
    };
  }, [activeContractsByUnit, propertyRows.length, unitRows]);

  const propertyBreakdown = useMemo(() => {
    const entries = Object.entries(
      propertyRows.reduce<Record<string, number>>((acc, row) => {
        acc[row.propertyType] = (acc[row.propertyType] || 0) + 1;
        return acc;
      }, {})
    );
    return entries.sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [propertyRows]);

  const cityBreakdown = useMemo(() => {
    const entries = Object.entries(
      propertyRows.reduce<Record<string, number>>((acc, row) => {
        const city = row.city || 'Ã˜Â¨Ã˜Â¯Ã™Ë†Ã™â€  Ã™â€¦Ã˜Â¯Ã™Å Ã™â€ Ã˜Â©';
        acc[city] = (acc[city] || 0) + 1;
        return acc;
      }, {})
    );
    return entries.sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [propertyRows]);

  const filteredPropertyRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return propertyRows.filter((row) => {
      const matchesType = propertyTypeFilter === 'ALL' || row.propertyType === propertyTypeFilter;
      if (!matchesType) return false;
      if (!query) return true;
      return [row.name, row.ownerName, row.address, row.city, row.district]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [propertyRows, propertyTypeFilter, searchTerm]);

  const filteredUnitRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return unitRows.filter((row) => {
      const matchesStatus = unitStatusFilter === 'ALL' || row.status === unitStatusFilter;
      if (!matchesStatus) return false;
      if (!query) return true;
      return [row.displayName, row.propertyName, row.ownerName, row.tenantName, row.unitNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [searchTerm, unitRows, unitStatusFilter]);

  const selectedProperty = useMemo(
    () => propertyRows.find((property) => property.id === selectedPropertyId) || propertyRows[0] || null,
    [propertyRows, selectedPropertyId],
  );
  const selectedUnit = useMemo(
    () => unitRows.find((unit) => unit.id === selectedUnitId) || unitRows[0] || null,
    [selectedUnitId, unitRows],
  );

  const propertyWorkspace = useMemo(() => {
    if (!selectedProperty) return null;
    const units = unitRows.filter((unit) => unit.propertyId === selectedProperty.id);
    const unitIds = new Set(units.map((unit) => unit.id));
    const contracts = db.contracts.filter((contract) => unitIds.has(contract.unitId));
    const contractIds = new Set(contracts.map((contract) => contract.id));
    const invoices = db.invoices.filter((invoice) => contractIds.has(invoice.contractId));
    const receipts = db.receipts.filter((receipt) => contractIds.has(receipt.contractId));
    const maintenance = db.maintenanceRecords.filter((record) => record.propertyId === selectedProperty.id || unitIds.has(record.unitId || ''));
    const utilityExpenses = db.expenses.filter(
      (expense) =>
        (expense.propertyId === selectedProperty.id || unitIds.has(expense.unitId || '')) &&
        ['Ã™Æ’Ã™â€¡Ã˜Â±Ã˜Â¨Ã˜Â§Ã˜Â¡', 'Ã™â€¦Ã™Å Ã˜Â§Ã™â€¡', 'Ã˜Â¥Ã™â€ Ã˜ÂªÃ˜Â±Ã™â€ Ã˜Âª', 'utilities', 'electricity', 'water', 'internet'].some((term) => (expense.category || '').toLowerCase().includes(term.toLowerCase())),
    );
    return { units, contracts, invoices, receipts, maintenance, utilityExpenses };
  }, [db.contracts, db.invoices, db.maintenanceRecords, db.receipts, selectedProperty, unitRows]);

  const unitWorkspace = useMemo(() => {
    if (!selectedUnit) return null;
    const contract = activeContractsByUnit.get(selectedUnit.id) || db.contracts.find((item) => item.unitId === selectedUnit.id);
    const invoices = contract ? db.invoices.filter((invoice) => invoice.contractId === contract.id) : [];
    const receipts = contract ? db.receipts.filter((receipt) => receipt.contractId === contract.id) : [];
    const maintenance = db.maintenanceRecords.filter((record) => record.unitId === selectedUnit.id || record.propertyId === selectedUnit.propertyId);
    const utilityExpenses = db.expenses.filter(
      (expense) =>
        (expense.unitId === selectedUnit.id || expense.propertyId === selectedUnit.propertyId) &&
        ['Ã™Æ’Ã™â€¡Ã˜Â±Ã˜Â¨Ã˜Â§Ã˜Â¡', 'Ã™â€¦Ã™Å Ã˜Â§Ã™â€¡', 'Ã˜Â¥Ã™â€ Ã˜ÂªÃ˜Â±Ã™â€ Ã˜Âª', 'utilities', 'electricity', 'water', 'internet'].some((term) => (expense.category || '').toLowerCase().includes(term.toLowerCase())),
    );
    return { contract, invoices, receipts, maintenance, utilityExpenses };
  }, [activeContractsByUnit, db.contracts, db.expenses, db.invoices, db.maintenanceRecords, db.receipts, selectedUnit]);

  useEffect(() => {
    if (!propertyModalOpen) return;
    if (editingProperty) {
      setPropertyForm({
        ownerId: editingProperty.ownerId || '',
        name: editingProperty.name || '',
        propertyType: editingProperty.propertyType || 'BUILDING',
        address: editingProperty.address || '',
        city: editingProperty.city || '',
        district: editingProperty.district || '',
        totalUnits: editingProperty.totalUnits != null ? String(editingProperty.totalUnits) : '',
        description: editingProperty.description || '',
      });
      return;
    }
    setPropertyForm({
      ...emptyPropertyForm,
      ownerId: db.owners[0]?.id || '',
    });
  }, [db.owners, editingProperty, propertyModalOpen]);

  useEffect(() => {
    if (!unitModalOpen) return;
    if (editingUnit) {
      setUnitForm({
        propertyId: editingUnit.propertyId || '',
        unitNumber: editingUnit.unitNumber || editingUnit.name || '',
        unitType: editingUnit.unitType || 'APARTMENT',
        floor: editingUnit.floor != null ? String(editingUnit.floor) : '',
        areaSqm: editingUnit.areaSqm != null ? String(editingUnit.areaSqm) : '',
        roomsCount: editingUnit.roomsCount != null ? String(editingUnit.roomsCount) : '',
        bathroomsCount: editingUnit.bathroomsCount != null ? String(editingUnit.bathroomsCount) : '',
        expectedRent: editingUnit.expectedRent != null ? String(editingUnit.expectedRent) : editingUnit.rentDefault != null ? String(editingUnit.rentDefault) : '',
        status: editingUnit.status || 'VACANT',
        notes: editingUnit.notes || '',
      });
      return;
    }
    setUnitForm({
      ...emptyUnitForm,
      propertyId: db.properties[0]?.id || '',
    });
  }, [db.properties, editingUnit, unitModalOpen]);

  const openCreateProperty = () => {
    setEditingProperty(null);
    setPropertyModalOpen(true);
  };

  const openEditProperty = (property: Property) => {
    setEditingProperty(property);
    setPropertyModalOpen(true);
  };

  const openCreateUnit = (propertyId?: string) => {
    setEditingUnit(null);
    setUnitForm((current) => ({ ...current, propertyId: propertyId || db.properties[0]?.id || '' }));
    setUnitModalOpen(true);
  };

  const openEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitModalOpen(true);
  };

  const handlePropertySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      ownerId: propertyForm.ownerId,
      name: propertyForm.name.trim(),
      propertyType: propertyForm.propertyType,
      address: propertyForm.address.trim() || null,
      city: propertyForm.city.trim() || null,
      district: propertyForm.district.trim() || null,
      totalUnits: numberOrNull(propertyForm.totalUnits),
      description: propertyForm.description.trim() || null,
      updatedAt: Date.now(),
    };

    if (editingProperty) await dataService.update('properties', editingProperty.id, payload);
    else await dataService.add('properties', payload);

    setPropertyModalOpen(false);
    setEditingProperty(null);
  };

  const handleUnitSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      propertyId: unitForm.propertyId,
      unitNumber: unitForm.unitNumber.trim(),
      unitType: unitForm.unitType,
      floor: numberOrNull(unitForm.floor),
      areaSqm: numberOrNull(unitForm.areaSqm),
      roomsCount: numberOrNull(unitForm.roomsCount),
      bathroomsCount: numberOrNull(unitForm.bathroomsCount),
      expectedRent: numberOrNull(unitForm.expectedRent),
      status: unitForm.status,
      notes: unitForm.notes.trim() || null,
      updatedAt: Date.now(),
    };

    if (editingUnit) await dataService.update('units', editingUnit.id, payload);
    else await dataService.add('units', payload);

    setUnitModalOpen(false);
    setEditingUnit(null);
  };

  return (
    <div className="app-page page-enter" dir="rtl">
      <PageHeader
        title="Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±Ã˜Â§Ã˜Âª Ã™Ë†Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Âª"
        description="Ã˜Â¥Ã˜Â¯Ã˜Â§Ã˜Â±Ã˜Â© Ã˜ÂªÃ˜Â´Ã˜ÂºÃ™Å Ã™â€žÃ™Å Ã˜Â© Ã™â€¦Ã™Ë†Ã˜Â­Ã˜Â¯Ã˜Â© Ã™â€žÃ™â€¦Ã˜Â­Ã™ÂÃ˜Â¸Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±Ã˜Â§Ã˜Âª Ã™Ë†Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Âª Ã™â€¦Ã˜Â¹ Ã˜Â¹Ã˜Â±Ã˜Â¶ Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â´Ã˜ÂºÃ˜Â§Ã™â€žÃ˜Å’ Ã˜Â§Ã™â€žÃ˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©Ã˜Å’ Ã˜Â§Ã™â€žÃ˜Â¹Ã˜Â§Ã˜Â¦Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ™Ë†Ã™â€šÃ˜Â¹Ã˜Å’ Ã™Ë†Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â±Ã™Æ’Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â³Ã˜Â±Ã™Å Ã˜Â¹Ã˜Â©."
      >
        <button type="button" onClick={() => openCreateUnit()} className={`${actionButtonCls} ${ghostButtonCls}`}>
          <PlusCircle size={16} />
          Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã™Ë†Ã˜Â­Ã˜Â¯Ã˜Â©
        </button>
        <button type="button" onClick={openCreateProperty} className={`${actionButtonCls} ${primaryButtonCls}`}>
          <PlusCircle size={16} />
          Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã˜Â¹Ã™â€šÃ˜Â§Ã˜Â±
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryStatCard icon={<Building2 size={18} />} color="blue" title="Ã˜Â¥Ã˜Â¬Ã™â€¦Ã˜Â§Ã™â€žÃ™Å  Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±Ã˜Â§Ã˜Âª" value={totals.properties.toLocaleString('ar')} />
        <SummaryStatCard icon={<Layers3 size={18} />} color="slate" title="Ã˜Â¥Ã˜Â¬Ã™â€¦Ã˜Â§Ã™â€žÃ™Å  Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Âª" value={totals.units.toLocaleString('ar')} />
        <SummaryStatCard icon={<Home size={18} />} color="emerald" title="Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¤Ã˜Â¬Ã˜Â±Ã˜Â©" value={totals.rented.toLocaleString('ar')} subtext={`${totals.occupancyRate}% Ã˜Â¥Ã˜Â´Ã˜ÂºÃ˜Â§Ã™â€ž`} />
        <SummaryStatCard icon={<MapPin size={18} />} color="amber" title="Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â§Ã˜ÂºÃ˜Â±Ã˜Â©" value={totals.vacant.toLocaleString('ar')} />
        <SummaryStatCard icon={<Wrench size={18} />} color="rose" title="Ã™Ë†Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Âª Ã˜ÂªÃ˜Â­Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©" value={totals.maintenance.toLocaleString('ar')} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">Ã˜Â³Ã˜Â¬Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±Ã˜Â§Ã˜Âª Ã™Ë†Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Âª</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Ã˜Â§Ã™â€žÃ˜ÂµÃ™ÂÃ˜Â­Ã˜Â© Ã˜Â£Ã˜ÂµÃ˜Â¨Ã˜Â­Ã˜Âª Ã™â€¦Ã™â€¡Ã™Å Ã˜Â£Ã˜Â© Ã™â€žÃ™â€žÃ˜Â¥Ã˜Â¯Ã˜Â§Ã˜Â±Ã˜Â© Ã˜Â§Ã™â€žÃ™ÂÃ˜Â¹Ã™â€žÃ™Å Ã˜Â©: Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã™Ë†Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã™Ë†Ã™â€¦Ã˜ÂªÃ˜Â§Ã˜Â¨Ã˜Â¹Ã˜Â© Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â´Ã˜ÂºÃ˜Â§Ã™â€ž Ã˜Â¯Ã˜Â§Ã˜Â®Ã™â€ž Ã™â€ Ã™ÂÃ˜Â³ Ã˜ÂªÃ˜Â¯Ã™ÂÃ™â€š Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â´Ã˜ÂºÃ™Å Ã™â€ž.
                </p>
              </div>
              <div className="inline-flex rounded-[24px] border border-slate-200/80 bg-white/80 p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
                <button
                  type="button"
                  onClick={() => setViewMode('properties')}
                  className={`${tabButtonBase} ${
                    viewMode === 'properties'
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-transparent bg-transparent text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  Ã˜Â¹Ã˜Â±Ã˜Â¶ Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±Ã˜Â§Ã˜Âª
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('units')}
                  className={`${tabButtonBase} ${
                    viewMode === 'units'
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : 'border-transparent bg-transparent text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  Ã˜Â¹Ã˜Â±Ã˜Â¶ Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Âª
                </button>
              </div>
            </div>

            <SearchFilterBar
              value={searchTerm}
              onSearch={setSearchTerm}
              placeholder={viewMode === 'properties' ? 'Ã˜Â§Ã˜Â¨Ã˜Â­Ã˜Â« Ã˜Â¨Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â± Ã˜Â£Ã™Ë† Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’ Ã˜Â£Ã™Ë† Ã˜Â§Ã™â€žÃ™â€¦Ã™Ë†Ã™â€šÃ˜Â¹...' : 'Ã˜Â§Ã˜Â¨Ã˜Â­Ã˜Â« Ã˜Â¨Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â© Ã˜Â£Ã™Ë† Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â± Ã˜Â£Ã™Ë† Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±...'}
              rightSlot={
                <div className="flex flex-wrap items-center gap-2">
                  {viewMode === 'properties' ? (
                    <select className={inputCls} value={propertyTypeFilter} onChange={(event) => setPropertyTypeFilter(event.target.value)}>
                      <option value="ALL">Ã™Æ’Ã™â€ž Ã˜Â£Ã™â€ Ã™Ë†Ã˜Â§Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±Ã˜Â§Ã˜Âª</option>
                      {Object.entries(propertyTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select className={inputCls} value={unitStatusFilter} onChange={(event) => setUnitStatusFilter(event.target.value)}>
                      <option value="ALL">Ã™Æ’Ã™â€ž Ã˜Â­Ã˜Â§Ã™â€žÃ˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Âª</option>
                      <option value="VACANT">Ã˜Â´Ã˜Â§Ã˜ÂºÃ˜Â±Ã˜Â©</option>
                      <option value="RENTED">Ã™â€¦Ã˜Â¤Ã˜Â¬Ã˜Â±Ã˜Â©</option>
                      <option value="MAINTENANCE">Ã˜ÂªÃ˜Â­Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©</option>
                    </select>
                  )}
                </div>
              }
            />

            {viewMode === 'properties' ? (
              <TableWrapper>
                <thead className="bg-slate-50/80 dark:bg-slate-800/70">
                  <tr>
                    <Th>Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±</Th>
                    <Th>Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’</Th>
                    <Th>Ã˜Â§Ã™â€žÃ™â€¦Ã™Ë†Ã™â€šÃ˜Â¹</Th>
                    <Th>Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Âª</Th>
                    <Th>Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â´Ã˜ÂºÃ˜Â§Ã™â€ž</Th>
                    <Th>Ã˜Â§Ã™â€žÃ˜Â¹Ã˜Â§Ã˜Â¦Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ™Ë†Ã™â€šÃ˜Â¹</Th>
                    <Th className="text-left">Ã˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡Ã˜Â§Ã˜Âª</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredPropertyRows.map((row) => (
                    <Tr key={row.id} className={`${selectedProperty?.id === row.id ? 'bg-blue-50/60 dark:bg-blue-500/5' : ''} dark:hover:bg-slate-800/40`} onClick={() => setSelectedPropertyId(row.id)}>
                      <Td>
                        <div className="space-y-1">
                          <div className="font-bold text-slate-800 dark:text-slate-100">{row.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{displayPropertyType(row.propertyType)}</div>
                        </div>
                      </Td>
                      <Td className="text-slate-600 dark:text-slate-300">{row.ownerName}</Td>
                      <Td>
                        <div className="space-y-1 text-slate-600 dark:text-slate-300">
                          <div>{[row.district, row.city].filter(Boolean).join(' - ') || 'Ã˜ÂºÃ™Å Ã˜Â± Ã™â€¦Ã˜Â­Ã˜Â¯Ã˜Â¯'}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{row.address || 'Ã˜Â¨Ã˜Â¯Ã™Ë†Ã™â€  Ã˜Â¹Ã™â€ Ã™Ë†Ã˜Â§Ã™â€  Ã˜ÂªÃ™ÂÃ˜ÂµÃ™Å Ã™â€žÃ™Å '}</div>
                        </div>
                      </Td>
                      <Td className="font-semibold text-slate-700 dark:text-slate-200">{row.unitsCount.toLocaleString('ar')}</Td>
                      <Td>
                        <div className="space-y-2">
                          <StatusPill status={row.occupancyRate >= 80 ? 'ACTIVE' : row.occupancyRate >= 40 ? 'SUSPENDED' : 'ENDED'}>
                            {`${row.occupancyRate.toLocaleString('ar')}%`}
                          </StatusPill>
                          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(row.occupancyRate, 100)}%` }} />
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {`Ã™â€¦Ã˜Â¤Ã˜Â¬Ã˜Â±Ã˜Â© ${row.occupied.toLocaleString('ar')} Ã¢â‚¬Â¢ Ã˜Â´Ã˜Â§Ã˜ÂºÃ˜Â±Ã˜Â© ${row.vacant.toLocaleString('ar')} Ã¢â‚¬Â¢ Ã˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â© ${row.maintenance.toLocaleString('ar')}`}
                          </div>
                        </div>
                      </Td>
                      <Td className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(row.expectedRevenue, currency)}</Td>
                      <Td className="text-left">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button type="button" onClick={() => openCreateUnit(row.id)} className={`${actionButtonCls} ${ghostButtonCls} px-3 py-2 text-xs`}>
                            <PlusCircle size={14} />
                            Ã™Ë†Ã˜Â­Ã˜Â¯Ã˜Â©
                          </button>
                          <button type="button" onClick={() => openEditProperty(row)} className={`${actionButtonCls} ${ghostButtonCls} px-3 py-2 text-xs`}>
                            <PencilLine size={14} />
                            Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž
                          </button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrapper>
            ) : (
              <TableWrapper>
                <thead className="bg-slate-50/80 dark:bg-slate-800/70">
                  <tr>
                    <Th>Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â©</Th>
                    <Th>Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±</Th>
                    <Th>Ã˜Â§Ã™â€žÃ™â€ Ã™Ë†Ã˜Â¹</Th>
                    <Th>Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ˜Â©</Th>
                    <Th>Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â±</Th>
                    <Th>Ã˜Â§Ã™â€žÃ˜Â¥Ã™Å Ã˜Â¬Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ™Ë†Ã™â€šÃ˜Â¹</Th>
                    <Th className="text-left">Ã˜Â¥Ã˜Â¬Ã˜Â±Ã˜Â§Ã˜Â¡Ã˜Â§Ã˜Âª</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUnitRows.map((row) => (
                    <Tr key={row.id} className={`${selectedUnit?.id === row.id ? 'bg-blue-50/60 dark:bg-blue-500/5' : ''} dark:hover:bg-slate-800/40`} onClick={() => setSelectedUnitId(row.id)}>
                      <Td>
                        <div className="space-y-1">
                          <div className="font-bold text-slate-800 dark:text-slate-100">{row.displayName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {row.floor != null ? `Ã˜Â§Ã™â€žÃ˜Â¯Ã™Ë†Ã˜Â± ${row.floor.toLocaleString('ar')}` : 'Ã˜Â¨Ã˜Â¯Ã™Ë†Ã™â€  Ã˜Â¯Ã™Ë†Ã˜Â± Ã™â€¦Ã˜Â­Ã˜Â¯Ã˜Â¯'}
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <div className="space-y-1">
                          <div className="font-medium text-slate-700 dark:text-slate-200">{row.propertyName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{row.ownerName}</div>
                        </div>
                      </Td>
                      <Td className="text-slate-600 dark:text-slate-300">{displayUnitType(row.unitType)}</Td>
                      <Td>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeClass(row.status)}`}>
                          {displayUnitStatus(row.status)}
                        </span>
                      </Td>
                      <Td>
                        <div className="space-y-1">
                          <div className="text-slate-700 dark:text-slate-200">{row.tenantName}</div>
                          {row.balance > 0 ? (
                            <div className="text-xs font-semibold text-rose-600 dark:text-rose-300">Ã™â€¦Ã˜ÂªÃ˜Â£Ã˜Â®Ã˜Â±Ã˜Â§Ã˜Âª {formatCurrency(row.balance, currency)}</div>
                          ) : (
                            <div className="text-xs text-slate-500 dark:text-slate-400">Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã™â€¦Ã˜ÂªÃ˜Â£Ã˜Â®Ã˜Â±Ã˜Â§Ã˜Âª Ã˜Â­Ã˜Â§Ã™â€žÃ™Å Ã˜Â©</div>
                          )}
                        </div>
                      </Td>
                      <Td className="font-semibold text-slate-700 dark:text-slate-200">
                        {formatCurrency(Number(row.expectedRent || row.rentDefault || 0), currency)}
                      </Td>
                      <Td className="text-left">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button type="button" onClick={() => navigate('/contracts')} className={`${actionButtonCls} ${ghostButtonCls} px-3 py-2 text-xs`}>
                            Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ™Ë†Ã˜Â¯
                          </button>
                          <button type="button" onClick={() => openEditUnit(row)} className={`${actionButtonCls} ${ghostButtonCls} px-3 py-2 text-xs`}>
                            <PencilLine size={14} />
                            Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž
                          </button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrapper>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Ã™â€¦Ã™â€žÃ˜Â®Ã˜Âµ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â­Ã™ÂÃ˜Â¸Ã˜Â©</h3>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <div className="text-sm font-bold text-slate-500 dark:text-slate-400">Ã˜Â§Ã™â€žÃ˜Â¹Ã˜Â§Ã˜Â¦Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜Â´Ã™â€¡Ã˜Â±Ã™Å  Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ™Ë†Ã™â€šÃ˜Â¹</div>
                <div className="mt-2 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(totals.expectedRevenue, currency)}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                <div className="text-sm font-bold text-slate-500 dark:text-slate-400">Ã™â€¦Ã˜Â³Ã˜ÂªÃ™Ë†Ã™â€° Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â´Ã˜ÂºÃ˜Â§Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ™Å </div>
                <div className="mt-2 text-2xl font-extrabold text-slate-800 dark:text-slate-100">{`${totals.occupancyRate}%`}</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Ã˜ÂªÃ™Ë†Ã˜Â²Ã™Å Ã˜Â¹ Ã™â€ Ã™Ë†Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±</h3>
            <div className="mt-4 space-y-3">
              {propertyBreakdown.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{displayPropertyType(type)}</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{count.toLocaleString('ar')}</span>
                </div>
              ))}
              {!propertyBreakdown.length && <div className="text-sm text-slate-500 dark:text-slate-400">Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â¨Ã˜Â¹Ã˜Â¯.</div>}
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Ã˜ÂªÃ™Ë†Ã˜Â²Ã™Å Ã˜Â¹ Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¯Ã™â€ </h3>
            <div className="mt-4 space-y-3">
              {cityBreakdown.map(([city, count]) => (
                <div key={city} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{city}</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{count.toLocaleString('ar')}</span>
                </div>
              ))}
              {!cityBreakdown.length && <div className="text-sm text-slate-500 dark:text-slate-400">Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â¨Ã˜Â¹Ã˜Â¯.</div>}
            </div>
          </Card>

          {viewMode === 'properties' && selectedProperty && propertyWorkspace && (
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Ã™â€¦Ã˜Â³Ã˜Â§Ã˜Â­Ã˜Â© Ã˜Â¹Ã™â€¦Ã™â€ž Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedProperty.name}</p>
                </div>
                <button type="button" onClick={() => navigate('/reports?tab=properties')} className={`${actionButtonCls} ${ghostButtonCls} px-3 py-2 text-xs`}>
                  <Printer size={14} />
                  Ã˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â±
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70"><div className="text-xs text-slate-500">Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Âª</div><div className="mt-1 text-lg font-extrabold text-slate-800 dark:text-slate-100">{propertyWorkspace.units.length.toLocaleString('ar')}</div></div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70"><div className="text-xs text-slate-500">Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ™Ë†Ã˜Â¯</div><div className="mt-1 text-lg font-extrabold text-slate-800 dark:text-slate-100">{propertyWorkspace.contracts.length.toLocaleString('ar')}</div></div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70"><div className="text-xs text-slate-500">Ã˜Â§Ã™â€žÃ˜Â¯Ã™ÂÃ˜Â¹Ã˜Â§Ã˜Âª</div><div className="mt-1 text-lg font-extrabold text-slate-800 dark:text-slate-100">{propertyWorkspace.receipts.length.toLocaleString('ar')}</div></div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70"><div className="text-xs text-slate-500">Ã˜Â§Ã™â€žÃ˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â© Ã˜Â§Ã™â€žÃ™â€¦Ã™ÂÃ˜ÂªÃ™Ë†Ã˜Â­Ã˜Â©</div><div className="mt-1 text-lg font-extrabold text-slate-800 dark:text-slate-100">{propertyWorkspace.maintenance.filter((item) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(item.status)).length.toLocaleString('ar')}</div></div>
              </div>
              <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                <div><strong>Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’:</strong> {selectedProperty.ownerName}</div>
                <div><strong>Ã˜Â§Ã™â€žÃ˜Â¹Ã˜Â§Ã˜Â¦Ã˜Â¯ Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ™Ë†Ã™â€šÃ˜Â¹:</strong> {formatCurrency(selectedProperty.expectedRevenue, currency)}</div>
                <div><strong>Ã˜Â§Ã™â€žÃ˜Â¥Ã˜Â´Ã˜ÂºÃ˜Â§Ã™â€ž:</strong> {selectedProperty.occupancyRate.toLocaleString('ar')}%</div>
                <div><strong>Ã™â€¦Ã˜ÂµÃ˜Â±Ã™Ë†Ã™ÂÃ˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â§Ã˜Âª:</strong> {formatCurrency(propertyWorkspace.utilityExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0), currency)}</div>
                <div><strong>Ã˜Â¢Ã˜Â®Ã˜Â± Ã˜ÂªÃ™â€ Ã˜Â¨Ã™Å Ã™â€¡:</strong> {propertyWorkspace.maintenance.some((item) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(item.status)) ? 'Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â£Ã˜Â¹Ã™â€¦Ã˜Â§Ã™â€ž Ã˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â© Ã™â€¦Ã™ÂÃ˜ÂªÃ™Ë†Ã˜Â­Ã˜Â©' : 'Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜ÂªÃ™â€ Ã˜Â¨Ã™Å Ã™â€¡Ã˜Â§Ã˜Âª Ã˜Â­Ã˜Â±Ã˜Â¬Ã˜Â©'}</div>
              </div>
              <div className="mt-4">
                <div className="mb-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                  <div className="mb-3 text-sm font-extrabold text-slate-700 dark:text-slate-200">Ã˜ÂªÃ™â€ Ã˜Â¨Ã™Å Ã™â€¡Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±</div>
                  <div className="space-y-2">
                    {propertyWorkspace.invoices
                      .filter((invoice) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && new Date(invoice.dueDate).getTime() < Date.now())
                      .slice(0, 3)
                      .map((invoice) => (
                        <button key={invoice.id} type="button" onClick={() => navigate('/invoices')} className="flex w-full items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-right text-sm dark:bg-slate-900/70">
                          <span className="font-bold text-slate-800 dark:text-slate-100">{invoice.no || 'Ã™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â©'}</span>
                          <span className="text-xs text-rose-600 dark:text-rose-300">{formatCurrency(Number(invoice.amount || 0) + Number(invoice.taxAmount || 0), currency)}</span>
                        </button>
                      ))}
                    {propertyWorkspace.contracts
                      .filter((contract) => contract.status === 'ACTIVE')
                      .filter((contract) => {
                        const end = new Date(contract.end).getTime();
                        return end >= Date.now() && end - Date.now() <= 30 * 24 * 60 * 60 * 1000;
                      })
                      .slice(0, 2)
                      .map((contract) => (
                        <button key={contract.id} type="button" onClick={() => navigate('/contracts')} className="flex w-full items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-right text-sm dark:bg-slate-900/70">
                          <span className="font-bold text-slate-800 dark:text-slate-100">Ã˜Â¹Ã™â€šÃ˜Â¯ Ã™Å Ã™â€ Ã˜ÂªÃ™â€¡Ã™Å  Ã™â€šÃ˜Â±Ã™Å Ã˜Â¨Ã™â€¹Ã˜Â§</span>
                          <span className="text-xs text-amber-600 dark:text-amber-300">{formatDate(contract.end)}</span>
                        </button>
                      ))}
                    {!propertyWorkspace.invoices.some((invoice) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && new Date(invoice.dueDate).getTime() < Date.now()) &&
                      !propertyWorkspace.contracts.some((contract) => contract.status === 'ACTIVE' && new Date(contract.end).getTime() >= Date.now() && new Date(contract.end).getTime() - Date.now() <= 30 * 24 * 60 * 60 * 1000) && (
                        <div className="text-sm text-slate-500 dark:text-slate-400">Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜ÂªÃ™â€ Ã˜Â¨Ã™Å Ã™â€¡Ã˜Â§Ã˜Âª Ã˜ÂªÃ˜Â´Ã˜ÂºÃ™Å Ã™â€žÃ™Å Ã˜Â© Ã˜Â¹Ã™â€žÃ™â€° Ã™â€¡Ã˜Â°Ã˜Â§ Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±.</div>
                      )}
                  </div>
                </div>
                <AttachmentsManager entityType="PROPERTY" entityId={selectedProperty.id} />
              </div>
            </Card>
          )}

          {viewMode === 'units' && selectedUnit && unitWorkspace && (
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">Ã™â€¦Ã˜Â³Ã˜Â§Ã˜Â­Ã˜Â© Ã˜Â¹Ã™â€¦Ã™â€ž Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â©</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedUnit.displayName} - {selectedUnit.propertyName}</p>
                </div>
                <button type="button" onClick={() => navigate('/reports?tab=occupancy')} className={`${actionButtonCls} ${ghostButtonCls} px-3 py-2 text-xs`}>
                  <Printer size={14} />
                  Ã˜ÂªÃ™â€šÃ˜Â±Ã™Å Ã˜Â± Ã˜Â¥Ã˜Â´Ã˜ÂºÃ˜Â§Ã™â€ž
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70"><div className="text-xs text-slate-500">Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ˜Â©</div><div className="mt-1 text-lg font-extrabold text-slate-800 dark:text-slate-100">{displayUnitStatus(selectedUnit.status)}</div></div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70"><div className="text-xs text-slate-500">Ã˜Â§Ã™â€žÃ˜Â±Ã˜ÂµÃ™Å Ã˜Â¯</div><div className="mt-1 text-lg font-extrabold text-slate-800 dark:text-slate-100">{formatCurrency(selectedUnit.balance, currency)}</div></div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70"><div className="text-xs text-slate-500">Ã˜Â§Ã™â€žÃ™ÂÃ™Ë†Ã˜Â§Ã˜ÂªÃ™Å Ã˜Â±</div><div className="mt-1 text-lg font-extrabold text-slate-800 dark:text-slate-100">{unitWorkspace.invoices.length.toLocaleString('ar')}</div></div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70"><div className="text-xs text-slate-500">Ã˜Â§Ã™â€žÃ˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©</div><div className="mt-1 text-lg font-extrabold text-slate-800 dark:text-slate-100">{unitWorkspace.maintenance.filter((item) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(item.status)).length.toLocaleString('ar')}</div></div>
              </div>
              <div className="mt-4 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                <div><strong>Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜ÂªÃ˜Â£Ã˜Â¬Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ™Å :</strong> {selectedUnit.tenantName}</div>
                <div><strong>Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â¯:</strong> {unitWorkspace.contract ? `${formatDate(unitWorkspace.contract.start)} - ${formatDate(unitWorkspace.contract.end)}` : 'Ã™â€žÃ˜Â§ Ã™Å Ã™Ë†Ã˜Â¬Ã˜Â¯ Ã˜Â¹Ã™â€šÃ˜Â¯ Ã™â€ Ã˜Â´Ã˜Â·'}</div>
                <div><strong>Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â¯Ã™â€¦Ã˜Â§Ã˜Âª:</strong> {formatCurrency(unitWorkspace.utilityExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0), currency)}</div>
                <div><strong>Ã˜Â§Ã™â€žÃ˜ÂªÃ™â€ Ã˜Â¨Ã™Å Ã™â€¡:</strong> {unitWorkspace.invoices.some((item) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(item.status) && new Date(item.dueDate).getTime() < Date.now()) ? 'Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã™â€¦Ã˜ÂªÃ˜Â£Ã˜Â®Ã˜Â±Ã˜Â§Ã˜Âª Ã˜Â¹Ã™â€žÃ™â€° Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â©' : 'Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã™â€¦Ã˜ÂªÃ˜Â£Ã˜Â®Ã˜Â±Ã˜Â§Ã˜Âª Ã˜Â­Ã˜Â§Ã™â€žÃ™Å Ã˜Â©'}</div>
              </div>
              <div className="mt-4">
                <div className="mb-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
                  <div className="mb-3 text-sm font-extrabold text-slate-700 dark:text-slate-200">Ã˜ÂªÃ™â€ Ã˜Â¨Ã™Å Ã™â€¡Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â©</div>
                  <div className="space-y-2">
                    {unitWorkspace.invoices
                      .filter((invoice) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && new Date(invoice.dueDate).getTime() < Date.now())
                      .slice(0, 2)
                      .map((invoice) => (
                        <button key={invoice.id} type="button" onClick={() => navigate('/invoices')} className="flex w-full items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-right text-sm dark:bg-slate-900/70">
                          <span className="font-bold text-slate-800 dark:text-slate-100">{invoice.no || 'Ã™ÂÃ˜Â§Ã˜ÂªÃ™Ë†Ã˜Â±Ã˜Â©'}</span>
                          <span className="text-xs text-rose-600 dark:text-rose-300">{formatCurrency(Number(invoice.amount || 0) + Number(invoice.taxAmount || 0), currency)}</span>
                        </button>
                      ))}
                    {unitWorkspace.maintenance
                      .filter((record) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(record.status))
                      .slice(0, 2)
                      .map((record) => (
                        <button key={record.id} type="button" onClick={() => navigate('/maintenance')} className="flex w-full items-center justify-between rounded-xl bg-white/80 px-3 py-2 text-right text-sm dark:bg-slate-900/70">
                          <span className="font-bold text-slate-800 dark:text-slate-100">{record.issueTitle || record.description || 'Ã˜Â·Ã™â€žÃ˜Â¨ Ã˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©'}</span>
                          <span className="text-xs text-amber-600 dark:text-amber-300">{record.status}</span>
                        </button>
                      ))}
                    {!unitWorkspace.invoices.some((invoice) => ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && new Date(invoice.dueDate).getTime() < Date.now()) &&
                      !unitWorkspace.maintenance.some((record) => ['NEW', 'OPEN', 'IN_PROGRESS'].includes(record.status)) && (
                        <div className="text-sm text-slate-500 dark:text-slate-400">Ã™â€žÃ˜Â§ Ã˜ÂªÃ™Ë†Ã˜Â¬Ã˜Â¯ Ã˜ÂªÃ™â€ Ã˜Â¨Ã™Å Ã™â€¡Ã˜Â§Ã˜Âª Ã˜ÂªÃ˜Â´Ã˜ÂºÃ™Å Ã™â€žÃ™Å Ã˜Â© Ã˜Â¹Ã™â€žÃ™â€° Ã™â€¡Ã˜Â°Ã™â€¡ Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â©.</div>
                      )}
                  </div>
                </div>
                <AttachmentsManager entityType="UNIT" entityId={selectedUnit.id} />
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal isOpen={propertyModalOpen} onClose={() => setPropertyModalOpen(false)} title={editingProperty ? 'Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±' : 'Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã˜Â¹Ã™â€šÃ˜Â§Ã˜Â± Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯'} size="lg">
        <form className="space-y-5" onSubmit={handlePropertySubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>Ã˜Â§Ã˜Â³Ã™â€¦ Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±</label>
              <input className={inputCls} value={propertyForm.name} onChange={(event) => setPropertyForm((current) => ({ ...current, name: event.target.value }))} required />
            </div>
            <div>
              <label className={labelCls}>Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’</label>
              <select className={inputCls} value={propertyForm.ownerId} onChange={(event) => setPropertyForm((current) => ({ ...current, ownerId: event.target.value }))} required>
                <option value="">Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â§Ã™â€žÃ™Æ’</option>
                {db.owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Ã™â€ Ã™Ë†Ã˜Â¹ Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±</label>
              <select className={inputCls} value={propertyForm.propertyType} onChange={(event) => setPropertyForm((current) => ({ ...current, propertyType: event.target.value as Property['propertyType'] }))}>
                {Object.entries(propertyTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Ã˜Â¥Ã˜Â¬Ã™â€¦Ã˜Â§Ã™â€žÃ™Å  Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â§Ã˜Âª</label>
              <input className={inputCls} type="number" min="0" value={propertyForm.totalUnits} onChange={(event) => setPropertyForm((current) => ({ ...current, totalUnits: event.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â¯Ã™Å Ã™â€ Ã˜Â©</label>
              <input className={inputCls} value={propertyForm.city} onChange={(event) => setPropertyForm((current) => ({ ...current, city: event.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Ã˜Â§Ã™â€žÃ˜Â­Ã™Å  / Ã˜Â§Ã™â€žÃ™â€¦Ã™â€ Ã˜Â·Ã™â€šÃ˜Â©</label>
              <input className={inputCls} value={propertyForm.district} onChange={(event) => setPropertyForm((current) => ({ ...current, district: event.target.value }))} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€ Ã™Ë†Ã˜Â§Ã™â€ </label>
            <input className={inputCls} value={propertyForm.address} onChange={(event) => setPropertyForm((current) => ({ ...current, address: event.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Ã˜Â§Ã™â€žÃ™Ë†Ã˜ÂµÃ™Â</label>
            <textarea className={`${inputCls} min-h-[110px]`} value={propertyForm.description} onChange={(event) => setPropertyForm((current) => ({ ...current, description: event.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" onClick={() => setPropertyModalOpen(false)} className={`${actionButtonCls} ${ghostButtonCls}`}>
              Ã˜Â¥Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â¡
            </button>
            <button type="submit" className={`${actionButtonCls} ${primaryButtonCls}`}>
              {editingProperty ? 'Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€žÃ˜Â§Ã˜Âª' : 'Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={unitModalOpen} onClose={() => setUnitModalOpen(false)} title={editingUnit ? 'Ã˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€ž Ã˜Â¨Ã™Å Ã˜Â§Ã™â€ Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â©' : 'Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã™Ë†Ã˜Â­Ã˜Â¯Ã˜Â© Ã˜Â¬Ã˜Â¯Ã™Å Ã˜Â¯Ã˜Â©'} size="lg">
        <form className="space-y-5" onSubmit={handleUnitSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±</label>
              <select className={inputCls} value={unitForm.propertyId} onChange={(event) => setUnitForm((current) => ({ ...current, propertyId: event.target.value }))} required>
                <option value="">Ã˜Â§Ã˜Â®Ã˜ÂªÃ˜Â± Ã˜Â§Ã™â€žÃ˜Â¹Ã™â€šÃ˜Â§Ã˜Â±</option>
                {db.properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Ã˜Â±Ã™â€šÃ™â€¦ Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â©</label>
              <input className={inputCls} value={unitForm.unitNumber} onChange={(event) => setUnitForm((current) => ({ ...current, unitNumber: event.target.value }))} required />
            </div>
            <div>
              <label className={labelCls}>Ã™â€ Ã™Ë†Ã˜Â¹ Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â©</label>
              <select className={inputCls} value={unitForm.unitType} onChange={(event) => setUnitForm((current) => ({ ...current, unitType: event.target.value as Unit['unitType'] }))}>
                {Object.entries(unitTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Ã˜Â§Ã™â€žÃ˜Â­Ã˜Â§Ã™â€žÃ˜Â©</label>
              <select className={inputCls} value={unitForm.status} onChange={(event) => setUnitForm((current) => ({ ...current, status: event.target.value as Unit['status'] }))}>
                <option value="VACANT">Ã˜Â´Ã˜Â§Ã˜ÂºÃ˜Â±Ã˜Â©</option>
                <option value="RENTED">Ã™â€¦Ã˜Â¤Ã˜Â¬Ã˜Â±Ã˜Â©</option>
                <option value="MAINTENANCE">Ã˜ÂªÃ˜Â­Ã˜Âª Ã˜Â§Ã™â€žÃ˜ÂµÃ™Å Ã˜Â§Ã™â€ Ã˜Â©</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Ã˜Â§Ã™â€žÃ˜Â¯Ã™Ë†Ã˜Â±</label>
              <input className={inputCls} type="number" value={unitForm.floor} onChange={(event) => setUnitForm((current) => ({ ...current, floor: event.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Ã˜Â§Ã™â€žÃ™â€¦Ã˜Â³Ã˜Â§Ã˜Â­Ã˜Â© Ã˜Â¨Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ˜Â±</label>
              <input className={inputCls} type="number" min="0" step="0.1" value={unitForm.areaSqm} onChange={(event) => setUnitForm((current) => ({ ...current, areaSqm: event.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Ã˜Â¹Ã˜Â¯Ã˜Â¯ Ã˜Â§Ã™â€žÃ˜ÂºÃ˜Â±Ã™Â</label>
              <input className={inputCls} type="number" min="0" value={unitForm.roomsCount} onChange={(event) => setUnitForm((current) => ({ ...current, roomsCount: event.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Ã˜Â¹Ã˜Â¯Ã˜Â¯ Ã˜Â¯Ã™Ë†Ã˜Â±Ã˜Â§Ã˜Âª Ã˜Â§Ã™â€žÃ™â€¦Ã™Å Ã˜Â§Ã™â€¡</label>
              <input className={inputCls} type="number" min="0" value={unitForm.bathroomsCount} onChange={(event) => setUnitForm((current) => ({ ...current, bathroomsCount: event.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Ã˜Â§Ã™â€žÃ˜Â¥Ã™Å Ã˜Â¬Ã˜Â§Ã˜Â± Ã˜Â§Ã™â€žÃ™â€¦Ã˜ÂªÃ™Ë†Ã™â€šÃ˜Â¹</label>
              <input className={inputCls} type="number" min="0" step="0.001" value={unitForm.expectedRent} onChange={(event) => setUnitForm((current) => ({ ...current, expectedRent: event.target.value }))} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Ã™â€¦Ã™â€žÃ˜Â§Ã˜Â­Ã˜Â¸Ã˜Â§Ã˜Âª</label>
            <textarea className={`${inputCls} min-h-[110px]`} value={unitForm.notes} onChange={(event) => setUnitForm((current) => ({ ...current, notes: event.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" onClick={() => setUnitModalOpen(false)} className={`${actionButtonCls} ${ghostButtonCls}`}>
              Ã˜Â¥Ã™â€žÃ˜ÂºÃ˜Â§Ã˜Â¡
            </button>
            <button type="submit" className={`${actionButtonCls} ${primaryButtonCls}`}>
              {editingUnit ? 'Ã˜Â­Ã™ÂÃ˜Â¸ Ã˜Â§Ã™â€žÃ˜ÂªÃ˜Â¹Ã˜Â¯Ã™Å Ã™â€žÃ˜Â§Ã˜Âª' : 'Ã˜Â¥Ã˜Â¶Ã˜Â§Ã™ÂÃ˜Â© Ã˜Â§Ã™â€žÃ™Ë†Ã˜Â­Ã˜Â¯Ã˜Â©'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PropertiesAndUnits;
