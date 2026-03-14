import { toast } from 'react-hot-toast';
import { Database, Expense, OwnerSettlement, Settings, User } from '../types';
import { supabase } from './db';

const STATIC_ID = 1;

type MutationOptions = {
  silent?: boolean;
};

const toErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const audit = async (
  user: User | null | undefined,
  action: string,
  entity: string,
  entityId: string,
  note = '',
) => {
  if (!user) return;

  await supabase.from('audit_log').insert({
    ts: Date.now(),
    user_id: user.id,
    username: user.username,
    action,
    entity,
    entity_id: entityId,
    note,
  });
};

const toSnakeCase = (obj: any) => {
  if (!obj) return obj;

  const next: Record<string, any> = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    next[snakeKey] = obj[key];
  }

  return next;
};

const add = async <T extends keyof Database>(
  table: T,
  entry: Omit<any, 'id' | 'createdAt' | 'no'>,
  user: User | null | undefined,
  settings: Settings,
  options: MutationOptions = {},
): Promise<any> => {
  if (table === 'receipts') {
    throw new Error('استخدم financeService.addReceiptWithAllocations لإنشاء سندات القبض لضمان مسار محاسبي موحد.');
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  const finalEntry: any = { ...entry, id, created_at: now };

  const { data: governance } = await supabase.from('governance').select('*').eq('id', STATIC_ID).single();
  const lockDate = governance?.financial_lock_date ? new Date(governance.financial_lock_date) : null;
  const entryDateStr = finalEntry.date || finalEntry.dateTime || finalEntry.dueDate || new Date().toISOString().slice(0, 10);
  const entryDate = new Date(String(entryDateStr).slice(0, 10));

  if (
    lockDate &&
    entryDate <= lockDate &&
    ['receipts', 'expenses', 'ownerSettlements', 'journalEntries', 'invoices', 'depositTxs'].includes(String(table))
  ) {
    throw new Error(`الفترة المالية مغلقة حتى تاريخ ${lockDate.toLocaleDateString()}. لا يمكن تسجيل حركات جديدة.`);
  }

  const serialKeys: Record<string, string> = {
    expenses: 'expense',
    invoices: 'invoice',
    ownerSettlements: 'owner_settlement',
    maintenanceRecords: 'maintenance',
    leads: 'lead',
    missions: 'mission',
  };
  const serialKey = serialKeys[String(table)];

  if (serialKey) {
    const { data: serials } = await supabase.from('serials').select('*').eq('id', STATIC_ID).single();
    if (serials) {
      serials[serialKey] += 1;
      finalEntry.no = String(serials[serialKey]);
      await supabase.from('serials').update({ [serialKey]: serials[serialKey] }).eq('id', STATIC_ID);
    }
  }

  const payload = toSnakeCase(finalEntry);
  if (table === 'receiptAllocations') payload.receipt_id = finalEntry.receiptId;

  const tableName = String(table).replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

  try {
    const { error } = await supabase.from(tableName).insert(payload);
    if (error) throw error;

    await audit(user, 'CREATE', String(table), id);

    const mappings = settings.accountMappings;
    if (table === 'expenses') {
      const expense = finalEntry as Expense;
      const paymentAccount = mappings.paymentMethods.CASH;
      if (expense.chargedTo === 'OWNER') {
        await postJournalEntrySupabase({
          dr: mappings.ownersPayable,
          cr: paymentAccount,
          amount: expense.amount,
          ref: expense.id,
          date: expense.dateTime,
        });
      } else if (expense.chargedTo === 'OFFICE') {
        const expenseAccount = mappings.expenseCategories[expense.category] || mappings.expenseCategories.default;
        await postJournalEntrySupabase({
          dr: expenseAccount,
          cr: paymentAccount,
          amount: expense.amount,
          ref: expense.id,
          date: expense.dateTime,
        });
      }
    } else if (table === 'ownerSettlements') {
      const settlement = finalEntry as OwnerSettlement;
      const paymentAccount = mappings.paymentMethods[settlement.method === 'CASH' ? 'CASH' : 'BANK'];
      await postJournalEntrySupabase({
        dr: mappings.ownersPayable,
        cr: paymentAccount,
        amount: settlement.amount,
        ref: settlement.id,
        date: settlement.date,
      });
    }

    if (!options.silent) {
      toast.success('تم حفظ السجل بنجاح.');
    }

    return finalEntry;
  } catch (error) {
    console.error('ERP Transaction Error:', error);
    await supabase.from(tableName).delete().eq('id', id);
    if (!options.silent) {
      toast.error(toErrorMessage(error, 'حدث خطأ أثناء حفظ السجل.'));
    }
    throw error;
  }
};

const update = async <T extends keyof Database>(
  table: T,
  id: string,
  updates: Partial<any>,
  user: User | null | undefined,
  options: MutationOptions = {},
): Promise<void> => {
  const tableName = String(table).replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  const payload = toSnakeCase({ ...updates, updatedAt: Date.now() });

  try {
    const { error } = await supabase.from(tableName).update(payload).eq('id', id);
    if (error) throw error;

    await audit(user, 'UPDATE', String(table), id);
    if (!options.silent) {
      toast.success('تم تحديث السجل.');
    }
  } catch (error) {
    if (!options.silent) {
      toast.error(toErrorMessage(error, 'فشل تحديث السجل.'));
    }
    throw error;
  }
};

const remove = async <T extends keyof Database>(
  table: T,
  id: string,
  user: User | null | undefined,
  options: MutationOptions = {},
): Promise<void> => {
  const tableName = String(table).replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

  try {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;

    await audit(user, 'DELETE', String(table), id);
    if (!options.silent) {
      toast.success('تم حذف السجل.');
    }
  } catch (error) {
    if (!options.silent) {
      toast.error(toErrorMessage(error, 'حدث خطأ أثناء حذف السجل.'));
    }
    throw error;
  }
};

export const postJournalEntrySupabase = async ({ dr, cr, amount, ref, entityType, entityId, date }: any) => {
  const { data: serials } = await supabase.from('serials').select('journal_entry').eq('id', STATIC_ID).single();
  const entryNo = String((serials?.journal_entry || 1000) + 1);

  await supabase.from('serials').update({ journal_entry: Number(entryNo) }).eq('id', STATIC_ID);

  const postingDate = date || new Date().toISOString().slice(0, 10);
  const ts = Date.now();

  const debit = {
    id: crypto.randomUUID(),
    no: entryNo,
    date: postingDate,
    account_id: dr,
    amount,
    type: 'DEBIT',
    source_id: ref,
    created_at: ts,
    entity_type: entityType,
    entity_id: entityId,
  };

  const credit = {
    id: crypto.randomUUID(),
    no: entryNo,
    date: postingDate,
    account_id: cr,
    amount,
    type: 'CREDIT',
    source_id: ref,
    created_at: ts,
    entity_type: entityType,
    entity_id: entityId,
  };

  await supabase.from('journal_entries').insert([debit, credit]);
};

export const dataService = { add, update, remove, audit };
