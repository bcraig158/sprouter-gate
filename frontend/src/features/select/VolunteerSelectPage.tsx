import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { formatDateTime, getTimeUntilEvent } from '../../utils/dateUtils';
import { getMockState } from '../../utils/mockData';

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
      if (import.meta.env.PROD) {
        // Production mode - use mock data with volunteer benefits
        const mockState = getMockState(user?.householdId || 'VOL_123');
        // Override to ensure volunteer benefits
        mockState.isVolunteer = true;
        mockState.allowance.isVolunteer = true;
        mockState.allowance.volunteerBonus = 2;
        mockState.allowance.totalAllowance = mockState.allowance.baseAllowance + mockState.allowance.volunteerBonus;
        setState(mockState);
      } else {
        // Development mode - use API
        const response = await api.get('/state');
        setState(response.data);
      }
    } catch (err) {
      setError('Failed to load your current state');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSlot = async (night: 'tue' | 'thu', eventKey: string) => {
    try {
      if (import.meta.env.PROD) {
        // Production mode - skip API call and go directly to purchase
        navigate(`/purchase/${eventKey}`);
      } else {
        // Development mode - use API
        await api.post('/select-slot', {
          night,
          eventKey,
          ticketsRequested
        });
        
        // Refresh state
        await fetchState();
        
        // Navigate to purchase page
        navigate(`/purchase/${eventKey}`);
      }
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
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
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
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="font-bold text-yellow-800 mb-2">YOUR VOLUNTEER SHIFT:</h3>
              <p className="text-yellow-700 text-sm mb-2">
                {/* This would be populated from the volunteer's shift data */}
                Tuesday, October 28 - 5:30 PM (Example)
              </p>
              <p className="text-yellow-600 text-xs">
                Select different show times to watch.
              </p>
            </div>
          </div>
        </div>

        {/* Consolidated Information Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Starstruck Presents: So You Think You Can Dance!</h2>
            <p className="text-gray-600">📍 Maidu Elementary School, 1950 Johnson Ranch Drive, Roseville, CA 95661</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Volunteer Ticket Rules */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Volunteer Ticket Rules
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Up to 4 tickets per family per night (2 base + 2 volunteer bonus)</li>
                <li>• Choose ONE show time only</li>
                <li>• Children 2 & under free (lap seating)</li>
                <li>• Volunteer tickets are FREE</li>
              </ul>
            </div>

            {/* Ticket Options */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Ticket Options
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>General Admission:</span>
                  <span className="font-semibold text-green-600">FREE</span>
                </div>
                <div className="flex justify-between">
                  <span>Preferred Seating:</span>
                  <span className="font-semibold text-purple-600">$25</span>
                </div>
                <div className="flex justify-between">
                  <span>Volunteer Bonus:</span>
                  <span className="font-semibold text-yellow-600">+2 FREE</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Preferred seating in first 2 rows</p>
              </div>
            </div>

            {/* Volunteer Info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                Volunteer Access
              </h3>
              <p className="text-sm text-gray-600">
                As a volunteer, you receive additional 2 FREE tickets per night. These will be automatically added to your cart at checkout.
              </p>
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
                  <div className="space-y-2 text-left">
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
                  <div className="space-y-2 text-left">
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

        {/* Comprehensive Q&A Section */}
        <div className="max-w-4xl mx-auto mt-12 bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center flex items-center justify-center">
            <svg className="w-6 h-6 mr-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            📋 COMPLETE Q&A - VOLUNTEER TICKETS
          </h3>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* BASICS Section */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-blue-800 border-b-2 border-blue-200 pb-2">BASICS</h4>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-800">Q: I'm volunteering - do I get tickets?</p>
                  <p className="text-gray-600 text-sm">A: Yes! As a thank you, you can reserve up to 4 tickets per show to WATCH with your family (not for the show you're working).</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: Do I need a ticket for the show I'm volunteering at?</p>
                  <p className="text-gray-600 text-sm">A: No! You'll be working during that show, so you don't need tickets for it. Your tickets are for OTHER shows you want to watch.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: How many tickets do I get?</p>
                  <p className="text-gray-600 text-sm">A: You can get up to 4 tickets per show you attend:<br/>• 2 regular tickets (Reserved or GA)<br/>• 2 bonus volunteer tickets (GA only)</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: Can I attend multiple shows?</p>
                  <p className="text-gray-600 text-sm">A: Yes! You can select one show per night:<br/>• One show on October 28 (either 5:30 PM OR 6:30 PM)<br/>• One show on October 30 (either 5:30 PM OR 6:30 PM)</p>
                </div>
              </div>
            </div>

            {/* TICKET SELECTION Section */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-green-800 border-b-2 border-green-200 pb-2">TICKET SELECTION</h4>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-800">Q: What's the difference between my "regular" and "bonus" tickets?</p>
                  <p className="text-gray-600 text-sm">A: Regular tickets (2): Can be Reserved Seating ($25) or General Admission (FREE)<br/>Bonus tickets (2): Must be General Admission (FREE) - this is your volunteer thank you!</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: What are my ticket options?</p>
                  <p className="text-gray-600 text-sm">A: You have two options at checkout:<br/>• All Free: 4 General Admission tickets (FREE)<br/>• Mixed: 2 Reserved Seats ($25 each) + 2 General Admission (FREE)</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: Can I get 4 reserved seats?</p>
                  <p className="text-gray-600 text-sm">A: No. Your 2 bonus volunteer tickets must be General Admission. You can only purchase up to 2 reserved seats (using your regular ticket allocation).</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: What if I only need 2 tickets?</p>
                  <p className="text-gray-600 text-sm">A: That's fine! You can choose to use just your 2 regular tickets and skip the bonus tickets if you don't need them.</p>
                </div>
              </div>
            </div>

            {/* SHOW SELECTION Section */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-purple-800 border-b-2 border-purple-200 pb-2">SHOW SELECTION</h4>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-800">Q: Can I attend both shows on the same night?</p>
                  <p className="text-gray-600 text-sm">A: No. Just like regular families, you can only select ONE show per night (either 5:30 PM OR 6:30 PM).</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: Can I attend shows on both October 28 AND October 30?</p>
                  <p className="text-gray-600 text-sm">A: Yes! You can select:<br/>• One show on October 28 (up to 4 tickets)<br/>• One show on October 30 (up to 4 tickets)<br/>Total: Up to 8 tickets across both nights</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: What if my volunteer shift is Tuesday 5:30 PM?</p>
                  <p className="text-gray-600 text-sm">A: You can attend:<br/>• Tuesday 6:30 PM (up to 4 tickets), OR<br/>• Thursday 5:30 PM (up to 4 tickets), OR<br/>• Thursday 6:30 PM (up to 4 tickets)<br/>Or shows on both nights!</p>
                </div>
              </div>
            </div>

            {/* LOGIN & ACCESS Section */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-orange-800 border-b-2 border-orange-200 pb-2">LOGIN & ACCESS</h4>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-800">Q: How do I access my volunteer tickets?</p>
                  <p className="text-gray-600 text-sm">A: Check your email for your 6-digit volunteer code, go to the volunteer portal, enter your code and email address, then select your show(s) and tickets.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: What if I forgot my volunteer code?</p>
                  <p className="text-gray-600 text-sm">A: Contact us at <a href="mailto:maiduelementaryptc@gmail.com" className="text-green-600 hover:text-green-700 font-semibold hover:underline">maiduelementaryptc@gmail.com</a> or call <a href="tel:916-749-0848" className="text-green-600 hover:text-green-700 font-semibold hover:underline">916-749-0848</a> and we'll resend it.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: Can someone else use my volunteer code?</p>
                  <p className="text-gray-600 text-sm">A: No. Each code is unique to one volunteer and can only be used with the registered email address.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: My code isn't working - what should I do?</p>
                  <p className="text-gray-600 text-sm">A: Make sure you're entering all 6 digits correctly and using the email address you registered with. If issues persist, contact us at <a href="mailto:maiduelementaryptc@gmail.com" className="text-green-600 hover:text-green-700 font-semibold hover:underline">maiduelementaryptc@gmail.com</a> or call <a href="tel:916-749-0848" className="text-green-600 hover:text-green-700 font-semibold hover:underline">916-749-0848</a>.</p>
                </div>
              </div>
            </div>

            {/* CHECKOUT & PAYMENT Section */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-red-800 border-b-2 border-red-200 pb-2">CHECKOUT & PAYMENT</h4>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-800">Q: How much do I pay?</p>
                  <p className="text-gray-600 text-sm">A: It depends on your ticket selection:<br/>• 4 GA tickets: FREE ($0)<br/>• 2 Reserved + 2 GA: $50 ($25 × 2 reserved seats)</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: Do I pay separately for each show?</p>
                  <p className="text-gray-600 text-sm">A: Yes. If you're attending shows on both October 28 and October 30, you'll complete separate checkouts for each night.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: Can I get a refund?</p>
                  <p className="text-gray-600 text-sm">A: Yes, refunds are available up to 2 days (48 hours) before each show. After that, no refunds.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: When will I receive my tickets?</p>
                  <p className="text-gray-600 text-sm">A: Digital tickets will be emailed to you immediately after checkout. Show them on your phone at the door.</p>
                </div>
              </div>
            </div>

            {/* FAMILY & CHILDREN Section */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-indigo-800 border-b-2 border-indigo-200 pb-2">FAMILY & CHILDREN</h4>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-800">Q: Do my young children need tickets?</p>
                  <p className="text-gray-600 text-sm">A: Children 2 and under who sit on a lap don't need tickets. Everyone else (age 3+) needs a ticket.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: I have 5 family members - can I get more than 4 tickets?</p>
                  <p className="text-gray-600 text-sm">A: Your volunteer bonus gives you up to 4 tickets per show. If you need more, contact us at <a href="mailto:maiduelementaryptc@gmail.com" className="text-green-600 hover:text-green-700 font-semibold hover:underline">maiduelementaryptc@gmail.com</a> or call <a href="tel:916-749-0848" className="text-green-600 hover:text-green-700 font-semibold hover:underline">916-749-0848</a> to discuss options, subject to availability.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: Can I bring guests who aren't family?</p>
                  <p className="text-gray-600 text-sm">A: Yes! Your tickets can be used by anyone you choose.</p>
                </div>
              </div>
            </div>

            {/* VOLUNTEER DUTIES Section */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-teal-800 border-b-2 border-teal-200 pb-2">VOLUNTEER DUTIES</h4>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-800">Q: When is my volunteer shift?</p>
                  <p className="text-gray-600 text-sm">A: Check your volunteer confirmation email for your specific shift date and time. You'll receive separate instructions about your volunteer duties.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: What will I be doing as a volunteer?</p>
                  <p className="text-gray-600 text-sm">A: You'll be helping in classrooms with students during the show. We'll send detailed instructions closer to the event.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: Can I watch part of the show I'm volunteering for?</p>
                  <p className="text-gray-600 text-sm">A: Your volunteer assignment will keep you busy during that show. Use your tickets to watch a different show time!</p>
                </div>
              </div>
            </div>

            {/* TECHNICAL QUESTIONS Section */}
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-pink-800 border-b-2 border-pink-200 pb-2">TECHNICAL QUESTIONS</h4>
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-gray-800">Q: Can I purchase tickets on my phone?</p>
                  <p className="text-gray-600 text-sm">A: Yes! The volunteer portal works on all devices - phones, tablets, and computers.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: I'm having trouble with checkout - help!</p>
                  <p className="text-gray-600 text-sm">A: Try refreshing the page, using a different browser, checking your internet connection, or contacting us at <a href="mailto:maiduelementaryptc@gmail.com" className="text-green-600 hover:text-green-700 font-semibold hover:underline">maiduelementaryptc@gmail.com</a> or call <a href="tel:916-749-0848" className="text-green-600 hover:text-green-700 font-semibold hover:underline">916-749-0848</a>.</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Q: Can I change my ticket selection after purchase?</p>
                  <p className="text-gray-600 text-sm">A: Refunds are available up to 48 hours before the show. For changes, you'll need to request a refund and make a new purchase (subject to availability).</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="mt-8 pt-6 border-t-2 border-gray-200 text-center">
            <p className="text-gray-600 text-sm">
              <span className="inline-flex items-center space-x-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>Still have questions?</span>
              </span>
              <br />
                <a href="mailto:maiduelementaryptc@gmail.com" className="text-green-600 hover:text-green-700 font-semibold hover:underline">
                Contact us at maiduelementaryptc@gmail.com
              </a>
              <br />
              <a href="tel:916-749-0848" className="text-green-600 hover:text-green-700 font-semibold hover:underline">
                Or call 916-749-0848
              </a>
            </p>
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
