
import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('Index.tsx loaded - starting app initialization');

// Simple error display component
const ErrorDisplay = ({ error }: { error: Error }) => (
  <div style={{ padding: '20px', color: 'red', fontFamily: 'monospace', background: '#fff' }}>
    <h1>Application Error</h1>
    <pre style={{ background: '#f0f0f0', padding: '10px', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
      {error.toString()}
      {'\n\n'}
      {error.stack}
    </pre>
    <button 
      onClick={() => window.location.reload()}
      style={{ padding: '10px 20px', marginTop: '10px', cursor: 'pointer', fontSize: '14px' }}
    >
      Reload Page
    </button>
  </div>
);

const rootElement = document.getElementById('root');
if (!rootElement) {
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Could not find root element</div>';
  throw new Error("Could not find root element to mount to");
}

console.log('Root element found, creating root...');

try {
  const root = ReactDOM.createRoot(rootElement);
  console.log('Root created, importing App...');

  // Import and render with error handling
  import('./frontend/App')
    .then((module) => {
      const App = module.default;
      console.log('App imported successfully, rendering...');
      
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
      
      console.log('App rendered successfully');
    })
    .catch((error) => {
      console.error('Failed to import or render App:', error);
      root.render(<ErrorDisplay error={error} />);
    });
    
} catch (error) {
  console.error('Fatal error during initialization:', error);
  rootElement.innerHTML = `
    <div style="padding: 20px; color: red; font-family: monospace; background: white;">
      <h1>Fatal Initialization Error</h1>
      <pre style="background: #f0f0f0; padding: 10px; overflow: auto;">${String(error)}</pre>
      <button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 10px; cursor: pointer;">
        Reload Page
      </button>
    </div>
  `;
}
