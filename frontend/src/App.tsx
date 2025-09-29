import { useState } from 'react';

function App() {
  const [studentId, setStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState({
    tuesday: '',
    thursday: ''
  });
  const [showSprouter, setShowSprouter] = useState(false);
  const [currentSprouterUrl, setCurrentSprouterUrl] = useState('');

  // Sprouter URLs from your configuration
  const sprouterUrls = {
    tue530: 'https://events.sprouter.online/events/MTAvMjhALTU6MzBwbUAtfEAtc29ALXlvdUAtdGhpbmtALXlvdUAtY2FuQC1kYW5jZSFALTZmNGVjMmI4OWM4ZjcxYjhiN2UwYzl5eWVrMzUxcw==',
    tue630: 'https://events.sprouter.online/events/MTAvMjhALTY6MzBALXBtQC18QC1zb0AteW91QC10aGlua0AteW91QC1jYW5ALWRhbmNlIUAtNjY1M2NjNjZjZmNiOWRjYTEzNGJhYmZ5ZWszNTZz',
    thu530: 'https://events.sprouter.online/events/MTAvMzBALTU6MzBwbUAtfEAtc29ALXlvdUAtdGhpbmtALXlvdUAtY2FuQC1kYW5jZSFALTAwYzQ5NDQ2ZjBjZGI4MGExMmQ4YWV5eWVrMzU3cw==',
    thu630: 'https://events.sprouter.online/events/MTAvMzBALTY6MzBwbUAtfEAtc29ALXlvdUAtdGhpbmtALXlvdUAtY2FuQC1kYW5jZSFALTE4ZjM4MWM0M2Y0ODU5YjQzZmVjMWN5eWVrMzU4cw=='
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate login process
    setTimeout(() => {
      if (studentId.trim()) {
        setIsLoggedIn(true);
        setError('');
      } else {
        setError('Please enter a Student ID');
      }
      setIsLoading(false);
    }, 1000);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setStudentId('');
    setSelectedEvents({ tuesday: '', thursday: '' });
    setShowSprouter(false);
  };

  const handleEventSelection = (day: 'tuesday' | 'thursday', time: string) => {
    setSelectedEvents(prev => {
      // If clicking the same time, deselect it
      if (prev[day] === time) {
        return {
          tuesday: '',
          thursday: ''
        };
      } else {
        // Clear all selections and select the new one
        return {
          tuesday: day === 'tuesday' ? time : '',
          thursday: day === 'thursday' ? time : ''
        };
      }
    });
  };

  const handleRequestTickets = () => {
    // Check if any show is selected
    const hasSelection = selectedEvents.tuesday || selectedEvents.thursday;
    if (!hasSelection) {
      alert('Please select a show time first!');
      return;
    }

    // Determine which day and time is selected
    let day: 'tuesday' | 'thursday';
    let time: string;
    
    if (selectedEvents.tuesday) {
      day = 'tuesday';
      time = selectedEvents.tuesday;
    } else {
      day = 'thursday';
      time = selectedEvents.thursday;
    }

    const eventKey = `${day === 'tuesday' ? 'tue' : 'thu'}${time}`;
    const sprouterUrl = sprouterUrls[eventKey as keyof typeof sprouterUrls];
    
    if (sprouterUrl) {
      setCurrentSprouterUrl(sprouterUrl);
      setShowSprouter(true);
    } else {
      alert('Event URL not found. Please try again.');
    }
  };

  const handleCloseSprouter = () => {
    setShowSprouter(false);
    setCurrentSprouterUrl('');
  };

  if (showSprouter) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ 
          backgroundColor: '#dbeafe', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #93c5fd',
          marginBottom: '20px'
        }}>
          <h1 style={{ color: '#1e40af', fontSize: '1.5rem', marginBottom: '1rem' }}>
            🎫 Sprouter Checkout
          </h1>
          <p style={{ color: '#1e40af', marginBottom: '1rem' }}>
            Complete your ticket purchase below. You can close this window to return to event selection.
          </p>
          <button 
            onClick={handleCloseSprouter}
            style={{
              backgroundColor: '#6b7280',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            ← Back to Event Selection
          </button>
        </div>

        <div style={{ 
          backgroundColor: 'white', 
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <iframe
            src={currentSprouterUrl}
            width="100%"
            height="800px"
            frameBorder="0"
            title="Sprouter Checkout"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      </div>
    );
  }

  if (isLoggedIn) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ 
          backgroundColor: '#dbeafe', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #93c5fd',
          marginBottom: '20px'
        }}>
          <h1 style={{ color: '#1e40af', fontSize: '1.5rem', marginBottom: '1rem' }}>
            🎉 Welcome! You're logged in as Student ID: {studentId}
          </h1>
          <button 
            onClick={handleLogout}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>

        {/* Banner Image */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img 
            src="/EventBanner.png" 
            alt="Starstruck Presents Banner" 
            style={{ 
              width: '100%', 
              maxWidth: '600px', 
              margin: '0 auto 20px', 
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
          />
        </div>

        <div style={{ 
          backgroundColor: '#f3f4f6', 
          padding: '30px', 
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          marginBottom: '30px'
        }}>
          <h2 style={{ 
            color: '#1f2937', 
            marginBottom: '20px', 
            textAlign: 'center',
            fontSize: '28px',
            fontWeight: 'bold'
          }}>
            🎭 SHOW TIMES
          </h2>
          <p style={{ 
            color: '#6b7280', 
            marginBottom: '20px', 
            textAlign: 'center',
            fontSize: '16px'
          }}>
            Choose one show total from all options - click again to deselect
          </p>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '30px', 
            marginTop: '20px' 
          }}>
            <div style={{ 
              backgroundColor: 'white', 
              padding: '20px', 
              borderRadius: '8px',
              border: '2px solid #d1d5db'
            }}>
              <h3 style={{ 
                color: '#1f2937', 
                marginBottom: '15px', 
                textAlign: 'center',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                Tuesday, October 28, 2025
              </h3>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '10px',
                  padding: '10px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer'
                }}>
                  <input 
                    type="radio" 
                    name="tuesday" 
                    value="530" 
                    checked={selectedEvents.tuesday === '530'}
                    onChange={() => handleEventSelection('tuesday', '530')}
                    style={{ marginRight: '12px', transform: 'scale(1.2)' }} 
                  />
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>
                    Tuesday, October 28, 2025 - 5:30 PM
                  </span>
                </label>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  padding: '10px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer'
                }}>
                  <input 
                    type="radio" 
                    name="tuesday" 
                    value="630" 
                    checked={selectedEvents.tuesday === '630'}
                    onChange={() => handleEventSelection('tuesday', '630')}
                    style={{ marginRight: '12px', transform: 'scale(1.2)' }} 
                  />
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>
                    Tuesday, October 28, 2025 - 6:30 PM
                  </span>
                </label>
              </div>
              <button 
                onClick={handleRequestTickets}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  width: '100%'
                }}
              >
                Request Tickets
              </button>
            </div>

            <div style={{ 
              backgroundColor: 'white', 
              padding: '20px', 
              borderRadius: '8px',
              border: '2px solid #d1d5db'
            }}>
              <h3 style={{ 
                color: '#1f2937', 
                marginBottom: '15px', 
                textAlign: 'center',
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                Thursday, October 30, 2025
              </h3>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '10px',
                  padding: '10px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer'
                }}>
                  <input 
                    type="radio" 
                    name="thursday" 
                    value="530" 
                    checked={selectedEvents.thursday === '530'}
                    onChange={() => handleEventSelection('thursday', '530')}
                    style={{ marginRight: '12px', transform: 'scale(1.2)' }} 
                  />
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>
                    Thursday, October 30, 2025 - 5:30 PM
                  </span>
                </label>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  padding: '10px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer'
                }}>
                  <input 
                    type="radio" 
                    name="thursday" 
                    value="630" 
                    checked={selectedEvents.thursday === '630'}
                    onChange={() => handleEventSelection('thursday', '630')}
                    style={{ marginRight: '12px', transform: 'scale(1.2)' }} 
                  />
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>
                    Thursday, October 30, 2025 - 6:30 PM
                  </span>
                </label>
              </div>
              <button 
                onClick={handleRequestTickets}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  width: '100%'
                }}
              >
                Request Tickets
              </button>
            </div>
          </div>

          {Object.values(selectedEvents).some(event => event) && (
            <div style={{ 
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '6px'
            }}>
              <h4 style={{ color: '#0c4a6e', marginBottom: '10px' }}>Selected Events:</h4>
              {selectedEvents.tuesday && (
                <p style={{ color: '#0c4a6e', margin: '5px 0' }}>
                  ✅ Tuesday, Oct 28: {selectedEvents.tuesday === '530' ? '5:30 PM' : '6:30 PM'} Show
                </p>
              )}
              {selectedEvents.thursday && (
                <p style={{ color: '#0c4a6e', margin: '5px 0' }}>
                  ✅ Thursday, Oct 30: {selectedEvents.thursday === '530' ? '5:30 PM' : '6:30 PM'} Show
                </p>
              )}
            </div>
          )}
        </div>

        {/* Organizer Details Footer */}
        <div style={{ 
          backgroundColor: '#f8fafc', 
          padding: '20px', 
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginTop: '20px'
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: '15px'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '15px',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              <img 
                src="/EventBanner.png" 
                alt="Starstruck Presents" 
                style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
              />
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ 
                  color: '#1f2937', 
                  margin: '0 0 5px 0',
                  fontSize: '20px',
                  fontWeight: 'bold'
                }}>
                  Starstruck Presents
                </h3>
                <p style={{ 
                  color: '#6b7280', 
                  margin: '0',
                  fontSize: '14px'
                }}>
                  Bringing the magic of dance to your community
                </p>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ 
                color: '#6b7280', 
                margin: '0 0 8px 0',
                fontSize: '14px'
              }}>
                Questions or need help?
              </p>
              <a 
                href="https://starstruckpresents.com" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: '#3b82f6', 
                  textDecoration: 'underline',
                  fontSize: '14px'
                }}
              >
                Visit Starstruck Presents
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced Login Page with full event information
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* Header with Banner Image */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <img 
          src="/EventBanner.png" 
          alt="Starstruck Presents Event Banner" 
          style={{ 
            width: '100%', 
            maxWidth: '600px', 
            height: 'auto', 
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            marginBottom: '20px'
          }} 
        />
        <h1 style={{ fontSize: '2em', color: '#1e40af', margin: '0' }}>
          🎭 Starstruck Presents: So You Think You Can Dance!
        </h1>
      </div>
      
      {/* Event Description */}
      <section style={{ marginBottom: '30px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <p style={{ fontSize: '1.2em', lineHeight: '1.6', color: '#374151', margin: '0' }}>
          Get ready to see your little stars SHINE at Starstruck presents: So you think you can dance! Our Maidu Elementary students have been practicing a special dance performance through the Starstruck Program. Come watch as they take the stage with their choreographed dances, showcasing teamwork, creativity, and so much fun!
        </p>
      </section>
      
      {/* Show Times Section */}
      <section style={{ marginBottom: '30px', borderTop: '2px solid #e5e7eb', paddingTop: '20px' }}>
        <h2 style={{ fontSize: '1.8em', color: '#1f2937', marginBottom: '20px', textAlign: 'center' }}>
          🎭 SHOW TIMES
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
          <div style={{ border: '2px solid #3b82f6', padding: '15px', borderRadius: '8px', backgroundColor: '#eff6ff', textAlign: 'center' }}>
            <h3 style={{ color: '#1e40af', fontSize: '1.1em', marginBottom: '5px' }}>Tuesday, October 28, 2025</h3>
            <p style={{ color: '#1e40af', fontSize: '1em', margin: '0', fontWeight: 'bold' }}>5:30 PM</p>
          </div>
          <div style={{ border: '2px solid #3b82f6', padding: '15px', borderRadius: '8px', backgroundColor: '#eff6ff', textAlign: 'center' }}>
            <h3 style={{ color: '#1e40af', fontSize: '1.1em', marginBottom: '5px' }}>Tuesday, October 28, 2025</h3>
            <p style={{ color: '#1e40af', fontSize: '1em', margin: '0', fontWeight: 'bold' }}>6:30 PM</p>
          </div>
          <div style={{ border: '2px solid #3b82f6', padding: '15px', borderRadius: '8px', backgroundColor: '#eff6ff', textAlign: 'center' }}>
            <h3 style={{ color: '#1e40af', fontSize: '1.1em', marginBottom: '5px' }}>Thursday, October 30, 2025</h3>
            <p style={{ color: '#1e40af', fontSize: '1em', margin: '0', fontWeight: 'bold' }}>5:30 PM</p>
          </div>
          <div style={{ border: '2px solid #3b82f6', padding: '15px', borderRadius: '8px', backgroundColor: '#eff6ff', textAlign: 'center' }}>
            <h3 style={{ color: '#1e40af', fontSize: '1.1em', marginBottom: '5px' }}>Thursday, October 30, 2025</h3>
            <p style={{ color: '#1e40af', fontSize: '1em', margin: '0', fontWeight: 'bold' }}>6:30 PM</p>
          </div>
        </div>
      </section>
      
      {/* Policies */}
      <section style={{ marginBottom: '30px', borderTop: '2px solid #e5e7eb', paddingTop: '20px' }}>
        <h2 style={{ fontSize: '1.5em', color: '#1f2937', marginBottom: '15px' }}>🎫 Ticket Policies</h2>
        <div style={{ backgroundColor: '#fef3c7', padding: '20px', borderRadius: '8px', border: '1px solid #f59e0b' }}>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', lineHeight: '1.6', color: '#92400e', margin: '0' }}>
            <li style={{ marginBottom: '8px' }}>Families are limited to <strong>2 tickets per night initially</strong> (Oct 13–19). Select one showtime per night.</li>
            <li style={{ marginBottom: '8px' }}>From Oct 20, reserve <strong>+4 more per night</strong> while supplies last (max 6; volunteers max 8).</li>
            <li style={{ marginBottom: '8px' }}>During checkout, enter your student's ID for verification. Duplicates beyond limits will be canceled.</li>
            <li style={{ marginBottom: '8px' }}><strong>Volunteers:</strong> Reserve +2 (total 4 initial) in Row 3 using your access code (still from GA pool).</li>
            <li style={{ marginBottom: '8px' }}>Refunds until 2 days before. Under 2 on lap free; age 2+ needs a ticket. Sales close 4:00 PM day-of.</li>
          </ul>
        </div>
      </section>
      
      {/* Login Form - Moved above Organizer */}
      <section style={{ borderTop: '2px solid #e5e7eb', paddingTop: '30px', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '1.5em', textAlign: 'center', color: '#1f2937', marginBottom: '10px' }}>
          🔐 Login to Select Your Showtime
        </h2>
        <p style={{ textAlign: 'center', marginBottom: '25px', color: '#6b7280', fontSize: '1.1em' }}>
          Enter your Student ID to access event selection and ticket purchase.
        </p>
        
        <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: '0 auto' }}>
          <input 
            type="text" 
            value={studentId} 
            onChange={(e) => setStudentId(e.target.value)} 
            placeholder="Student ID (e.g., 33727)" 
            disabled={isLoading}
            style={{ 
              width: '100%', 
              padding: '15px', 
              marginBottom: '15px', 
              border: '2px solid #d1d5db', 
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box'
            }} 
          />
          {error && (
            <div style={{ 
              backgroundColor: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: '6px', 
              padding: '12px',
              marginBottom: '15px'
            }}>
              <p style={{ color: '#dc2626', margin: '0', textAlign: 'center' }}>{error}</p>
            </div>
          )}
          <button 
            type="submit"
            disabled={isLoading}
            style={{ 
              width: '100%', 
              padding: '15px', 
              background: isLoading ? '#9ca3af' : '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </section>
      
      {/* Organizer */}
      <section style={{ display: 'flex', alignItems: 'center', borderTop: '2px solid #e5e7eb', paddingTop: '20px' }}>
        <img 
          src="https://storage.googleapis.com/sprouter-buckets/files/cropped_image_1759168884.png" 
          alt="Starstruck Presents Logo" 
          style={{ width: '100px', height: '100px', marginRight: '20px', borderRadius: '50%', border: '3px solid #3b82f6' }} 
        />
        <div>
          <h2 style={{ fontSize: '1.5em', color: '#1f2937', marginBottom: '10px' }}>Organizer: Starstruck Presents</h2>
          <a 
            href="https://sprouter.app/maidustarstruck" 
            style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '1.1em' }}
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit Organizer Page →
          </a>
        </div>
      </section>
    </div>
  );
}

export default App;