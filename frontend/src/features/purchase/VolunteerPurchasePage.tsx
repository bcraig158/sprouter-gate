import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { getMockSprouterUrls } from '../../utils/mockData';

interface PurchaseResponse {
  success: boolean;
  intentId: string;
  sprouterUrl: string;
  eventKey: string;
  ticketsRequested: number;
}

export default function VolunteerPurchasePage() {
  const { eventKey } = useParams<{ eventKey: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [purchaseData, setPurchaseData] = useState<PurchaseResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not authenticated or not a volunteer
  useEffect(() => {
    if (!user) {
      navigate('/volunteer-login');
    } else if (!user.isVolunteer) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (eventKey) {
      handleIssueIntent();
    }
  }, [eventKey]);

  const handleIssueIntent = async () => {
    if (!eventKey) return;
    
    setIsLoading(true);
    setError('');

    try {
      if (import.meta.env.PROD) {
        // Production mode - use mock Sprouter URLs with volunteer benefits
        const mockSprouterUrls = getMockSprouterUrls();
        const mockData = {
          success: true,
          intentId: `volunteer_intent_${Date.now()}`,
          sprouterUrl: mockSprouterUrls[eventKey as keyof typeof mockSprouterUrls],
          eventKey,
          ticketsRequested: 4 // Volunteers get 4 tickets (2 base + 2 volunteer bonus)
        };
        setPurchaseData(mockData);
      } else {
        // Development mode - use API
        const response = await api.post('/issue-intent', {
          eventKey,
          ticketsRequested: 4 // Volunteers get 4 tickets
        });
        setPurchaseData(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create purchase intent');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSelect = () => {
    navigate('/volunteer-select');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 relative overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Preparing your volunteer checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 relative overflow-hidden flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <h2 className="text-xl font-bold text-red-800">Checkout Error</h2>
            </div>
            <p className="text-red-700 mb-4">{error}</p>
            <button 
              onClick={handleBackToSelect}
              className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
            >
              Back to Selection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!purchaseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 relative overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No purchase data available</p>
          <button 
            onClick={handleBackToSelect}
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
          >
            Back to Selection
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

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <button 
            onClick={handleBackToSelect}
            className="inline-flex items-center text-green-600 hover:text-green-700 font-semibold mb-4 group"
          >
            <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Selection
          </button>
          
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Volunteer Checkout
          </h1>
          <p className="text-gray-600 text-lg">Complete your volunteer ticket purchase</p>
        </div>

        {/* Volunteer Benefits Banner */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl shadow-xl p-6 mb-8 text-white">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">⭐ Volunteer Benefits Applied</h3>
              <p className="text-yellow-50 text-sm mb-2">
                You're receiving 4 tickets total (2 base + 2 volunteer bonus) for FREE
              </p>
              <p className="text-yellow-100 text-xs">
                Thank you for volunteering! Your extra tickets are included at no cost.
              </p>
            </div>
          </div>
        </div>

        {/* Purchase Information */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Starstruck Presents: So You Think You Can Dance!</h2>
            <p className="text-gray-600">📍 Maidu Elementary School, 1950 Johnson Ranch Drive, Roseville, CA 95661</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Ticket Summary */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 text-lg mb-4">Your Volunteer Tickets</h3>
              
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">Base Tickets (2):</span>
                  <span className="font-bold text-green-600">FREE</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">Volunteer Bonus (2):</span>
                  <span className="font-bold text-yellow-600">FREE</span>
                </div>
                <div className="border-t border-green-300 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800">Total (4 tickets):</span>
                    <span className="font-bold text-green-600 text-lg">FREE</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Optional Upgrades</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Preferred Seating (per ticket):</span>
                    <span className="font-semibold text-purple-600">$25</span>
                  </div>
                  <p className="text-xs text-gray-500">First 2 rows - upgrade available at checkout</p>
                </div>
              </div>
            </div>

            {/* Event Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 text-lg mb-4">Event Details</h3>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <img 
                    src="/EventBanner.png" 
                    alt="So You Think You Can Dance" 
                    className="w-16 h-10 object-cover rounded-lg shadow-md"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-800">Show Performance</h4>
                    <p className="text-sm text-gray-600">Full dance showcase</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    All dance groups performing
                  </div>
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Professional lighting & sound
                  </div>
                  <div className="flex items-center text-yellow-600">
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    Volunteer priority access
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sprouter Integration */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Complete Your Purchase</h3>
            <p className="text-gray-600">You'll be redirected to our secure checkout system</p>
          </div>

          <div className="max-w-md mx-auto">
            <button
              onClick={() => window.open(purchaseData.sprouterUrl, '_blank')}
              className="w-full py-5 px-8 bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 group relative overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
              
              <span className="relative flex items-center justify-center space-x-2">
                <span>Proceed to Volunteer Checkout</span>
                <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>

            <p className="text-center text-sm text-gray-500 mt-4">
              Secure checkout powered by Sprouter
            </p>
          </div>
        </div>

        {/* Help Section */}
        <div className="max-w-2xl mx-auto bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            Volunteer Support
          </h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Need help with your volunteer tickets? Contact us at <a href="mailto:maiduelementaryptc@gmail.com" className="text-green-600 hover:text-green-700 font-semibold hover:underline">maiduelementaryptc@gmail.com</a> or call during business hours. Thank you for volunteering!
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
      `}</style>
    </div>
  );
}
