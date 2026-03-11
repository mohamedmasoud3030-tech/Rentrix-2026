
import { supabase } from './db';
import { toast } from 'react-hot-toast';
import { Database, User, Settings, Receipt, Expense, OwnerSettlement } from '../types';

const STATIC_ID = 1;

const audit = async (user: User | null | undefined, action: string, entity: string, entityId: string, note: string = '') => {
    if (!user) return;
    await supabase.from('audit_log').insert({
        ts: Date.now(),
        user_id: user.id,
        username: user.username,
        action,
        entity,
        entity_id: entityId,
        note
    });
};

const toSnakeCase = (obj: any) => {
    if (!obj) return obj;
    const newObj: any = {};
    for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        newObj[snakeKey] = obj[key];
    }
    return newObj;
};

const add = async <T extends keyof Database>(
    table: T,
    entry: Omit<any, 'id' | 'createdAt' | 'no'>,
    user: User | null | undefined,
    settings: Settings
): Promise<any | null> => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const finalEntry: any = { ...entry, id, created_at: now };
    
    try {
        const { data: governance } = await supabase.from('governance').select('*').eq('id', STATIC_ID).single();
        const lockDate = governance?.financial_lock_date ? new Date(governance.financial_lock_date) : null;
        
        const entryDateStr = finalEntry.date || finalEntry.dateTime || finalEntry.dueDate || new Date().toISOString().slice(0, 10);
        const entryDate = new Date(entryDateStr.slice(0,10));

        if (lockDate && entryDate <= lockDate) {
            if (['receipts', 'expenses', 'ownerSettlements', 'journalEntries', 'invoices', 'depositTxs'].includes(table as string)) {
                throw new Error(`الفترة المالية مغلقة حتى تاريخ ${lockDate.toLocaleDateString()}. لا يمكن تسجيل حركات جديدة.`);
            }
        }

        const serialKeys: any = { receipts: 'receipt', expenses: 'expense', invoices: 'invoice', ownerSettlements: 'owner_settlement', maintenanceRecords: 'maintenance', leads: 'lead', missions: 'mission' };
        const sKey = serialKeys[table];
        if (sKey) {
            const { data: s } = await supabase.from('serials').select('*').eq('id', STATIC_ID).single();
            if (s) { 
                s[sKey]++; 
                finalEntry.no = String(s[sKey]); 
                await supabase.from('serials').update({ [sKey]: s[sKey] }).eq('id', STATIC_ID); 
            }
        }
        
        const payload = toSnakeCase(finalEntry);
        if (table === 'receiptAllocations') payload.receipt_id = finalEntry.receiptId;
        
        const tableName = String(table).replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        
        const { error } = await supabase.from(tableName).insert(payload);
        if (error) throw error;
        
        await audit(user, 'CREATE', String(table), id);
        
        const m = settings.accountMappings;
        if (table === 'receipts') {
            const r = finalEntry as Receipt;
            await postJournalEntrySupabase({ dr: m.paymentMethods[r.channel], cr: m.accountsReceivable, amount: r.amount, ref: r.id, entityType: 'CONTRACT', entityId: r.contractId, date: r.dateTime });
            await postJournalEntrySupabase({ dr: m.accountsReceivable, cr: m.ownersPayable, amount: r.amount, ref: r.id, entityType: 'CONTRACT', entityId: r.contractId, date: r.dateTime });

            const { data: contract } = await supabase.from('contracts').select('unit_id').eq('id', r.contractId).single();
            if (contract) {
                const { data: unit } = await supabase.from('units').select('property_id').eq('id', contract.unit_id).single();
                const { data: property } = unit ? await supabase.from('properties').select('owner_id').eq('id', unit.property_id).single() : { data: null };
                const { data: owner } = property ? await supabase.from('owners').select('*').eq('id', property.owner_id).single() : { data: null };
                
                if (owner && owner.commission_value > 0) {
                    let comm = 0;
                    if (owner.commission_type === 'RATE') comm = (r.amount * owner.commission_value) / 100;
                    else comm = owner.commission_value;

                    if (comm > 0) {
                        await postJournalEntrySupabase({ dr: m.ownersPayable, cr: m.revenue.OFFICE_COMMISSION, amount: comm, ref: r.id, date: r.dateTime });
                    }
                }
            }
        } else if (table === 'expenses') {
            const e = finalEntry as Expense;
            const payAcc = m.paymentMethods.CASH;
            if (e.chargedTo === 'OWNER') {
                await postJournalEntrySupabase({ dr: m.ownersPayable, cr: payAcc, amount: e.amount, ref: e.id, date: e.dateTime });
            } else if (e.chargedTo === 'OFFICE') {
                const expAcc = m.expenseCategories[e.category] || m.expenseCategories.default;
                await postJournalEntrySupabase({ dr: expAcc, cr: payAcc, amount: e.amount, ref: e.id, date: e.dateTime });
            }
        } else if (table === 'ownerSettlements') {
            const s = finalEntry as OwnerSettlement;
            const payAcc = m.paymentMethods[s.method === 'CASH' ? 'CASH' : 'BANK'];
            await postJournalEntrySupabase({ dr: m.ownersPayable, cr: payAcc, amount: s.amount, ref: s.id, date: s.date });
        }
        
        return finalEntry;
    } catch (error) {
        console.error("ERP Transaction Error:", error);
        toast.error(error instanceof Error ? error.message : 'خطأ في المعالجة المالية.');
        return null;
    }
};

const update = async <T extends keyof Database>(table: T, id: string, updates: Partial<any>, user: User | null | undefined): Promise<void> => {
    try {
        const tableName = String(table).replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        const payload = toSnakeCase({ ...updates, updatedAt: Date.now() });
        const { error } = await supabase.from(tableName).update(payload).eq('id', id);
        if (error) throw error;
        await audit(user, 'UPDATE', String(table), id);
        toast.success('تم تحديث السجل.');
    } catch(error) { toast.error('فشل التحديث.'); }
};

const remove = async <T extends keyof Database>(table: T, id: string, user: User | null | undefined): Promise<void> => {
    if (window.confirm('لا يمكن التراجع عن عملية الحذف. هل أنت متأكد؟')) {
        try {
            const tableName = String(table).replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            const { error } = await supabase.from(tableName).delete().eq('id', id);
            if (error) throw error;
            await audit(user, 'DELETE', String(table), id);
            toast.success('تم الحذف وتحديث الأرصدة.');
        } catch (error) { toast.error('حدث خطأ أثناء الحذف.'); }
    }
};

export const postJournalEntrySupabase = async ({ dr, cr, amount, ref, entityType, entityId, date }: any) => {
    const { data: s } = await supabase.from('serials').select('journal_entry').eq('id', STATIC_ID).single();
    const entryNo = String((s?.journal_entry || 1000) + 1);
    await supabase.from('serials').update({ journal_entry: Number(entryNo) }).eq('id', STATIC_ID);

    const now = date || new Date().toISOString().slice(0, 10);
    const ts = Date.now();

    const debit = { id: crypto.randomUUID(), no: entryNo, date: now, account_id: dr, amount, type: 'DEBIT', source_id: ref, created_at: ts, entity_type: entityType, entity_id: entityId };
    const credit = { id: crypto.randomUUID(), no: entryNo, date: now, account_id: cr, amount, type: 'CREDIT', source_id: ref, created_at: ts, entity_type: entityType, entity_id: entityId };
    
    await supabase.from('journal_entries').insert([debit, credit]);
};

export const dataService = { add, update, remove, audit };
