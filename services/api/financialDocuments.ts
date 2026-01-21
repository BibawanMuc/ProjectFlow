import { supabase } from '../../lib/supabase';
import { FinancialDocument, FinancialItem, DocType, DocStatus } from '../../types/supabase';
import { syncProjectBudget } from './projectFinancials';

/**
 * Fetch all financial documents for a project
 */
export async function getFinancialDocuments(projectId: string) {
    const { data, error } = await supabase
        .from('financial_documents')
        .select(`
      *,
      items:financial_items (
        *,
        service_module:service_modules (*),
        seniority_level:seniority_levels (*)
      )
    `)
        .eq('project_id', projectId)
        .order('date_issued', { ascending: false });

    if (error) throw new Error(`Failed to fetch financial documents: ${error.message}`);
    return data as (FinancialDocument & { items: FinancialItem[] })[];
}

/**
 * Fetch a single financial document by ID with full details
 */
export async function getFinancialDocumentById(id: string) {
    const { data, error } = await supabase
        .from('financial_documents')
        .select(`
      *,
      items:financial_items (
        *,
        service_module:service_modules (*),
        seniority_level:seniority_levels (*)
      )
    `)
        .eq('id', id)
        .single();

    if (error) throw new Error(`Failed to fetch financial document: ${error.message}`);
    return data as (FinancialDocument & { items: FinancialItem[] });
}

/**
 * Create a new financial document with items
 */
export async function createFinancialDocument(
    docData: Partial<FinancialDocument>,
    itemsData: Partial<FinancialItem>[]
) {
    // 1. Create the document header
    const { data: doc, error: docError } = await supabase
        .from('financial_documents')
        .insert(docData)
        .select()
        .single();

    if (docError) throw new Error(`Failed to create document: ${docError.message}`);
    if (!doc) throw new Error('Failed to create document (no data returned)');

    // 2. Create items if any
    if (itemsData.length > 0) {
        const itemsWithDocId = itemsData.map(item => ({
            ...item,
            document_id: doc.id
        }));

        const { error: itemsError } = await supabase
            .from('financial_items')
            .insert(itemsWithDocId);

        if (itemsError) {
            // Cleanup: delete the document if items failed (manual transaction rollback effect)
            await supabase.from('financial_documents').delete().eq('id', doc.id);
            throw new Error(`Failed to create document items: ${itemsError.message}`);
        }
    }

    // Sync budget if approved
    if (docData.project_id) {
        await syncProjectBudget(docData.project_id);
    }

    return doc;
}

/**
 * Update a financial document and its items
 * Strategy: Update doc header, Delete all existing items, Insert new items
 */
export async function updateFinancialDocument(
    id: string,
    docData: Partial<FinancialDocument>,
    itemsData: Partial<FinancialItem>[]
) {
    // 1. Update the document header
    const { error: docError } = await supabase
        .from('financial_documents')
        .update(docData)
        .eq('id', id);

    if (docError) throw new Error(`Failed to update document: ${docError.message}`);

    // 2. Delete existing items
    const { error: deleteError } = await supabase
        .from('financial_items')
        .delete()
        .eq('document_id', id);

    if (deleteError) throw new Error(`Failed to clear existing items: ${deleteError.message}`);

    // 3. Insert new items
    if (itemsData.length > 0) {
        const itemsWithDocId = itemsData.map(item => ({
            ...item,
            document_id: id
        }));

        const { error: itemsError } = await supabase
            .from('financial_items')
            .insert(itemsWithDocId);

        if (itemsError) throw new Error(`Failed to create new items: ${itemsError.message}`);
    }

    // Sync budget
    // Need projectId, usually available in docData, otherwise we'd need to fetch doc
    if (docData.project_id) {
        await syncProjectBudget(docData.project_id);
    } else {
        // Fallback: fetch doc to get projectId
        const { data: existingDoc } = await supabase.from('financial_documents').select('project_id').eq('id', id).single();
        if (existingDoc) {
            await syncProjectBudget(existingDoc.project_id);
        }
    }

    return true;
}

/**
 * Delete a financial document
 */
export async function deleteFinancialDocument(id: string) {
    // Get project ID before deleting
    const { data: doc } = await supabase.from('financial_documents').select('project_id').eq('id', id).single();

    const { error } = await supabase
        .from('financial_documents')
        .delete()
        .eq('id', id);

    if (error) throw new Error(`Failed to delete document: ${error.message}`);

    // Sync budget
    if (doc) {
        await syncProjectBudget(doc.project_id);
    }

    return true;
}
