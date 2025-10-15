import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { liveTracking } from '../../services/liveTracking';
import { formatDateTime, getTimeUntilEvent } from '../../utils/dateUtils';

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

export default function VolunteerSelectPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<StateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [ticketsRequested] = useState(1);
  const [selectedShow, setSelectedShow] = useState<string | null>(null);

  // Redirect if not authenticated or not a volunteer
  useEffect(() => {
    if (!user) {
      navigate('/volunteer-login');
    } else if (!user.isVolunteer) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchState();
  }, []);

  const fetchState = async () => {
    try {
      // Always use real API for production tracking
      const response = await api.get('/state');
      console.log('Volunteer State API response:', response.data);
      
      // The API returns { success: true, data: stateResponse }
      if (response.data.success && response.data.data) {
        setState(response.data.data);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (err) {
      console.error('Volunteer state fetch error:', err);
      setError('Failed to load your current state');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSlot = async (night: 'tue' | 'thu', eventKey: string) => {
    try {
      // Live tracking (non-blocking)
      try {
        const eventName = state?.availableEvents.find((e: Event) => e.key === eventKey)?.name || eventKey;
        liveTracking.trackEventSelection(
          user?.householdId || '',
          eventName,
          eventKey
        );
      } catch (error) {
        console.error('Volunteer event selection tracking failed:', error);
      }

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 relative overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your volunteer portal...</p>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 relative overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load your state</p>
          <button 
            onClick={fetchState} 
            className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-2xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-green-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-green-600 hover:text-green-700 font-semibold mb-4 group"
          >
            <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Select Your Show Times 🎭
          </h1>
          <p className="text-gray-600 text-lg">Choose when you want to WATCH the show with your family.<br />(Not when you're volunteering!)</p>
        </div>

        {/* Main Instructions Box */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-2xl p-6 mb-8">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">HOW TO SELECT YOUR TICKETS:</h2>
          </div>
          <div className="flex justify-center">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-gray-700 font-medium">Choose ONE show per night (either 5:30 PM OR 6:30 PM)</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-gray-700 font-medium">You can attend shows on one night or both nights</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-gray-700 font-medium">You'll select your tickets (up to 4) at checkout</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
                </div>
                <p className="text-gray-700 font-medium">DO NOT select the show you're volunteering for - you'll be working!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Consolidated Information Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Starstruck Presents: So You Think You Can Dance!</h2>
            <p className="text-gray-600">📍 Maidu Elementary School, 1950 Johnson Ranch Drive, Roseville, CA 95661</p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Show Selection Rules */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Choose ONE show per night:
                </h3>
                <div className="text-sm text-gray-600 space-y-2">
                  <p><strong>October 28:</strong> Either 5:30 PM OR 6:30 PM</p>
                  <p><strong>October 30:</strong> Either 5:30 PM OR 6:30 PM</p>
                  <p className="text-green-600 font-medium">You can attend one night or both nights</p>
                </div>
              </div>

              {/* Ticket Limitations */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-800 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  ✓ Your ticket limits (per show you attend):
                </h3>
                <div className="text-sm text-gray-600 space-y-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="font-semibold text-yellow-800 mb-2">⚠️ Important Limits:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Maximum 2 Reserved Seats per show</li>
                      <li>• Maximum 4 General Admission tickets per show</li>
                      <li>• Reserved seats: $25 each (first 2 rows)</li>
                      <li>• General Admission: FREE</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="font-semibold text-green-800 mb-1">Examples of valid combinations:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• 4 GA tickets (FREE)</li>
                      <li>• 2 Reserved + 2 GA ($50 total)</li>
                      <li>• 1 Reserved + 3 GA ($25 total)</li>
                      <li>• 2 Reserved + 1 GA ($50 total)</li>
                    </ul>
                  </div>
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
              TUESDAY, OCTOBER 28, 2025
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
                      ? 'border-green-500 ring-4 ring-green-200' 
                      : 'border-transparent hover:border-green-200'
                  } group`}
                >
                  {/* Selected Badge */}
                  {isSelected && (
                    <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg animate-bounce-slow">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  {/* Volunteer Badge */}
                  <div className="absolute top-6 left-6 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full text-xs font-bold text-white">
                    Volunteer Access
                  </div>

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
                    <p className="text-green-600 font-semibold">{formatDateTime(event.date, event.time)}</p>
                    <p className="text-gray-500 text-sm">{getTimeUntilEvent(event.date, event.time)}</p>
                  </div>

                  {/* Features */}
                  <div className="space-y-2 text-center">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Full performance
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      All dance groups
                    </div>
                    <div className="flex items-center text-sm text-yellow-600">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                      +2 volunteer tickets
                    </div>
                  </div>

                  {/* Select Indicator */}
                  <div className={`mt-4 pt-4 border-t-2 ${isSelected ? 'border-green-200' : 'border-gray-200'}`}>
                    <span className={`font-semibold ${isSelected ? 'text-green-600' : 'text-gray-600'}`}>
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
              THURSDAY, OCTOBER 30, 2025
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
                      ? 'border-green-500 ring-4 ring-green-200' 
                      : 'border-transparent hover:border-green-200'
                  } group`}
                >
                  {/* Selected Badge */}
                  {isSelected && (
                    <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg animate-bounce-slow">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}

                  {/* Volunteer Badge */}
                  <div className="absolute top-6 left-6 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full text-xs font-bold text-white">
                    Volunteer Access
                  </div>

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
                    <p className="text-green-600 font-semibold">{formatDateTime(event.date, event.time)}</p>
                    <p className="text-gray-500 text-sm">{getTimeUntilEvent(event.date, event.time)}</p>
                  </div>

                  {/* Features */}
                  <div className="space-y-2 text-center">
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Full performance
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      All dance groups
                    </div>
                    <div className="flex items-center text-sm text-yellow-600">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                      +2 volunteer tickets
                    </div>
                  </div>

                  {/* Select Indicator */}
                  <div className={`mt-4 pt-4 border-t-2 ${isSelected ? 'border-green-200' : 'border-gray-200'}`}>
                    <span className={`font-semibold ${isSelected ? 'text-green-600' : 'text-gray-600'}`}>
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
            className="w-full py-5 px-8 bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group relative overflow-hidden"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
            
            <span className="relative flex items-center justify-center space-x-2">
              <span>Continue to Volunteer Checkout</span>
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
              <p className="text-gray-600">Everything you need to know about volunteer ticket purchases</p>
            </div>
            
            <div className="space-y-4">
              {/* Q&A Categories */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Basics & Rules */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Basics & Rules</h3>
                  
                  <FAQItem 
                    question="I'm volunteering - do I get tickets?"
                    answer="Yes! As a thank you, you can reserve up to 4 tickets per show to WATCH with your family (not for the show you're working)."
                  />
                  
                  <FAQItem 
                    question="Do I need a ticket for the show I'm volunteering at?"
                    answer="No! You'll be working during that show, so you don't need tickets for it. Your tickets are for OTHER shows you want to watch."
                  />
                  
                  <FAQItem 
                    question="How many tickets do I get?"
                    answer="You can get up to 4 tickets per show you attend: 2 regular tickets (Reserved or GA) + 2 bonus volunteer tickets (GA only)."
                  />
                  
                  <FAQItem 
                    question="Can I attend multiple shows?"
                    answer="Yes! You can select one show per night: One show on October 28 (either 5:30 PM OR 6:30 PM) and one show on October 30 (either 5:30 PM OR 6:30 PM)."
                  />
                </div>

                {/* Ticket Options & Pricing */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Ticket Options & Pricing</h3>
                  
                  <FAQItem 
                    question="What's the difference between my regular and bonus tickets?"
                    answer="Regular tickets (2): Can be Reserved Seating ($25) or General Admission (FREE). Bonus tickets (2): Must be General Admission (FREE) - this is your volunteer thank you!"
                  />
                  
                  <FAQItem 
                    question="What are my ticket options?"
                    answer="You have two options at checkout: All Free: 4 General Admission tickets (FREE) or Mixed: 2 Reserved Seats ($25 each) + 2 General Admission (FREE)."
                  />
                  
                  <FAQItem 
                    question="Can I get 4 reserved seats?"
                    answer="No. Your 2 bonus volunteer tickets must be General Admission. You can only purchase up to 2 reserved seats (using your regular ticket allocation)."
                  />
                  
                  <FAQItem 
                    question="How much do I pay?"
                    answer="It depends on your ticket selection: 4 GA tickets: FREE ($0) or 2 Reserved + 2 GA: $50 ($25 × 2 reserved seats)."
                  />
                </div>

                {/* Show Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Show Selection</h3>
                  
                  <FAQItem 
                    question="Can I attend both shows on the same night?"
                    answer="No. Just like regular families, you can only select ONE show per night (either 5:30 PM OR 6:30 PM)."
                  />
                  
                  <FAQItem 
                    question="Can I attend shows on both October 28 AND October 30?"
                    answer="Yes! You can select: One show on October 28 (2 tickets) and one show on October 30 (2 tickets). PLUS your 2 additional tickets that can be used to get a total of 4 tickets on the night of your choice! (These can only be redeemed for for one night, not both)"
                  />
                  
                  <FAQItem 
                    question="What if my volunteer shift is Tuesday 5:30 PM?"
                    answer="You can attend: Tuesday 6:30 PM (up to 4 tickets), OR Thursday 5:30 PM (up to 4 tickets), OR Thursday 6:30 PM (up to 4 tickets). Or shows on both nights!"
                  />
                  
                  <FAQItem 
                    question="What if I only need 2 tickets?"
                    answer="That's fine! You can choose to use just your 2 regular tickets and skip the bonus tickets if you don't need them."
                  />
                </div>

                {/* Family & Children */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Family & Children</h3>
                  
                  <FAQItem 
                    question="Do my young children need tickets?"
                    answer="Children 2 and under who sit on a lap don't need tickets. Everyone else (age 3+) needs a ticket."
                  />
                  
                  <FAQItem 
                    question="I have 5 family members - can I get more than 4 tickets?"
                    answer="Up to an additional 4 tickets may be purchased one week prior to the show, while supplies last."
                  />
                  
                  <FAQItem 
                    question="Can I bring guests who aren't family?"
                    answer="Yes! Your tickets can be used by anyone you choose."
                  />
                  
                  <FAQItem 
                    question="Can I get a refund?"
                    answer="Yes, refunds are available up to 2 days (48 hours) before each show. After that, no refunds."
                  />
                </div>

                {/* Volunteer Duties */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Volunteer Duties</h3>
                  
                  <FAQItem 
                    question="When is my volunteer shift?"
                    answer="Check your volunteer confirmation email for your specific shift date and time. You'll receive separate instructions about your volunteer duties."
                  />
                  
                  <FAQItem 
                    question="What will I be doing as a volunteer?"
                    answer="You'll be helping in classrooms with students during the show. We'll send detailed instructions closer to the event."
                  />
                  
                  <FAQItem 
                    question="Can I watch part of the show I'm volunteering for?"
                    answer="Your volunteer assignment will keep you busy during that show. Use your tickets to watch a different show time!"
                  />
                </div>

                {/* Technical Questions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">Technical Questions</h3>
                  
                  <FAQItem 
                    question="Can I purchase tickets on my phone?"
                    answer="Yes! The volunteer portal works on all devices - phones, tablets, and computers."
                  />
                  
                  <FAQItem 
                    question="I'm having trouble with checkout - help!"
                    answer="Try refreshing the page, using a different browser, checking your internet connection, or contacting us at maiduelementaryptc@gmail.com or call 916-749-0848."
                  />
                  
                  <FAQItem 
                    question="Can I change my ticket selection after purchase?"
                    answer="Refunds are available up to 48 hours before the show. For changes, you'll need to request a refund and make a new purchase (subject to availability)."
                  />
                  
                  <FAQItem 
                    question="When will I receive my tickets?"
                    answer="Digital tickets will be emailed to you immediately after checkout. Show them on your phone at the door."
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
