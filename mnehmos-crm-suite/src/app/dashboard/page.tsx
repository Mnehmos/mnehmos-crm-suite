'use client';

import { useEffect, useState } from 'react';
import { Eye, Trash2, CheckCircle } from 'lucide-react'; // Assuming lucide-react for icons

interface Lead {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  status: 'Leads' | 'Contacted' | 'Converted' | 'Lost'; // Added 'Lost' as a common status
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

  useEffect(() => {
    async function fetchLeads() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/leads');
        if (!response.ok) {
          throw new Error(`Failed to fetch leads: ${response.statusText}`);
        }
        const data = await response.json();
        setLeads(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, []);

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
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Leads Dashboard</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {KANBAN_COLUMNS.map((status) => (
          <div key={status} className="bg-gray-200 p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 capitalize">{status}</h2>
            <div className="space-y-4 min-h-[200px]">
              {leadsByStatus(status).map((lead) => (
                <div key={lead.id} className="bg-white p-4 rounded-md shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-semibold text-gray-900">{lead.name}</h3>
                  {lead.company_name && <p className="text-sm text-gray-600">{lead.company_name}</p>}
                  {lead.email && <p className="text-xs text-gray-500 mt-1">{lead.email}</p>}
                  {lead.last_contacted_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Last Contact: {new Date(lead.last_contacted_at).toLocaleDateString()}
                    </p>
                  )}
                   <p className="text-xs text-gray-500 mt-1">
                      Source: {lead.source || 'N/A'}
                    </p>
                  <div className="mt-3 flex justify-between items-center">
                    <div className="flex space-x-2">
                      <button title="View Details" className="text-blue-500 hover:text-blue-700">
                        <Eye size={18} />
                      </button>
                      <button title="Delete Lead" className="text-red-500 hover:text-red-700">
                        <Trash2 size={18} />
                      </button>
                    </div>
                    {status !== 'Converted' && (
                      <button
                        title="Convert to Client"
                        onClick={() => updateLeadStatus(lead.id, 'Converted')}
                        className="text-green-500 hover:text-green-700 flex items-center space-x-1 text-xs"
                      >
                        <CheckCircle size={18} /> <span>Convert</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {leadsByStatus(status).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No leads in this stage.</p>
              )}
            </div>
            <button className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-md text-sm">
              + Add task
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}