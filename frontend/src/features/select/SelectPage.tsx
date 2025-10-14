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


interface StateResponse {
  householdId: string;
  isVolunteer: boolean;
  currentPhase: 'initial' | 'selected' | 'purchased';
  allowance: {
    baseAllowance: number;
    volunteerBonus: number;
    isVolunteer: boolean;
    totalAllowance: number;
  };
  nightStates: Array<{
    night: string;
    phase: string;
    selectedEvent: string | null;
  }>;
  availableEvents: Event[];
}

// FAQ Item Component
const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium text-gray-800">{question}</span>
        <svg
          className={`w-5 h-5 text-gray-500 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 pb-3 text-gray-600 text-sm leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
};

export default function SelectPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<StateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [ticketsRequested] = useState(1);
  const [selectedShow, setSelectedShow] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchState();
  }, []);

  const fetchState = async () => {
    try {
      // Use the correct API endpoint
      const response = await api.get('/state');
      console.log('State API response:', response.data);
      
      // The API returns { success: true, data: stateResponse }
      if (response.data.success && response.data.data) {
        setState(response.data.data);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      console.error('State fetch error:', err);
      setError('Failed to load your current state');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSlot = async (night: 'tue' | 'thu', eventKey: string) => {
    try {
      // Track show selection for analytics - NON-BLOCKING
      const trackShowSelection = () => {
        // Use setTimeout to make it completely non-blocking
        setTimeout(async () => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
            
            const response = await fetch('/.netlify/functions/api', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                action: 'track_show_selection',
                show_id: eventKey,
                show_name: state?.availableEvents.find((e: Event) => e.key === eventKey)?.name || eventKey,
                user_id: user?.studentId || user?.volunteerCode,
                user_type: user?.isVolunteer ? 'volunteer' : 'student'
              }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              console.log('🎭 Show selection tracked successfully');
            }
          } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
              console.error('Failed to track show selection (non-blocking):', error);
            }
          }
        }, 0); // Run immediately but asynchronously
      };

      // Start analytics tracking (non-blocking)
      trackShowSelection();

      // Main user flow - this is what matters for UX
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

  // const getNightState = (night: 'tue' | 'thu') => {
  //   if (!state) return null;
  //   return state.nightStates.find(ns => ns.night === night);
  // };

  // const canSelectMoreTickets = (night: 'tue' | 'thu') => {
  //   if (!state) return false;
  //   const nightState = getNightState(night);
  //   const used = (nightState?.tickets_requested || 0) + (nightState?.tickets_purchased || 0);
  //   return used < state.allowance.totalAllowance;
  // };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your events...</p>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load your state</p>
          <button 
            onClick={fetchState} 
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-2xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-purple-600 hover:text-purple-700 font-semibold mb-4 group"
          >
            <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            Select Your Show Time
          </h1>
          <p className="text-gray-600 text-lg">Choose one performance to attend</p>
        </div>

        {/* Single Information Container */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6">
          {/* Container Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Starstruck Presents: So You Think You Can Dance!</h2>
            <p className="text-gray-600 text-base flex items-center justify-center">
              <span className="text-red-500 mr-2">📍</span>
              Maidu Elementary School, 1950 Johnson Ranch Drive, Roseville, CA 95661
            </p>
          </div>
          
          {/* Three Column Layout */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Column 1: Ticket Rules */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                Ticket Rules
              </h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• Up to 2 tickets per family per night</li>
                <li>• Choose ONE show time per night</li>
                <li>• Children 2 & under free (lap seating)</li>
                <li>• Additional tickets available starting October 20th</li>
              </ul>
            </div>

            {/* Column 2: Ticket Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Ticket Options
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-medium">General Admission:</span>
                  <span className="font-semibold text-green-600">FREE</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Reserved Seating:</span>
                  <span className="font-semibold text-purple-600">$25</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Reserved seating in first 2 rows</p>
              </div>
            </div>

            {/* Column 3: Important Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                Important Information
              </h3>
              <div className="text-sm text-gray-600 space-y-3">
                <p>At checkout, you can select:</p>
                <ul className="space-y-1">
                  <li>• 2 General Admission tickets, OR</li>
                  <li>• 2 Reserved Seating tickets</li>
                </ul>
                <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded">
                  <p className="text-sm text-red-800">
                    <span className="text-red-500 mr-1">⚠️</span>
                    Purchases exceeding the 2-ticket limit will be automatically canceled and you will be notified.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-6 animate-shake">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700 font-medium text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Show Selection Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Tuesday Events */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              Tuesday, October 28, 2025
            </h2>
            
            {/* Tuesday Performance Schedule */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-3 text-center">Performance Schedule</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">TK - Gomez</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">1st - James</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">TK - Schofield</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">2nd - Jenkins</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">K - Schauer</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">2nd - Gillespie</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">K - Andrew</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">3rd - Petersen</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">1st - Carli</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">3rd - Large/Blue</div>
                </div>
              </div>
            </div>
            
            {getNightEvents('tue').map((event) => {
              const isSelected = selectedShow === event.key;
              const isLowAvailability = false; // All events are available
              
              return (
                <button
                  key={event.key}
                  onClick={() => setSelectedShow(event.key)}
                  className={`relative w-full bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border-4 ${
                    isSelected 
                      ? 'border-purple-500 ring-4 ring-purple-200' 
                      : 'border-transparent hover:border-purple-200'
                  } group`}
                >
                  {/* Selected Badge */}
                  {isSelected && (
                    <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg animate-bounce-slow">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  {/* Availability Badge */}
                  <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-xs font-bold ${
                    isLowAvailability 
                      ? 'bg-orange-100 text-orange-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {isLowAvailability ? 'Limited' : 'Available'}
                  </div>

                  {/* Icon */}
                  <div className="mb-4 transform group-hover:scale-110 transition-transform flex justify-center">
                    <img 
                      src="/EventBanner.png" 
                      alt="So You Think You Can Dance" 
                      className="w-20 h-12 object-cover rounded-lg shadow-md"
                    />
                  </div>

                  {/* Event Info */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{event.name}</h3>
                    <p className="text-purple-600 font-semibold">{formatDateTime(event.date, event.time)}</p>
                    <p className="text-gray-500 text-sm">{getTimeUntilEvent(event.date, event.time)}</p>
                  </div>

                  {/* Features */}
                  <div className="space-y-2 text-center">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Full performance
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      All dance groups
                    </div>
                  </div>

                  {/* Select Indicator */}
                  <div className={`mt-4 pt-4 border-t-2 ${isSelected ? 'border-purple-200' : 'border-gray-200'}`}>
                    <span className={`font-semibold ${isSelected ? 'text-purple-600' : 'text-gray-600'}`}>
                      {isSelected ? '✓ Selected' : 'Click to select'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Thursday Events */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
              Thursday, October 30, 2025
            </h2>
            
            {/* Thursday Performance Schedule */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-gray-800 mb-3 text-center">Performance Schedule</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">TK - Hoslett</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">2nd - Ito</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">K - Hagman</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">2nd - Taylor</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">K - Lopez</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">2nd - Rhue</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">1st - Habian</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">3rd - Reineman</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">1st - Dessling</div>
                </div>
                <div className="bg-white rounded-lg p-2 text-center border">
                  <div className="font-medium text-gray-700">3rd - Moshofsky</div>
                </div>
              </div>
            </div>
            
            {getNightEvents('thu').map((event) => {
              const isSelected = selectedShow === event.key;
              const isLowAvailability = false; // All events are available
              
              return (
                <button
                  key={event.key}
                  onClick={() => setSelectedShow(event.key)}
                  className={`relative w-full bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border-4 ${
                    isSelected 
                      ? 'border-purple-500 ring-4 ring-purple-200' 
                      : 'border-transparent hover:border-purple-200'
                  } group`}
                >
                  {/* Selected Badge */}
                  {isSelected && (
                    <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg animate-bounce-slow">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  {/* Availability Badge */}
                  <div className={`absolute top-6 right-6 px-3 py-1 rounded-full text-xs font-bold ${
                    isLowAvailability 
                      ? 'bg-orange-100 text-orange-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {isLowAvailability ? 'Limited' : 'Available'}
                  </div>

                  {/* Icon */}
                  <div className="mb-4 transform group-hover:scale-110 transition-transform flex justify-center">
                    <img 
                      src="/EventBanner.png" 
                      alt="So You Think You Can Dance" 
                      className="w-20 h-12 object-cover rounded-lg shadow-md"
                    />
                  </div>

                  {/* Event Info */}
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{event.name}</h3>
                    <p className="text-purple-600 font-semibold">{formatDateTime(event.date, event.time)}</p>
                    <p className="text-gray-500 text-sm">{getTimeUntilEvent(event.date, event.time)}</p>
                  </div>

                  {/* Features */}
                  <div className="space-y-2 text-center">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Full performance
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      All dance groups
                    </div>
                  </div>

                  {/* Select Indicator */}
                  <div className={`mt-4 pt-4 border-t-2 ${isSelected ? 'border-purple-200' : 'border-gray-200'}`}>
                    <span className={`font-semibold ${isSelected ? 'text-purple-600' : 'text-gray-600'}`}>
                      {isSelected ? '✓ Selected' : 'Click to select'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Continue Button */}
        <div className="max-w-md mx-auto">
          <button
            onClick={() => selectedShow && handleSelectSlot(selectedShow.includes('tue') ? 'tue' : 'thu', selectedShow)}
            disabled={!selectedShow}
            className="w-full py-5 px-8 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group relative overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
            
            <span className="relative flex items-center justify-center space-x-2">
              <span>Continue to Checkout</span>
              <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>

          {!selectedShow && (
            <p className="text-center text-sm text-gray-500 mt-4 animate-pulse">
              Please select a show time to continue
            </p>
          )}
        </div>

        {/* Q&A Section */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Frequently Asked Questions</h2>
              <p className="text-gray-600">Everything you need to know about purchasing tickets</p>
            </div>

            <div className="space-y-4">
              {/* Q&A Categories */}
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Basics & Rules */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Basics & Rules</h3>
                  
                  <FAQItem 
                    question="How do I purchase tickets?"
                    answer="Log in at maidutickets.com using your student's ID number. After logging in, select your preferred show time(s) and complete checkout."
                  />
                  
                  <FAQItem 
                    question="How many tickets can I purchase?"
                    answer="You can purchase up to 2 tickets per night. If you want to attend both October 28 and October 30, you can purchase 2 tickets for each night (4 tickets total across both dates)."
                  />
                  
                  <FAQItem 
                    question="Can I select both the 5:30 PM and 6:30 PM shows on the same night?"
                    answer="No. You must choose ONE show time per night (either 5:30 PM OR 6:30 PM). This ensures more families can attend."
                  />
                  
                  <FAQItem 
                    question="What happens if I try to purchase more than 2 tickets per night?"
                    answer="Purchases exceeding the 2-ticket limit per night will be automatically canceled and you will be notified. Please only purchase within your allowance."
                  />
                </div>

                {/* Ticket Options & Pricing */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Ticket Options & Pricing</h3>
                  
                  <FAQItem 
                    question="What types of tickets are available?"
                    answer="There are two ticket types: General Admission - FREE (first come, first served seating starting at Row 3), and Reserved Seating - $25 per ticket (guaranteed seats in the first 2 rows)."
                  />
                  
                  <FAQItem 
                    question="Can I purchase 1 Reserved and 1 General Admission ticket?"
                    answer="At checkout, you'll select your ticket type. You can choose: 2 General Admission tickets (FREE), OR 2 Reserved Seating tickets ($50 total)."
                  />
                  
                  <FAQItem 
                    question="Is there a limit on Reserved Seating tickets?"
                    answer="Yes, Reserved Seating is limited to 48 tickets per show (first 2 rows only). These seats sell out quickly, so purchase early if you want guaranteed front-row seating."
                  />
                  
                  <FAQItem 
                    question="How much will my tickets cost?"
                    answer="General Admission: FREE (0 tickets = $0, 2 tickets = $0). Reserved Seating: $25 per ticket (2 tickets = $50)."
                  />
                </div>

                {/* Student ID & Verification */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Student ID & Verification</h3>
                  
                  <FAQItem 
                    question="Where do I find my student's ID number?"
                    answer="Your student's ID number should be available through your school portal, report cards, or by contacting the school office. You can also email maiduelementaryptc@gmail.com if you need help locating it."
                  />
                  
                  <FAQItem 
                    question="Can I use my student ID for both October 28 and October 30?"
                    answer="Yes! Your student ID can be used to purchase tickets for both nights. However, each ID is limited to 2 tickets per night."
                  />
                  
                  <FAQItem 
                    question="What if I have multiple children at Maidu Elementary?"
                    answer="You can use any of your children's student IDs to purchase tickets. Each student ID allows for 2 tickets per night."
                  />
                  
                  <FAQItem 
                    question="My student ID isn't working - what should I do?"
                    answer="Make sure you're entering the ID correctly. If you continue to have issues, contact maiduelementaryptc@gmail.com or call 916-749-0848 for assistance."
                  />
                </div>

                {/* Additional Tickets & Important Dates */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Additional Tickets & Dates</h3>
                  
                  <FAQItem 
                    question="When can I purchase additional tickets?"
                    answer="Starting October 20th, families can purchase up to 4 additional tickets per night while supplies last. Initial purchase (Oct 13-19): Up to 2 tickets per night. Maximum total: 6 tickets per night if you purchase during both phases."
                  />
                  
                  <FAQItem 
                    question="When are ticket sales open?"
                    answer="Ticket sales open on October 13, 2025. Additional tickets will be released on October 20, 2025. October 28 shows: Sales close at 4:00 PM on October 28. October 30 shows: Sales close at 4:00 PM on October 30."
                  />
                  
                  <FAQItem 
                    question="Do all my children need tickets?"
                    answer="Children age 3 and older need tickets. Children 2 and under who sit on a lap do not need a ticket."
                  />
                  
                  <FAQItem 
                    question="Can I get a refund?"
                    answer="Yes, refunds are available up to 2 days (48 hours) before the show. After that, no refunds will be issued. Contact maiduelementaryptc@gmail.com or call 916-749-0848 to request a refund."
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  Still have questions?
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700 mb-2">Contact Information:</p>
                    <p className="text-gray-600">📧 <a href="mailto:maiduelementaryptc@gmail.com" className="text-purple-600 hover:text-purple-700 font-semibold hover:underline">maiduelementaryptc@gmail.com</a></p>
                    <p className="text-gray-600">📞 916-749-0848</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700 mb-2">Event Location:</p>
                    <p className="text-gray-600">📍 Maidu Elementary School</p>
                    <p className="text-gray-600">1950 Johnson Ranch Drive</p>
                    <p className="text-gray-600">Roseville, CA 95661</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="max-w-2xl mx-auto mt-12 bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            Need Help?
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Having trouble selecting a show? Contact us at <a href="mailto:maiduelementaryptc@gmail.com" className="text-purple-600 hover:text-purple-700 font-semibold hover:underline">maiduelementaryptc@gmail.com</a> or call during business hours.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }

        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-5px) scale(1.05); }
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
    </div>
  );
}