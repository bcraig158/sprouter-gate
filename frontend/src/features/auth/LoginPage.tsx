import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const [studentId, setStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const success = await login(studentId);
      if (success) {
        navigate('/select');
      } else {
        setError('Invalid Student ID. Please try again.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your Student ID to access Sprouter events
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="studentId" className="sr-only">
              Student ID
            </label>
            <input
              id="studentId"
              name="studentId"
              type="text"
              required
              className="input-field"
              placeholder="Enter your Student ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Event Information
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Tuesday, October 28, 2025:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• 5:30 PM Show</li>
                <li>• 6:30 PM Show</li>
              </ul>
              <p className="mt-3"><strong>Thursday, October 30, 2025:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• 5:30 PM Show</li>
                <li>• 6:30 PM Show</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
