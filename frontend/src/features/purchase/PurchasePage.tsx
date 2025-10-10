import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

      {/* Full-screen Sprouter Embed */}
      <div className="flex-1 w-full min-h-[calc(100vh-60px)]">
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
