import { useState } from 'react';
import './SetupGuideModal.css';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SetupGuideModal({ isOpen, onClose }: SetupGuideModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleOpenDashboard = () => {
    window.open('https://developer.spotify.com/dashboard', '_blank');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <h2>Step 1: Create a Spotify Developer Account</h2>
            <div className="setup-content">
              <p>First, you need to create a free Spotify Developer account.</p>
              <ol>
                <li>
                  Click the button below to open the Spotify Developer Dashboard
                </li>
                <li>Click "Log in" with your Spotify account</li>
                <li>Accept the Developer Terms of Service if prompted</li>
              </ol>
              <button onClick={handleOpenDashboard} className="setup-action-btn">
                Open Spotify Developer Dashboard →
              </button>
              <div className="setup-note">
                ℹ️ You can use any Spotify account (free or premium)
              </div>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <h2>Step 2: Create Your App</h2>
            <div className="setup-content">
              <p>Create a new app to get your API credentials.</p>
              <ol>
                <li>
                  In the Developer Dashboard, click <strong>"Create app"</strong>
                </li>
                <li>Fill in the form:</li>
                <ul>
                  <li>
                    <strong>App name:</strong> My Playlist Manager (or anything you
                    like)
                  </li>
                  <li>
                    <strong>App description:</strong> Personal playlist management tool
                  </li>
                  <li>
                    <strong>Redirect URI:</strong>{' '}
                    <code className="setup-code">http://localhost:8888/callback</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('http://localhost:8888/callback');
                        alert('Copied to clipboard!');
                      }}
                      className="copy-btn"
                    >
                      📋 Copy
                    </button>
                  </li>
                  <li>
                    <strong>API/SDKs:</strong> Check "Web API"
                  </li>
                </ul>
                <li>Accept the Developer Terms of Service</li>
                <li>
                  Click <strong>"Save"</strong>
                </li>
              </ol>
              <div className="setup-warning">
                ⚠️ The Redirect URI must be exactly: <code>http://localhost:8888/callback</code>
              </div>
            </div>
          </>
        );

      case 3:
        return (
          <>
            <h2>Step 3: Get Your Client ID</h2>
            <div className="setup-content">
              <p>After creating your app, you'll see your credentials.</p>
              <ol>
                <li>
                  On your app's dashboard page, locate the <strong>Client ID</strong>
                </li>
                <li>
                  Click the <strong>"Copy"</strong> button next to it
                </li>
                <li>Keep this handy - you'll need it in the next step!</li>
              </ol>
              <div className="setup-example">
                <strong>Example Client ID format:</strong>
                <code className="setup-code-block">
                  a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
                </code>
              </div>
              <div className="setup-note">
                ℹ️ Your Client ID is safe to use - it's not a secret
              </div>
            </div>
          </>
        );

      case 4:
        return (
          <>
            <h2>Step 4: Configure the App</h2>
            <div className="setup-content">
              <p>
                Create a <code>.env</code> file in the app folder with your Client
                ID.
              </p>

              <h3>macOS / Linux:</h3>
              <div className="setup-code-block">
                # Navigate to the app folder, then:
                <br />
                echo "VITE_SPOTIFY_CLIENT_ID=your_client_id" &gt; .env
              </div>

              <h3>Windows:</h3>
              <ol>
                <li>Open Notepad</li>
                <li>
                  Type: <code>VITE_SPOTIFY_CLIENT_ID=your_client_id</code>
                </li>
                <li>Replace "your_client_id" with your actual Client ID</li>
                <li>
                  Click <strong>File → Save As</strong>
                </li>
                <li>
                  Set "Save as type" to <strong>"All Files"</strong>
                </li>
                <li>
                  Name it <strong>.env</strong> (with the dot at the start!)
                </li>
                <li>Save in the app folder</li>
              </ol>

              <div className="setup-warning">
                ⚠️ Make sure there are NO spaces around the = sign and NO quotes
                around the ID
              </div>

              <div className="setup-example">
                <strong>Correct format:</strong>
                <code className="setup-code-block">
                  VITE_SPOTIFY_CLIENT_ID=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
                </code>
              </div>
            </div>
          </>
        );

      case 5:
        return (
          <>
            <h2>Step 5: Launch & Connect!</h2>
            <div className="setup-content">
              <p>You're almost done! Now just connect your account.</p>
              <ol>
                <li>
                  Close this guide and click <strong>"Connect with Spotify"</strong>
                </li>
                <li>Your browser will open to Spotify's authorization page</li>
                <li>
                  Review the permissions and click <strong>"Agree"</strong>
                </li>
                <li>
                  You'll see a success message - you can close the browser window
                </li>
                <li>Return to the app - you're logged in!</li>
              </ol>

              <div className="setup-success">
                ✅ After this, you won't need to do this setup again. The app will
                remember you!
              </div>

              <h3>Troubleshooting</h3>
              <ul>
                <li>
                  <strong>"Authentication failed":</strong> Check your .env file has
                  the correct Client ID
                </li>
                <li>
                  <strong>"Redirect URI mismatch":</strong> Make sure you added{' '}
                  <code>http://localhost:8888/callback</code> to your app settings
                </li>
                <li>
                  <strong>Still stuck?</strong> See USER_SETUP.md in the app folder
                  for detailed help
                </li>
              </ul>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="setup-modal-overlay" onClick={onClose}>
      <div className="setup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="setup-header">
          <h1>First Time Setup Guide</h1>
          <button className="setup-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="setup-progress">
          Step {currentStep} of {totalSteps}
          <div className="setup-progress-bar">
            <div
              className="setup-progress-fill"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="setup-body">{renderStep()}</div>

        <div className="setup-footer">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="setup-nav-btn"
          >
            ← Previous
          </button>
          <div className="setup-step-indicators">
            {Array.from({ length: totalSteps }, (_, i) => (
              <span
                key={i}
                className={`setup-step-indicator ${currentStep === i + 1 ? 'active' : ''} ${i + 1 < currentStep ? 'completed' : ''}`}
                onClick={() => setCurrentStep(i + 1)}
              />
            ))}
          </div>
          {currentStep < totalSteps ? (
            <button onClick={handleNext} className="setup-nav-btn primary">
              Next →
            </button>
          ) : (
            <button onClick={onClose} className="setup-nav-btn primary">
              Close & Connect
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
