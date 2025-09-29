import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { formatDateTime } from '../../utils/dateUtils';

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
      const response = await api.post('/issue-intent', {
        eventKey,
        ticketsRequested: 1 // This would come from the selection process
      });
      
      setPurchaseData(response.data);
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
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Complete Your Purchase
        </h1>
        
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium text-blue-900 mb-2">Event Details</h3>
          <p className="text-blue-700">
            <strong>{currentEvent.name}</strong><br />
            {formatDateTime(currentEvent.date, currentEvent.time)}
          </p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Important: Complete your purchase in the Sprouter checkout below
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Your purchase intent has been created. Please complete the checkout process in the embedded form below to secure your tickets.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sprouter Embed */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Sprouter Checkout
        </h2>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Complete Your Purchase
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Use the secure checkout below to complete your ticket purchase.
            </p>
          </div>
          
          {/* Sprouter Embed */}
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  src={purchaseData.sprouterUrl}
                  className="w-full h-[700px]"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation"
                  loading="lazy"
                  allowFullScreen
                  title="Sprouter Checkout"
                  referrerPolicy="no-referrer"
                />
              </div>
          
          <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
            <span>Intent ID: {purchaseData.intentId}</span>
            <a
              href={purchaseData.sprouterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 underline"
            >
              Open in new tab
            </a>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => navigate('/select')}
          className="btn-secondary"
        >
          Back to Selection
        </button>
        <button
          onClick={() => navigate('/status')}
          className="btn-primary"
        >
          View Purchase Status
        </button>
      </div>
    </div>
  );
}
