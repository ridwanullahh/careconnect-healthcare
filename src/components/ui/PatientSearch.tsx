// Patient Search Component - Encrypted-aware search with safe results
import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PatientService } from '@/lib/patients';
import { useAuth } from '@/lib/auth';
import { Search, User, X, Loader2 } from 'lucide-react';

interface PatientSearchResult {
  id: string;
  patient_code: string;
  name_snippet: string;
  primary_entity_id: string;
  is_active: boolean;
}

interface PatientSearchProps {
  onPatientSelect?: (patient: PatientSearchResult) => void;
  placeholder?: string;
  entityId?: string;
  className?: string;
  maxResults?: number;
  showSelectedPatient?: boolean;
}

export default function PatientSearch({
  onPatientSelect,
  placeholder = "Search patients by name or ID...",
  entityId,
  className = "",
  maxResults = 10,
  showSelectedPatient = true
}: PatientSearchProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchPatients();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const searchPatients = async () => {
    if (!query.trim() || query.length < 2) return;

    try {
      setLoading(true);
      const searchResults = await PatientService.searchPatients(
        query.trim(),
        entityId || user?.entity_id,
        maxResults
      );
      setResults(searchResults);
      setShowResults(true);
    } catch (error) {
      console.error('Patient search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = (patient: PatientSearchResult) => {
    setSelectedPatient(patient);
    setQuery(showSelectedPatient ? `${patient.name_snippet} (${patient.patient_code})` : '');
    setShowResults(false);
    onPatientSelect?.(patient);
  };

  const clearSelection = () => {
    setSelectedPatient(null);
    setQuery('');
    setResults([]);
    setShowResults(false);
    onPatientSelect?.(null as any);
  };

  const PatientResultItem = ({ patient }: { patient: PatientSearchResult }) => (
    <div
      className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
      onClick={() => handlePatientSelect(patient)}
    >
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <User className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <p className="font-medium text-sm">{patient.name_snippet}</p>
          <p className="text-xs text-gray-500">ID: {patient.patient_code}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Badge variant={patient.is_active ? "default" : "secondary"} className="text-xs">
          {patient.is_active ? "Active" : "Inactive"}
        </Badge>
      </div>
    </div>
  );

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) {
              setShowResults(true);
            }
          }}
          className="pl-10 pr-10"
        />
        {loading && (
          <Loader2 className="absolute right-8 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
        {selectedPatient && showSelectedPatient && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            onClick={clearSelection}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-gray-500">Searching...</span>
            </div>
          ) : results.length > 0 ? (
            <div>
              <div className="p-2 border-b bg-gray-50">
                <p className="text-xs text-gray-600 font-medium">
                  {results.length} patient{results.length !== 1 ? 's' : ''} found
                </p>
              </div>
              {results.map((patient) => (
                <PatientResultItem key={patient.id} patient={patient} />
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center">
              <User className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No patients found</p>
              <p className="text-xs text-gray-400">Try adjusting your search terms</p>
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500">Type at least 2 characters to search</p>
            </div>
          )}
        </div>
      )}

      {/* Selected Patient Display */}
      {selectedPatient && showSelectedPatient && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm text-blue-900">{selectedPatient.name_snippet}</p>
                <p className="text-xs text-blue-700">Patient ID: {selectedPatient.patient_code}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="text-blue-700 hover:text-blue-900"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for using patient search in forms
export function usePatientSearch(initialPatientId?: string) {
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialPatientId) {
      loadInitialPatient(initialPatientId);
    }
  }, [initialPatientId]);

  const loadInitialPatient = async (patientId: string) => {
    try {
      setLoading(true);
      // This would need to be implemented in PatientService
      // For now, we'll just clear the selection
      setSelectedPatient(null);
    } catch (error) {
      console.error('Failed to load initial patient:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = (patient: PatientSearchResult) => {
    setSelectedPatient(patient);
  };

  const clearPatient = () => {
    setSelectedPatient(null);
  };

  return {
    selectedPatient,
    handlePatientSelect,
    clearPatient,
    loading
  };
}