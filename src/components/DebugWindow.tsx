import { usePomodoroStore } from "../stores/pomodoroStore";
import { useDebugStore, getMockedDate } from "../stores/debugStore";
import { Trash2, Copy } from "lucide-react";

export default function DebugWindow() {
  const { logs, timeMultiplier, dateOffsetDays, clearLogs, setTimeMultiplier, setDateOffsetDays } = useDebugStore();
  const pomodoroState = usePomodoroStore();

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${new Date(l.timestamp).toISOString()}] ${l.level.toUpperCase()}: ${l.message} ${l.args.length ? JSON.stringify(l.args) : ''}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'var(--text-primary)', color: 'var(--el-bg)', display: 'flex', flexDirection: 'column', fontFamily: 'monospace', fontSize: '12px', padding: '16px', boxSizing: 'border-box', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--text-secondary)', paddingBottom: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', color: '#00FBFF' }}>Debug Console</h2>
      </div>

      <div style={{ display: 'flex', gap: '16px', height: 'calc(100% - 40px)' }}>
        
        {/* Left Column: Logs */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 'bold' }}>Logs</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleCopyLogs} style={{ background: 'transparent', border: '1px solid var(--text-secondary)', color: 'var(--el-bg)', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Copy size={12} /> Copy
              </button>
              <button onClick={clearLogs} style={{ background: 'transparent', border: '1px solid var(--text-secondary)', color: 'var(--el-bg)', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Trash2 size={12} /> Clear
              </button>
            </div>
          </div>
          <div style={{ flex: 1, border: '1px solid var(--text-secondary)', borderRadius: '4px', overflowY: 'auto', padding: '8px', background: 'rgba(255,255,255,0.05)' }}>
            {logs.map(log => (
              <div key={log.id} style={{ marginBottom: '4px', color: log.level === 'error' ? 'red' : 'inherit', wordBreak: 'break-all' }}>
                <span style={{ color: 'var(--text-secondary)' }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                <span style={{ color: log.level === 'error' ? 'red' : '#00FBFF' }}>{log.level.toUpperCase()}</span>{' '}
                {log.message}{' '}
                {log.args.length > 0 && <span style={{ opacity: 0.7 }}>{JSON.stringify(log.args)}</span>}
              </div>
            ))}
            {logs.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>No logs yet...</div>}
          </div>
        </div>

        {/* Right Column: State & Time */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          
          {/* Time Simulator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontWeight: 'bold' }}>Time Simulator</span>
            <div style={{ border: '1px solid var(--text-secondary)', padding: '12px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Speed Multiplier: <span style={{ color: '#00FBFF' }}>{timeMultiplier}x</span></span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="60" 
                step="1"
                value={timeMultiplier} 
                onChange={(e) => setTimeMultiplier(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#00FBFF' }} 
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                <span>1x (Realtime)</span>
                <span>60x (1s = 1m)</span>
              </div>
            </div>

            <span style={{ fontWeight: 'bold' }}>Date Simulator</span>
            <div style={{ border: '1px solid var(--text-secondary)', padding: '12px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Day Offset: <span style={{ color: dateOffsetDays !== 0 ? '#00FBFF' : 'var(--el-bg)' }}>{dateOffsetDays > 0 ? `+${dateOffsetDays}` : dateOffsetDays}</span></span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                  {(() => {
                    const d = getMockedDate();
                    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                  })()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setDateOffsetDays(dateOffsetDays - 1)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--text-secondary)', color: 'var(--el-bg)', cursor: 'pointer', padding: '4px' }}>-1 Day</button>
                <button onClick={() => setDateOffsetDays(0)} style={{ flex: 1, background: 'var(--text-secondary)', border: 'none', color: 'var(--el-bg)', cursor: 'pointer', padding: '4px' }}>Today</button>
                <button onClick={() => setDateOffsetDays(dateOffsetDays + 1)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--text-secondary)', color: 'var(--el-bg)', cursor: 'pointer', padding: '4px' }}>+1 Day</button>
              </div>
            </div>
          </div>

          {/* State Viewer */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <span style={{ fontWeight: 'bold', marginBottom: '8px' }}>State Inspector</span>
            <pre style={{ flex: 1, margin: 0, border: '1px solid var(--text-secondary)', borderRadius: '4px', padding: '8px', overflowY: 'auto', background: 'rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {JSON.stringify(pomodoroState, (_key, value) => {
                if (typeof value === 'function') return '[Function]';
                return value;
              }, 2)}
            </pre>
          </div>

        </div>
      </div>
    </div>
  );
}
