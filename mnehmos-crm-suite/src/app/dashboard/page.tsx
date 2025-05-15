'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { Trash2, CheckCircle, Plus, Edit } from 'lucide-react'; // Added Edit and Plus icons
import LeadFormModal, { LeadFormData } from '../../components/LeadFormModal';

interface Lead {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null; // Added phone field
  status: 'Leads' | 'Contacted' | 'Converted' | 'Lost';
  last_contacted_at: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
}

type LeadStatus = 'Leads' | 'Contacted' | 'Converted' | 'Lost';

const KANBAN_COLUMNS: LeadStatus[] = ['Leads', 'Contacted', 'Converted', 'Lost'];

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | undefined>(undefined);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  // Get Clerk authentication state
  const { isLoaded, userId, sessionId } = useAuth();

  useEffect(() => {
    async function fetchLeads() {
      console.log('DashboardPage: fetchLeads called, auth state:', { isLoaded, userId: userId?.substring(0, 8), sessionId: sessionId?.substring(0, 8) });
      setLoading(true);
      setError(null);

      // Check if Clerk auth is loaded and user is authenticated
      if (!isLoaded) {
        console.log('DashboardPage: Clerk auth not loaded yet, waiting...');
        // Auth state is still loading, wait
        return;
      }

      if (!userId || !sessionId) {
        console.error('DashboardPage: No Clerk session found. User is unauthorized.');
        setError('Unauthorized: Please log in to view leads.');
        setLoading(false);
        // Optionally, redirect to login page here
        // import { useRouter } from 'next/navigation'; // (if using App Router)
        // const router = useRouter();
        // router.push('/sign-in');
        return;
      }
      
      console.log('DashboardPage: User authenticated, fetching leads...');

      // If Clerk session exists, proceed to fetch leads
      try {
        // Fetch leads - Clerk auth is handled automatically by the API route
        console.log('DashboardPage: Sending fetch request to /api/leads');
        const response = await fetch('/api/leads');
        console.log('DashboardPage: Received response:', { status: response.status, statusText: response.statusText });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch leads: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('DashboardPage: Successfully parsed response data, leads count:', data?.length || 0);
        setLeads(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while fetching leads';
        console.error('DashboardPage: Error fetching leads:', errorMessage, err);
        setError(errorMessage);
      } finally {
        console.log('DashboardPage: Finished fetch attempt, setting loading to false');
        setLoading(false);
      }
    }

    fetchLeads();
  }, [isLoaded, userId, sessionId]); // Add Clerk auth state dependencies

  // Refetch leads function

  const updateLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update lead status: ${response.statusText}`);
      }

      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        )
      );
    } catch (err) {
      console.error('Error updating lead status:', err);
      // Optionally, show an error message to the user
    }
  };

  const handleAddLead = () => {
    setSelectedLead(undefined);
    setIsModalOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const handleDeleteLead = (leadId: string) => {
    setLeadToDelete(leadId);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDeleteLead = async () => {
    if (!leadToDelete) return;
    
    try {
      const response = await fetch(`/api/leads/${leadToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete lead: ${response.statusText}`);
      }

      // Remove the lead from the state
      setLeads((prevLeads) => prevLeads.filter((lead) => lead.id !== leadToDelete));
      setIsConfirmDeleteOpen(false);
      setLeadToDelete(null);
    } catch (err) {
      console.error('Error deleting lead:', err);
      // Optionally, show an error message to the user
    }
  };

  const handleSubmitLead = async (leadData: LeadFormData) => {
    if (selectedLead) {
      // Update existing lead
      const response = await fetch(`/api/leads/${selectedLead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update lead: ${response.statusText}`);
      }

      const updatedLead = await response.json();
      
      // Update the lead in the state
      setLeads((prevLeads) =>
        prevLeads.map((lead) => (lead.id === selectedLead.id ? updatedLead : lead))
      );
    } else {
      // Create new lead
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create lead: ${response.statusText}`);
      }

      const newLead = await response.json();
      
      // Add the new lead to the state
      setLeads((prevLeads) => [newLead, ...prevLeads]);
    }
  };

  const leadsByStatus = (status: LeadStatus) => {
    return leads.filter((lead) => lead.status === status);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading leads...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-[#FFFCF5] p-4 md:p-8">
      <header className="mb-8 bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-800">Leads Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage and track your leads efficiently</p>
      </header>

      {/* Global Empty State */}
      {!loading && leads.length === 0 && (
        <div className="bg-white p-8 rounded-lg shadow-md text-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">You have no leads yet</h2>
          <p className="text-gray-600 mb-6">Click &apos;Add Lead&apos; to get started!</p>
          <button
            onClick={handleAddLead}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md text-sm flex items-center justify-center mx-auto"
          >
            <Plus size={16} className="mr-2" /> Add Your First Lead
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {KANBAN_COLUMNS.map((status) => (
          <div key={status} className="bg-white p-5 rounded-lg shadow-md border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 capitalize flex items-center">
              {status === 'Leads' && <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>}
              {status === 'Contacted' && <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>}
              {status === 'Converted' && <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>}
              {status === 'Lost' && <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>}
              {status}
            </h2>
            <div className="space-y-4 min-h-[250px] overflow-y-auto max-h-[500px] pr-1">
              {leadsByStatus(status).map((lead) => (
                <div key={lead.id} className="bg-[#FFFDF9] p-4 rounded-md shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">{lead.name}</h3>
                  {lead.company_name && (
                    <p className="text-sm text-gray-600 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm8 8v2h1v1H4v-1h1v-2a1 1 0 011-1h8a1 1 0 011 1z" clipRule="evenodd" />
                      </svg>
                      {lead.company_name}
                    </p>
                  )}
                  {lead.email && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      {lead.email}
                    </p>
                  )}
                  {lead.last_contacted_at && (
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      Last Contact: {new Date(lead.last_contacted_at).toLocaleDateString()}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                    </svg>
                    Source: {lead.source || 'N/A'}
                  </p>
                  <div className="mt-3 flex justify-between items-center">
                    <div className="flex space-x-2">
                      <button
                        title="Edit Lead"
                        onClick={() => handleEditLead(lead)}
                        className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-50"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        title="Delete Lead"
                        onClick={() => handleDeleteLead(lead.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    {status !== 'Converted' && (
                      <button
                        title="Convert to Client"
                        onClick={() => updateLeadStatus(lead.id, 'Converted')}
                        className="text-green-500 hover:text-green-700 flex items-center space-x-1 text-xs bg-green-50 px-2 py-1 rounded-md hover:bg-green-100 transition-colors"
                      >
                        <CheckCircle size={14} /> <span>Convert</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {leadsByStatus(status).length === 0 && (
                <div className="text-sm text-gray-500 text-center py-8 border-2 border-dashed border-gray-200 rounded-md">
                  <p>No leads in this stage</p>
                  <p className="text-xs mt-1">Drag leads here or add a new one</p>
                </div>
              )}
            </div>
            <button
              onClick={handleAddLead}
              className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-md text-sm flex items-center justify-center"
            >
              <Plus size={16} className="mr-1" />
              Add lead
            </button>
          </div>
        ))}
      </div>

      {/* Lead Form Modal */}
      <LeadFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitLead}
        lead={selectedLead}
        statuses={KANBAN_COLUMNS}
      />

      {/* Confirm Delete Modal */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Confirm Delete</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this lead? This action cannot be undone.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsConfirmDeleteOpen(false);
                  setLeadToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteLead}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}