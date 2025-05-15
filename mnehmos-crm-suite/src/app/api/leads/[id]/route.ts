import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse, NextRequest } from 'next/server';

// Define valid status options, ensure "Converted" is one of them.
const VALID_LEAD_STATUSES = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Converted", "Lost", "On Hold"];

interface LeadUpdatePayload {
  status?: string;
  notes?: string | null;
  last_contacted_at?: string | Date | null;
  name?: string | null;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  updated_at?: string | Date;
  // Add other potential fields from leads table if they become updatable
}


export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const leadId = params.id;
  const supabase = createRouteHandlerClient({ cookies });
  // const { id: leadId } = params; // This line is now handled by context.params.id

  if (!leadId) {
    return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
  }

  let requestBody;
  try {
    requestBody = await request.json();
  } catch { // Removed 'error' variable
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    status,
    notes,
    last_contacted_at,
    name,
    company_name,
    email,
    phone,
  }: LeadUpdatePayload = requestBody; // Apply type to destructured requestBody

  if (status && !VALID_LEAD_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_LEAD_STATUSES.join(', ')}` }, { status: 400 });
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: existingLead, error: fetchError } = await supabase
      .from('leads')
      .select('*') // Select all to have full data for client conversion
      .eq('id', leadId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingLead) {
      if (fetchError && fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Lead not found or you do not have permission to access it.' }, { status: 404 });
      }
      console.error('Error fetching lead:', fetchError);
      return NextResponse.json({ error: 'Error fetching lead data.' }, { status: 500 });
    }

    const updateData: LeadUpdatePayload = {}; // Use the defined interface
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (last_contacted_at !== undefined) updateData.last_contacted_at = last_contacted_at;
    if (name !== undefined) updateData.name = name;
    if (company_name !== undefined) updateData.company_name = company_name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;

    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'No fields to update provided.' }, { status: 400 });
    }
    
    updateData.updated_at = new Date().toISOString();


    if (status === 'Converted') {
      const { data: updatedLead, error: updateLeadError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateLeadError) {
        console.error('Error updating lead to Converted:', updateLeadError);
        return NextResponse.json({ error: 'Failed to update lead status.' }, { status: 500 });
      }

      const clientData = {
        user_id: user.id,
        lead_id: leadId,
        name: name !== undefined ? name : existingLead.name,
        company_name: company_name !== undefined ? company_name : existingLead.company_name,
        email: email !== undefined ? email : existingLead.email,
        phone: phone !== undefined ? phone : existingLead.phone,
        notes: notes !== undefined ? notes : existingLead.notes,
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: newClient, error: createClientError } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();

      if (createClientError) {
        console.error('Error creating client:', createClientError);
        return NextResponse.json({ error: 'Lead updated, but failed to create client.' }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Lead converted to client successfully.',
        updatedLead,
        newClient,
      }, { status: 200 });

    } else {
      const { data: updatedLead, error: updateError } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating lead:', updateError);
        return NextResponse.json({ error: 'Failed to update lead.' }, { status: 500 });
      }

      return NextResponse.json(updatedLead, { status: 200 });
    }

  } catch (error) { // Keep 'error' here for the final catch-all
    console.error('Unexpected error in PATCH /api/leads/[id]:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}