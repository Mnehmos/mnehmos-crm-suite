import { NextResponse, NextRequest } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { supabase } from '../../../../lib/supabase';

// Define valid status options, ensure "Converted" is one of them.
const VALID_LEAD_STATUSES = ["Leads", "Contacted", "Converted", "Lost"];

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
  req: NextRequest,
  // Speculative type change based on the build error message pattern
  context: { params: Promise<{ id: string }> }
) {
  console.log('PATCH Handler - context:', JSON.stringify(context, null, 2));
  console.log('PATCH Handler - context.params:', JSON.stringify(context.params, null, 2));
  const paramsObj = await context.params; // If params is a Promise
  const leadId = paramsObj.id;

  if (!leadId) {
    return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
  }

  let requestBody;
  try {
    requestBody = await req.json(); // Changed from 'request.json()' to 'req.json()'
  } catch {
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
  }: LeadUpdatePayload = requestBody;

  if (status && !VALID_LEAD_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_LEAD_STATUSES.join(', ')}` }, { status: 400 });
  }

  try {
    // Get the Clerk session
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Look up the user in Supabase by clerk_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();
      
    if (userError) {
      console.error('API Leads [id]: Error finding user:', userError.message);
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }
    
    if (!userData) {
      console.error('API Leads [id]: User not found in Supabase.');
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    const { data: existingLead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('user_id', userData.id)
      .single();

    if (fetchError || !existingLead) {
      if (fetchError && fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Lead not found or you do not have permission to access it.' }, { status: 404 });
      }
      console.error('Error fetching lead:', fetchError);
      return NextResponse.json({ error: 'Error fetching lead data.' }, { status: 500 });
    }

    const updateData: LeadUpdatePayload = {};
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
        .eq('user_id', userData.id)
        .select()
        .single();

      if (updateLeadError) {
        console.error('Error updating lead to Converted:', updateLeadError);
        return NextResponse.json({ error: 'Failed to update lead status.' }, { status: 500 });
      }

      const clientData = {
        user_id: userData.id,
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
        .eq('user_id', userData.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating lead:', updateError);
        return NextResponse.json({ error: 'Failed to update lead.' }, { status: 500 });
      }

      return NextResponse.json(updatedLead, { status: 200 });
    }

  } catch (error) {
    console.error('Unexpected error in PATCH /api/leads/[id]:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

// DELETE endpoint for deleting a lead
export async function DELETE(
  req: NextRequest,
  // Speculative type change based on the bizarre build error message
  context: { params: Promise<{ id: string }> }
) {
  console.log('DELETE Handler - context:', JSON.stringify(context, null, 2));
  console.log('DELETE Handler - context.params:', JSON.stringify(context.params, null, 2));
  const paramsObj = await context.params; // If params is a Promise
  const leadId = paramsObj.id;

  if (!leadId) {
    return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
  }

  try {
    // Get the Clerk session
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Look up the user in Supabase by clerk_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .single();
      
    if (userError) {
      console.error('API Leads [id] DELETE: Error finding user:', userError.message);
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }
    
    if (!userData) {
      console.error('API Leads [id] DELETE: User not found in Supabase.');
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    // Verify the lead exists and belongs to the user
    const { data: existingLead, error: fetchError } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .eq('user_id', userData.id)
      .single();

    if (fetchError || !existingLead) {
      if (fetchError && fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Lead not found or you do not have permission to delete it.' }, { status: 404 });
      }
      console.error('Error fetching lead:', fetchError);
      return NextResponse.json({ error: 'Error fetching lead data.' }, { status: 500 });
    }

    // Delete the lead
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId)
      .eq('user_id', userData.id);

    if (deleteError) {
      console.error('Error deleting lead:', deleteError);
      return NextResponse.json({ error: 'Failed to delete lead.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Lead deleted successfully' }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/leads/[id]:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}