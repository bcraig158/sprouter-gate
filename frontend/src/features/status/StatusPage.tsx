import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface PurchaseStatus {
  id: string;
  eventKey: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  ticketsRequested: number;
  status: 'pending' | 'completed' | 'cancelled';
  purchaseDate: string;
  sprouterUrl?: string;
}

export default function StatusPage() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<PurchaseStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPurchaseStatus();
  }, []);

  const fetchPurchaseStatus = async () => {
    try {
      // Always use real API for production tracking
      const response = await api.get('/purchases');
      setPurchases(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load purchase status');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'pending':
        return '⏳';
      case 'cancelled':
        return '❌';
      default:
        return '❓';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 relative overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your purchase status...</p>
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

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent mb-3">
            Your Purchase Status
          </h1>
          <p className="text-gray-600 text-lg">Track your ticket purchases and show details</p>
        </div>

        {/* Event Information Banner */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl shadow-xl p-6 mb-8 text-white">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">Starstruck Presents: So You Think You Can Dance!</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold mb-1">📍 Location:</p>
                  <p className="text-purple-100">Maidu Elementary School<br />1950 Johnson Ranch Drive, Roseville, CA 95661</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">🎫 Entry Information:</p>
                  <p className="text-purple-100">Digital tickets shown on phone<br />Children 2 and under free (lap seating)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Important Dates Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-xl p-6 mb-8 text-white">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-2">Important Dates & Information</h3>
              <div className="grid md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-semibold mb-1">📅 Sales Open:</p>
                  <p className="text-orange-100">October 13, 2025</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">🎫 Extra Tickets:</p>
                  <p className="text-orange-100">October 20, 2025</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">🚫 Sales Close:</p>
                  <p className="text-orange-100">Oct 28 & 30 at 4PM</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">💸 Refunds:</p>
                  <p className="text-orange-100">Up to 2 days before event</p>
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

        {purchases.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 text-center">
            <div className="text-6xl mb-4">🎫</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">No Purchases Yet</h3>
            <p className="text-gray-600 mb-6">
              You haven't made any ticket purchases yet. Select a show time to get started!
            </p>
            <button
              onClick={() => navigate('/select')}
              className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:shadow-lg transform hover:scale-105 transition-all"
            >
              Browse Shows
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {purchases.map((purchase) => (
              <div key={purchase.id} className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/20">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{purchase.eventName}</h3>
                    <p className="text-gray-600 mb-2">
                      📅 {purchase.eventDate} at {purchase.eventTime}
                    </p>
                    <p className="text-gray-500 text-sm">
                      Purchased on {new Date(purchase.purchaseDate).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(purchase.status)}`}>
                      {getStatusIcon(purchase.status)} {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Tickets</h4>
                    <p className="text-2xl font-bold text-purple-600">{purchase.ticketsRequested}</p>
                    <p className="text-sm text-gray-500">tickets requested</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Event ID</h4>
                    <p className="text-sm font-mono text-gray-600">{purchase.eventKey}</p>
                  </div>
                </div>

                {purchase.status === 'pending' && purchase.sprouterUrl && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-blue-500 mt-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <h4 className="font-semibold text-blue-800 mb-1">Complete Your Purchase</h4>
                        <p className="text-blue-700 text-sm mb-3">
                          Your ticket reservation is pending. Complete your payment to secure your tickets.
                        </p>
                        <a
                          href={purchase.sprouterUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Complete Payment
                          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {purchase.status === 'completed' && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <h4 className="font-semibold text-green-800 mb-1">Purchase Complete!</h4>
                        <p className="text-green-700 text-sm">
                          Your tickets have been confirmed. You should receive a confirmation email shortly.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button
            onClick={() => navigate('/select')}
            className="flex-1 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white py-4 px-6 rounded-2xl font-bold hover:shadow-lg transform hover:scale-105 transition-all"
          >
            Browse More Shows
          </button>
          
          <button
            onClick={fetchPurchaseStatus}
            className="flex-1 bg-white/90 backdrop-blur-sm text-gray-700 py-4 px-6 rounded-2xl font-semibold border-2 border-gray-200 hover:border-purple-300 transition-all"
          >
            Refresh Status
          </button>
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