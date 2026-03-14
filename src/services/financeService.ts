
import { supabase } from './db';
import { toast } from 'react-hot-toast';
import { Database, JournalEntry, Receipt, Invoice, User, Settings, Commission } from '../types';
import { dataService, postJournalEntrySupabase } from './dataService';

const STATIC_ID = 1;

const createReversingJE = async (sourceId: string) => {
    const { data: entries } = await supabase.from('journal_entries').select('*').eq('source_id', sourceId);
    if (!entries || entries.length === 0) return;
    
    const { data: governance } = await supabase.from('governance').select('*').eq('id', STATIC_ID).single();
    const lockDate = governance?.financial_lock_date ? new Date(governance.financial_lock_date) : null;
    const today = new Date();

    if (lockDate && today <= lockDate) {
        throw new Error(`لا يمكن الإلغاء لأن الفترة المالية الحالية مقفلة.`);
    }

    const reversalDate = today.toISOString().slice(0, 10);

    const groups = entries.reduce((acc: any, entry: any) => {
        if (!acc[entry.no]) acc[entry.no] = [];
        acc[entry.no].push(entry);
        return acc;
    }, {});

    for (const entryNo in groups) {
        const group = groups[entryNo];
        const debit = group.find((e: any) => e.type === 'DEBIT');
        const credit = group.find((e: any) => e.type === 'CREDIT');
        
        if (debit && credit) {
            await postJournalEntrySupabase({ 
                dr: credit.account_id, 
                cr: debit.account_id, 
                amount: debit.amount, 
                ref: `${sourceId}-VOID`,
                date: reversalDate
            });
        }
    }
};

const voidReceipt = async (id: string, user: User | null | undefined): Promise<void> => {
    try {
        const { data: receipt } = await supabase.from('receipts').select('*').eq('id', id).single();
        if (!receipt || receipt.status === 'VOID') return;
        
        await createReversingJE(id);

        await supabase.from('receipts').update({ status: 'VOID', voided_at: Date.now() }).eq('id', id);
        await dataService.audit(user, 'VOID', 'receipts', id, `إلغاء سند القبض رقم ${receipt.no}`);
        
        const { data: allocations } = await supabase.from('receipt_allocations').select('*').eq('receipt_id', id);
        if (allocations && allocations.length > 0) {
            for (const allocation of allocations) {
                const { data: invoice } = await supabase.from('invoices').select('*').eq('id', allocation.invoice_id).single();
                if (invoice) {
                    const newPaidAmount = Math.max(0, invoice.paid_amount - allocation.amount);
                    const newStatus = newPaidAmount <= 0.001 ? (new Date(invoice.due_date) < new Date() ? 'OVERDUE' : 'UNPAID') : 'PARTIALLY_PAID';
                    await supabase.from('invoices').update({ paid_amount: newPaidAmount, status: newStatus }).eq('id', invoice.id);
                }
            }
            await supabase.from('receipt_allocations').delete().eq('receipt_id', id);
        }
        toast.success('تم إلغاء السند وتحديث القيود المحاسبية.');
    } catch (e: any) {
        toast.error(e.message || "فشل إلغاء السند.");
        throw e;
    }
};

const voidExpense = async (id: string, user: User | null | undefined): Promise<void> => {
    try {
        await createReversingJE(id);
        await supabase.from('expenses').update({ status: 'VOID', voided_at: Date.now() }).eq('id', id);
        await dataService.audit(user, 'VOID', 'expenses', id);
        toast.success('تم إلغاء المصروف.');
    } catch (e: any) { 
        toast.error(e.message || "فشل الإلغاء."); 
        throw e;
    }
};

const voidInvoice = async (id: string, user: User | null | undefined): Promise<void> => {
    try {
        const { data: invoice } = await supabase.from('invoices').select('*').eq('id', id).single();
        if (!invoice) return;
        if (invoice.paid_amount > 0) {
            throw new Error("لا يمكن إلغاء فاتورة مسددة جزئياً. قم بإلغاء السندات أولاً.");
        }
        await createReversingJE(id);
        await supabase.from('invoices').update({ status: 'VOID', voided_at: Date.now() }).eq('id', id);
        await dataService.audit(user, 'VOID', 'invoices', id);
        toast.success('تم إلغاء الفاتورة.');
    } catch (e: any) { 
        toast.error(e.message || "فشل إلغاء الفاتورة."); 
        throw e;
    }
};

const addReceiptWithAllocations = async (
    receiptData: Omit<Receipt, 'id' | 'createdAt' | 'no' | 'status'>,
    allocations: { invoiceId: string; amount: number }[],
    user: User | null | undefined,
    settings: Settings
): Promise<void> => {
    let receiptId: string | null = null;
    let receiptNo: string | null = null;
    let serialBefore: number | null = null;
    const revertedInvoices: Array<{ id: string; paid_amount: number; status: string }> = [];
    const allocationIds: string[] = [];

    try {
        const { data: governance } = await supabase.from('governance').select('*').eq('id', STATIC_ID).single();
        const lockDate = governance?.financial_lock_date ? new Date(governance.financial_lock_date) : null;
        const entryDate = new Date(receiptData.dateTime.slice(0, 10));
        if (lockDate && entryDate <= lockDate) {
            throw new Error(`الفترة المالية مغلقة حتى تاريخ ${lockDate.toLocaleDateString()}.`);
        }
        
        const { data: s } = await supabase.from('serials').select('receipt').eq('id', STATIC_ID).single();
        serialBefore = s?.receipt ?? 1000;
        receiptNo = String(serialBefore + 1);
        await supabase.from('serials').update({ receipt: Number(receiptNo) }).eq('id', STATIC_ID);
        
        receiptId = crypto.randomUUID();
        const newReceipt = { ...receiptData, id: receiptId, created_at: Date.now(), no: receiptNo, status: 'POSTED' };
        
        const payload = {
            id: newReceipt.id,
            no: newReceipt.no,
            contract_id: newReceipt.contractId,
            date_time: newReceipt.dateTime,
            status: newReceipt.status,
            amount: newReceipt.amount,
            channel: newReceipt.channel,
            ref: newReceipt.ref,
            notes: newReceipt.notes,
            created_at: newReceipt.created_at
        };
        
        const { error: receiptError } = await supabase.from('receipts').insert(payload);
        if (receiptError) throw receiptError;
        
        const newAllocations = allocations.map(a => {
            const id = crypto.randomUUID();
            allocationIds.push(id);
            return { id, receipt_id: newReceipt.id, invoice_id: a.invoiceId, amount: a.amount, created_at: Date.now() };
        });
        if (newAllocations.length > 0) {
            const { error: allocErr } = await supabase.from('receipt_allocations').insert(newAllocations);
            if (allocErr) throw allocErr;
        }
        
        for (const a of allocations) {
            const { data: invoice } = await supabase.from('invoices').select('*').eq('id', a.invoiceId).single();
            if (invoice) {
                revertedInvoices.push({ id: invoice.id, paid_amount: invoice.paid_amount, status: invoice.status });
                const newPaidAmount = invoice.paid_amount + a.amount;
                const newStatus = (newPaidAmount >= (invoice.amount + (invoice.tax_amount || 0)) - 0.001) ? 'PAID' : 'PARTIALLY_PAID';
                const { error: invErr } = await supabase.from('invoices').update({ paid_amount: newPaidAmount, status: newStatus }).eq('id', invoice.id);
                if (invErr) throw invErr;
            }
        }
        
        const mappings = settings.accountMappings;
        await postJournalEntrySupabase({ dr: mappings.paymentMethods[newReceipt.channel], cr: mappings.accountsReceivable, amount: newReceipt.amount, ref: newReceipt.id, entityType: 'CONTRACT', entityId: newReceipt.contractId, date: newReceipt.dateTime });
        await dataService.audit(user, 'CREATE', 'receipts', newReceipt.id, `إصدار سند قبض رقم ${receiptNo}`);
        
        toast.success('تم تسجيل السند بنجاح.');
    } catch (e: any) {
        // Best-effort rollback to reduce partial writes
        try {
            if (allocationIds.length) {
                await supabase.from('receipt_allocations').delete().in('id', allocationIds);
            }
            if (receiptId) {
                await supabase.from('receipts').delete().eq('id', receiptId);
            }
            if (serialBefore !== null) {
                await supabase.from('serials').update({ receipt: serialBefore }).eq('id', STATIC_ID);
            }
            for (const prev of revertedInvoices) {
                await supabase.from('invoices').update({ paid_amount: prev.paid_amount, status: prev.status }).eq('id', prev.id);
            }
        } catch (cleanupError) {
            console.error('Cleanup after receipt failure failed', cleanupError);
        }
        toast.error(e.message || "فشل تسجيل السند.");
        throw e;
    }
};

export const financeService = {
    addReceiptWithAllocations,
    voidReceipt,
    voidExpense,
    voidInvoice,
    voidDepositTx: async (id: string, user: User | null | undefined) => {
        try {
            await createReversingJE(id);
            const { error } = await supabase.from('deposit_txs').update({ status: 'VOID' }).eq('id', id);
            if (error) throw error;
            toast.success("تم إلغاء حركة التأمين.");
        } catch (e: any) {
            toast.error(e.message || 'فشل إلغاء حركة التأمين.');
            throw e;
        }
    },
    voidOwnerSettlement: async (id: string, user: User | null | undefined) => {
        try {
            await createReversingJE(id);
            const { error } = await supabase.from('owner_settlements').update({ status: 'VOID' }).eq('id', id);
            if (error) throw error;
            toast.success("تم إلغاء تسوية المالك.");
        } catch (e: any) {
            toast.error(e.message || 'فشل إلغاء تسوية المالك.');
            throw e;
        }
    },
    generateMonthlyInvoices: async (user: User | null | undefined, settings: Settings): Promise<number> => {
        try {
            const today = new Date();
            const currentMonthYm = today.toISOString().slice(0, 7);
            const { data: activeContracts } = await supabase.from('contracts').select('*').eq('status', 'ACTIVE');
            let count = 0;
            if (activeContracts) {
                for (const c of activeContracts) {
                    const dueDate = `${currentMonthYm}-${String(c.due_day).padStart(2, '0')}`;
                    const { data: exists } = await supabase.from('invoices').select('id').eq('contract_id', c.id).eq('due_date', dueDate).single();
                    if (!exists) {
                        const tax = (c.rent * settings.taxRate) / 100;
                        await dataService.add('invoices', { contractId: c.id, dueDate, amount: c.rent, taxAmount: tax, paidAmount: 0, status: 'UNPAID', type: 'RENT', notes: `إيجار شهر ${today.getMonth() + 1}` }, user, settings);
                        count++;
                    }
                }
            }
            return count;
        } catch (e: any) {
            toast.error(e.message || 'فشل إصدار الفواتير الشهرية.');
            throw e;
        }
    },
    // ─── generateNotifications ───────────────────────────────────────────────
    // Scans active contracts for two triggers:
    //   1) Overdue invoices (UNPAID/PARTIALLY_PAID past due_date)
    //   2) Contracts expiring within contractAlertDays (default 30)
    // Inserts new PENDING rows into outgoing_notifications (skips duplicates).
    generateNotifications: async (settings: Settings): Promise<number> => {
        try {
            const alertDays = settings?.company?.contractAlertDays ?? 30;
            const today = new Date();
            const alertCutoff = new Date(today);
            alertCutoff.setDate(alertCutoff.getDate() + alertDays);
            const todayStr = today.toISOString().slice(0, 10);
            const cutoffStr = alertCutoff.toISOString().slice(0, 10);

            const [
                { data: contracts },
                { data: tenants },
                { data: invoices },
                { data: existing },
            ] = await Promise.all([
                supabase.from('contracts').select('*').eq('status', 'ACTIVE'),
                supabase.from('tenants').select('id, name, phone'),
                supabase.from('invoices')
                    .select('*')
                    .in('status', ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'])
                    .lt('due_date', todayStr),
                supabase.from('outgoing_notifications')
                    .select('id, recipient')
                    .eq('status', 'PENDING'),
            ]);

            const tenantMap = new Map<string, any>((tenants || []).map((t: any) => [t.id, t]));
            const contractMap = new Map<string, any>((contracts || []).map((c: any) => [c.id, c]));

            const pendingKeys = new Set((existing || []).map((n: any) => n.recipient));

            const toInsert: any[] = [];

            for (const inv of invoices || []) {
                const contract = contractMap.get(inv.contract_id);
                if (!contract) continue;
                const tenant = tenantMap.get(contract.tenant_id);
                if (!tenant?.phone) continue;
                const key = `OVERDUE-${inv.id}`;
                if (pendingKeys.has(key)) continue;
                const outstanding = (inv.amount + (inv.tax_amount || 0)) - inv.paid_amount;
                toInsert.push({
                    id: crypto.randomUUID(),
                    recipient: key,
                    recipient_name: tenant.name,
                    recipient_contact: tenant.phone,
                    message: `عزيزي ${tenant.name}، نودّ تذكيركم بوجود فاتورة إيجار متأخرة بمبلغ ${outstanding.toFixed(2)} كانت مستحقة في ${inv.due_date}. يُرجى السداد في أقرب وقت. شكراً لتعاملكم.`,
                    status: 'PENDING',
                    created_at: Date.now(),
                });
            }

            for (const c of contracts || []) {
                if (!c.end_date) continue;
                if (c.end_date > cutoffStr || c.end_date < todayStr) continue;
                const tenant = tenantMap.get(c.tenant_id);
                if (!tenant?.phone) continue;
                const key = `EXPIRY-${c.id}`;
                if (pendingKeys.has(key)) continue;
                toInsert.push({
                    id: crypto.randomUUID(),
                    recipient: key,
                    recipient_name: tenant.name,
                    recipient_contact: tenant.phone,
                    message: `عزيزي ${tenant.name}، نودّ إعلامكم بأن عقد إيجاركم سينتهي بتاريخ ${c.end_date}. يُرجى التواصل معنا لتجديد العقد أو ترتيب الإخلاء. شكراً.`,
                    status: 'PENDING',
                    created_at: Date.now(),
                });
            }

            if (toInsert.length > 0) {
                const { error } = await supabase.from('outgoing_notifications').insert(toInsert);
                if (error) throw error;
            }

            return toInsert.length;
        } catch (e: any) {
            toast.error(e.message || 'فشل توليد الإشعارات.');
            throw e;
        }
    },

    // ─── payoutCommission ────────────────────────────────────────────────────
    // Marks a commission as PAID, records payout timestamp, and posts a
    // journal entry: Dr ownersPayable → Cr CASH (commission expense paid out).
    payoutCommission: async (id: string, user?: User | null, settings?: Settings): Promise<void> => {
        try {
            const { data: commission } = await supabase
                .from('commissions')
                .select('*')
                .eq('id', id)
                .single();

            if (!commission) throw new Error('العمولة غير موجودة.');
            if (commission.status === 'PAID') {
                toast.error('هذه العمولة تم صرفها مسبقاً.');
                return;
            }

            const paidAt = Date.now();
            const { error } = await supabase
                .from('commissions')
                .update({ status: 'PAID', paid_at: paidAt })
                .eq('id', id);
            if (error) throw error;

            if (settings?.accountMappings) {
                const m = settings.accountMappings;
                const cashAcc = m.paymentMethods?.CASH;
                const expAcc = m.expenseCategories?.default;
                if (cashAcc && expAcc && commission.amount > 0) {
                    await postJournalEntrySupabase({
                        dr: expAcc,
                        cr: cashAcc,
                        amount: commission.amount,
                        ref: id,
                        date: new Date().toISOString().slice(0, 10),
                    });
                }
            }

            if (user) {
                await dataService.audit(user, 'PAYOUT', 'commissions', id, `صرف عمولة بمبلغ ${commission.amount}`);
            }

            toast.success('تم صرف العمولة وتسجيل القيد المحاسبي.');
        } catch (e: any) {
            toast.error(e.message || 'فشل صرف العمولة.');
            throw e;
        }
    },

    // ─── add* wrappers — now accept user + settings from AppContext ──────────
    // AppContext calls these without user/settings so we accept them as optional
    // to avoid breaking the existing call sites.
    addExpense: async (data: any, user?: User | null, settings?: Settings): Promise<void> => {
        await dataService.add('expenses', data, user ?? null, settings ?? {} as any);
    },
    addInvoice: async (data: any, user?: User | null, settings?: Settings): Promise<void> => {
        await dataService.add('invoices', data, user ?? null, settings ?? {} as any);
    },
    addDepositTx: async (data: any, user?: User | null, settings?: Settings): Promise<void> => {
        await dataService.add('depositTxs', data, user ?? null, settings ?? {} as any);
    },
    addOwnerSettlement: async (data: any, user?: User | null, settings?: Settings): Promise<void> => {
        await dataService.add('ownerSettlements', data, user ?? null, settings ?? {} as any);
    },

    // ─── addManualJournalVoucher ─────────────────────────────────────────────
    // Accepts { date, notes, lines: [{ accountId, debit, credit }] }
    // Posts one balanced journal entry pair per line to journal_entries.
    addManualJournalVoucher: async (
        data: { date: string; notes: string; lines: { accountId: string; debit: number; credit: number }[] },
        user?: User | null
    ): Promise<void> => {
        try {
            if (!data?.lines?.length) throw new Error('القيد لا يحتوي على بنود.');

            const totalDebit  = data.lines.reduce((s, l) => s + (l.debit  || 0), 0);
            const totalCredit = data.lines.reduce((s, l) => s + (l.credit || 0), 0);
            if (Math.abs(totalDebit - totalCredit) > 0.001) {
                throw new Error('القيد غير متوازن — مجموع المدين لا يساوي مجموع الدائن.');
            }

            const { data: s } = await supabase
                .from('serials')
                .select('journal_entry')
                .eq('id', STATIC_ID)
                .single();
            const baseNo = (s?.journal_entry || 1000) + 1;
            await supabase.from('serials')
                .update({ journal_entry: baseNo + data.lines.length })
                .eq('id', STATIC_ID);

            const voucherId = crypto.randomUUID();
            const ts = Date.now();
            const rows: any[] = [];

            data.lines.forEach((line, idx) => {
                const entryNo = String(baseNo + idx);
                if (line.debit > 0) {
                    rows.push({
                        id: crypto.randomUUID(),
                        no: entryNo,
                        date: data.date,
                        account_id: line.accountId,
                        amount: line.debit,
                        type: 'DEBIT',
                        source_id: voucherId,
                        notes: data.notes,
                        created_at: ts,
                    });
                }
                if (line.credit > 0) {
                    rows.push({
                        id: crypto.randomUUID(),
                        no: entryNo,
                        date: data.date,
                        account_id: line.accountId,
                        amount: line.credit,
                        type: 'CREDIT',
                        source_id: voucherId,
                        notes: data.notes,
                        created_at: ts,
                    });
                }
            });

            const { error } = await supabase.from('journal_entries').insert(rows);
            if (error) throw error;

            if (user) {
                await dataService.audit(user, 'CREATE', 'journalEntries', voucherId, `قيد يدوي: ${data.notes}`);
            }

            toast.success('تم ترحيل القيد اليومي بنجاح.');
        } catch (e: any) {
            toast.error(e.message || 'فشل ترحيل القيد.');
            throw e;
        }
    },
};
