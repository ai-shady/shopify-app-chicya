import React from 'react';
import Console from './Console.jsx';
import Landing from './Landing.jsx';

function App() {
  const params = new URLSearchParams(window.location.search);
  const shop = params.get('shop') || '';
  const host = params.get('host') || '';
  const embedded = host !== '' || params.get('embedded') === '1';

  if (embedded) {
    return <Console shop={shop} host={host} embedded />;
  }
  return <Landing />;
}

export default App;
