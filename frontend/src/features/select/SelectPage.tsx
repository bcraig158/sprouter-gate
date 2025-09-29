import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { formatDateTime, getTimeUntilEvent } from '../../utils/dateUtils';

interface Event {
  key: string;
  name: string;
  date: string;
  time: string;
  isAvailable: boolean;
  night: string;
}

interface NightState {
  night: string;
  tickets_requested: number;
  tickets_purchased: number;
  shows_selected: string[];
}

interface StateResponse {
  householdId: string;
  isVolunteer: boolean;
  currentPhase: 'initial' | 'second-wave';
  allowance: {
    baseAllowance: number;
    volunteerBonus: number;
    secondWaveBonus: number;
    totalAllowance: number;
    isVolunteer: boolean;
    isSecondWave: boolean;
    maxAllowed: number;
  };
  nightStates: NightState[];
  availableEvents: Event[];
}

export default function SelectPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<StateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNight, setSelectedNight] = useState<'tue' | 'thu' | null>(null);
  const [ticketsRequested, setTicketsRequested] = useState(1);

  useEffect(() => {
    fetchState();
  }, []);

  const fetchState = async () => {
    try {
      const response = await api.get('/state');
      setState(response.data);
    } catch (err) {
      setError('Failed to load your current state');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSlot = async (night: 'tue' | 'thu', eventKey: string) => {
    try {
      await api.post('/select-slot', {
        night,
        eventKey,
        ticketsRequested
      });
      
      // Refresh state
      await fetchState();
      
      // Navigate to purchase page
      navigate(`/purchase/${eventKey}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to select slot');
    }
  };

  const getNightEvents = (night: 'tue' | 'thu') => {
    if (!state) return [];
    return state.availableEvents.filter(event => event.night === night);
  };

  const getNightState = (night: 'tue' | 'thu') => {
    if (!state) return null;
    return state.nightStates.find(ns => ns.night === night);
  };

  const canSelectMoreTickets = (night: 'tue' | 'thu') => {
    if (!state) return false;
    const nightState = getNightState(night);
    const used = (nightState?.tickets_requested || 0) + (nightState?.tickets_purchased || 0);
    return used < state.allowance.totalAllowance;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="text-center">
        <p className="text-red-600">Failed to load your state</p>
        <button onClick={fetchState} className="btn-primary mt-4">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Select Your Shows
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900">Your Allowance</h3>
            <p className="text-blue-700">
              {state.allowance.totalAllowance} tickets per night
              {state.allowance.isVolunteer && (
                <span className="badge badge-success ml-2">Volunteer Bonus</span>
              )}
              {state.allowance.isSecondWave && (
                <span className="badge badge-info ml-2">Second Wave</span>
              )}
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-900">Current Phase</h3>
            <p className="text-green-700 capitalize">
              {state.currentPhase.replace('-', ' ')} Phase
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tuesday Events */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Tuesday, October 28, 2025
          </h2>
          
          <div className="space-y-4">
            {getNightEvents('tue').map((event) => (
              <div key={event.key} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{event.name}</h3>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(event.date, event.time)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {getTimeUntilEvent(event.date, event.time)}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    {event.isAvailable ? (
                      <span className="badge badge-success">Available</span>
                    ) : (
                      <span className="badge badge-error">Sales Closed</span>
                    )}
                  </div>
                </div>
                
                {event.isAvailable && canSelectMoreTickets('tue') && (
                  <div className="mt-4 flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700">
                      Tickets:
                    </label>
                    <select
                      value={ticketsRequested}
                      onChange={(e) => setTicketsRequested(parseInt(e.target.value))}
                      className="input-field w-20"
                    >
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleSelectSlot('tue', event.key)}
                      className="btn-primary"
                    >
                      Select Slot
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Thursday Events */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Thursday, October 30, 2025
          </h2>
          
          <div className="space-y-4">
            {getNightEvents('thu').map((event) => (
              <div key={event.key} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{event.name}</h3>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(event.date, event.time)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {getTimeUntilEvent(event.date, event.time)}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    {event.isAvailable ? (
                      <span className="badge badge-success">Available</span>
                    ) : (
                      <span className="badge badge-error">Sales Closed</span>
                    )}
                  </div>
                </div>
                
                {event.isAvailable && canSelectMoreTickets('thu') && (
                  <div className="mt-4 flex items-center space-x-4">
                    <label className="text-sm font-medium text-gray-700">
                      Tickets:
                    </label>
                    <select
                      value={ticketsRequested}
                      onChange={(e) => setTicketsRequested(parseInt(e.target.value))}
                      className="input-field w-20"
                    >
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleSelectSlot('thu', event.key)}
                      className="btn-primary"
                    >
                      Select Slot
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
