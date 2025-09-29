import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { formatDateTime } from '../../utils/dateUtils';

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
  availableEvents: Array<{
    key: string;
    name: string;
    date: string;
    time: string;
    isAvailable: boolean;
    night: string;
  }>;
}

export default function StatusPage() {
  const { user } = useAuth();
  const [state, setState] = useState<StateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchState();
  }, []);

  const fetchState = async () => {
    try {
      const response = await api.get('/state');
      setState(response.data);
    } catch (err) {
      setError('Failed to load your purchase status');
    } finally {
      setIsLoading(false);
    }
  };

  const getEventInfo = (eventKey: string) => {
    const event = state?.availableEvents.find(e => e.key === eventKey);
    return event ? {
      name: event.name,
      date: event.date,
      time: event.time,
      isAvailable: event.isAvailable
    } : null;
  };

  const getNightName = (night: string) => {
    return night === 'tue' ? 'Tuesday, October 28, 2025' : 'Thursday, October 30, 2025';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="card">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Failed to load status'}</p>
          <button onClick={fetchState} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Your Purchase Status
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900">Student ID</h3>
            <p className="text-blue-700">{user?.studentId}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-900">Allowance</h3>
            <p className="text-green-700">
              {state.allowance.totalAllowance} tickets per night
              {state.allowance.isVolunteer && (
                <span className="badge badge-success ml-2">Volunteer</span>
              )}
            </p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium text-purple-900">Current Phase</h3>
            <p className="text-purple-700 capitalize">
              {state.currentPhase.replace('-', ' ')} Phase
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tuesday Status */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {getNightName('tue')}
          </h2>
          
          {(() => {
            const nightState = state.nightStates.find(ns => ns.night === 'tue');
            if (!nightState) {
              return (
                <div className="text-center py-8 text-gray-500">
                  <p>No tickets requested for this night</p>
                </div>
              );
            }

            const totalUsed = nightState.tickets_requested + nightState.tickets_purchased;
            const remaining = state.allowance.totalAllowance - totalUsed;

            return (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Requested:</span>
                      <span className="ml-2 font-medium">{nightState.tickets_requested}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Purchased:</span>
                      <span className="ml-2 font-medium">{nightState.tickets_purchased}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Used:</span>
                      <span className="ml-2 font-medium">{totalUsed}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Remaining:</span>
                      <span className="ml-2 font-medium">{remaining}</span>
                    </div>
                  </div>
                </div>

                {nightState.shows_selected.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Selected Shows:</h3>
                    <div className="space-y-2">
                      {nightState.shows_selected.map((eventKey) => {
                        const eventInfo = getEventInfo(eventKey);
                        if (!eventInfo) return null;
                        
                        return (
                          <div key={eventKey} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{eventInfo.name}</p>
                              <p className="text-sm text-gray-600">
                                {formatDateTime(eventInfo.date, eventInfo.time)}
                              </p>
                            </div>
                            <div>
                              {eventInfo.isAvailable ? (
                                <span className="badge badge-success">Available</span>
                              ) : (
                                <span className="badge badge-error">Sales Closed</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Thursday Status */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {getNightName('thu')}
          </h2>
          
          {(() => {
            const nightState = state.nightStates.find(ns => ns.night === 'thu');
            if (!nightState) {
              return (
                <div className="text-center py-8 text-gray-500">
                  <p>No tickets requested for this night</p>
                </div>
              );
            }

            const totalUsed = nightState.tickets_requested + nightState.tickets_purchased;
            const remaining = state.allowance.totalAllowance - totalUsed;

            return (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Requested:</span>
                      <span className="ml-2 font-medium">{nightState.tickets_requested}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Purchased:</span>
                      <span className="ml-2 font-medium">{nightState.tickets_purchased}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Used:</span>
                      <span className="ml-2 font-medium">{totalUsed}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Remaining:</span>
                      <span className="ml-2 font-medium">{remaining}</span>
                    </div>
                  </div>
                </div>

                {nightState.shows_selected.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Selected Shows:</h3>
                    <div className="space-y-2">
                      {nightState.shows_selected.map((eventKey) => {
                        const eventInfo = getEventInfo(eventKey);
                        if (!eventInfo) return null;
                        
                        return (
                          <div key={eventKey} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{eventInfo.name}</p>
                              <p className="text-sm text-gray-600">
                                {formatDateTime(eventInfo.date, eventInfo.time)}
                              </p>
                            </div>
                            <div>
                              {eventInfo.isAvailable ? (
                                <span className="badge badge-success">Available</span>
                              ) : (
                                <span className="badge badge-error">Sales Closed</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Available Events
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.availableEvents.map((event) => (
            <div key={event.key} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">{event.name}</h3>
                {event.isAvailable ? (
                  <span className="badge badge-success">Available</span>
                ) : (
                  <span className="badge badge-error">Sales Closed</span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {formatDateTime(event.date, event.time)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
