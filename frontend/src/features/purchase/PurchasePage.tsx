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

export default function PurchasePage() {
  const { eventKey } = useParams<{ eventKey: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [purchaseData, setPurchaseData] = useState<PurchaseResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
        // Production mode - use mock Sprouter URLs
        const mockSprouterUrls = getMockSprouterUrls();
        const mockData = {
          success: true,
          intentId: `intent_${Date.now()}`,
          sprouterUrl: mockSprouterUrls[eventKey as keyof typeof mockSprouterUrls],
          eventKey,
          ticketsRequested: 1
        };
        setPurchaseData(mockData);
      } else {
        // Development mode - use API
        const response = await api.post('/issue-intent', {
          eventKey,
          ticketsRequested: 1 // This would come from the selection process
        });
        setPurchaseData(response.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create purchase intent');
    } finally {
      setIsLoading(false);
    }
  };

  const eventInfo = {
    'tue-530': { name: 'Tuesday 5:30 PM', date: '2025-10-28', time: '17:30' },
    'tue-630': { name: 'Tuesday 6:30 PM', date: '2025-10-28', time: '18:30' },
    'thu-530': { name: 'Thursday 5:30 PM', date: '2025-10-30', time: '17:30' },
    'thu-630': { name: 'Thursday 6:30 PM', date: '2025-10-30', time: '18:30' },
  };

  const currentEvent = eventKey ? eventInfo[eventKey as keyof typeof eventInfo] : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Creating your purchase intent...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Purchase Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/select')}
            className="btn-primary"
          >
            Back to Selection
          </button>
        </div>
      </div>
    );
  }

  if (!purchaseData || !currentEvent) {
    return (
      <div className="card">
        <div className="text-center">
          <p className="text-gray-600">Invalid event or purchase data</p>
          <button
            onClick={() => navigate('/select')}
            className="btn-primary mt-4"
          >
            Back to Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Minimal header with navigation only */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate('/select')}
            className="text-sm text-gray-600 hover:text-gray-800 underline flex items-center font-medium"
          >
            ← Back to Selection
          </button>
          <div className="text-sm text-gray-700 font-semibold">
            Maidu Elementary School
          </div>
          <button
            onClick={() => navigate('/logout')}
            className="text-sm text-gray-600 hover:text-gray-800 underline font-medium"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Ticket Limit Instructions */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          {user?.isVolunteer ? (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">Volunteer Ticket Limits</h3>
                  <p className="text-yellow-700 text-sm leading-relaxed">
                    <strong>You may select:</strong> 2 Reserved paid seats + 2 GA tickets OR up to 4 GA tickets total.<br/>
                    <strong>You CANNOT select 4 Reserved seats.</strong> Any tickets purchased outside of these tolerances will be canceled and you will only be able to use the limited amount of tickets.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">Student/Family Ticket Limits</h3>
                  <p className="text-blue-700 text-sm leading-relaxed">
                    <strong>You may select:</strong> 2 Reserved seats OR 2 GA tickets total.<br/>
                    Any tickets purchased outside of these tolerances will be canceled and you will only be able to use the correct amount of tickets.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full-screen Sprouter Embed */}
      <div className="flex-1 w-full min-h-[calc(100vh-120px)]">
        <iframe
          src={purchaseData.sprouterUrl}
          className="w-full h-full min-h-[800px]"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
          loading="lazy"
          allowFullScreen
          title="Sprouter Checkout"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}
