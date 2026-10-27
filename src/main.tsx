import { StrictMode, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/app.css';

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ maxWidth: 560, margin: '15vh auto', padding: 24, fontFamily: 'system-ui' }}>
        <h1>Something went wrong</h1>
        <p>Your saved progress is safe in this browser. Reload the page to carry on.</p>
        <button onClick={() => location.reload()} style={{ padding: '10px 18px', borderRadius: 99 }}>Reload</button>
      </div>
    );
  }
}

createRoot(document.getElementById('root')!).render(<StrictMode><Boundary><App /></Boundary></StrictMode>);
