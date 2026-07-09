import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, Trash2 } from 'lucide-react';
import ContributionGrid from './ContributionGrid';
import { usePomodoroStore } from '../stores/pomodoroStore';
import CustomSelect from './CustomSelect';
import WheelPicker from './WheelPicker';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatTotalTime(minutes: number) {
  const m = Math.floor(minutes);
  if (m < 60) return `${m}m`;
  const hrs = Math.floor(m / 60);
  const mins = m % 60;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h${mins}m`;
}

export default function ClockPane() {
  const { state, timeLeft, isActive, startTimer, pauseTimer, resumeTimer, stopTimer, setTimeLeft, categories, addCategory, updateCategory, deleteCategory, todayTotalTime, dailyTarget, blocks, currentBlockIndex } = usePomodoroStore();
  const [focusTime, setFocusTime] = useState("25");
  const [breakTime, setBreakTime] = useState("5");
  const [taskCategory, setTaskCategory] = useState("work");

  const [showCatPopup, setShowCatPopup] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const clickTimeout = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (clickTimeout.current) clearTimeout(clickTimeout.current);
    };
  }, []);

  const handlePlayPause = () => {
    if (state === 'idle') {
      startTimer(focusTime, breakTime, timeLeft);
    } else if (isActive) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  };

  const handleTimeClick = () => {
    if (isActive) return;
    if (clickTimeout.current) clearTimeout(clickTimeout.current);
    clickTimeout.current = setTimeout(() => {
      setIsEditing(true);
    }, 300);
  };

  const handleTimeDoubleClick = () => {
    if (isActive) return;
    if (clickTimeout.current) clearTimeout(clickTimeout.current);
    setIsEditingCustom(true);
    setIsEditing(false);
  };

  const handleCustomInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value.trim() === '') {
      setIsEditingCustom(false);
      return;
    }
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val > 0) {
      setTimeLeft(val * 60);
    }
    setIsEditingCustom(false);
  };

  const handleCustomInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
    if (e.key === 'Escape') {
      setIsEditingCustom(false);
    }
  };
  return (
    <div className="clock-pane">
      <div className="select-group">
        <CustomSelect 
          options={[
            {label: 'Auto', value: 'auto'},
            {label: '20m', value: '20'},
            {label: '25m', value: '25'},
            {label: '30m', value: '30'},
            {label: '35m', value: '35'},
            {label: '40m', value: '40'},
            {label: '45m', value: '45'},
            {label: '50m', value: '50'},
            {label: '1h', value: '60'},
            {label: '1h30', value: '90'}
          ]}
          value={focusTime}
          onChange={setFocusTime}
          width="auto"
        />
        <CustomSelect 
          options={[
            {label: 'Off', value: '0'},
            {label: '5m', value: '5'},
            {label: '10m', value: '10'},
            {label: '15m', value: '15'},
            {label: '20m', value: '20'}
          ]}
          value={breakTime}
          onChange={setBreakTime}
          width="auto"
        />
        <CustomSelect 
          options={[
            ...categories.map(c => ({ label: c.name, value: c.id, color: c.color, editable: true })),
            { label: 'Add...', value: 'add' }
          ]}
          value={taskCategory}
          onChange={(val) => {
            if (val === 'add') {
              const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
              setNewCatColor(randomColor);
              setNewCatName("");
              setEditingCatId(null);
              setShowCatPopup(true);
            } else {
              setTaskCategory(val);
            }
          }}
          onEditOption={(val) => {
            const cat = categories.find(c => c.id === val);
            if (cat) {
              setNewCatName(cat.name);
              setNewCatColor(cat.color);
              setEditingCatId(cat.id);
              setShowCatPopup(true);
            }
          }}
          width="auto"
          disabled={state !== 'idle'}
        />
      </div>

      <div className={`timer-display ${isEditing ? 'is-editing' : ''}`}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div 
            className="time-text editable" 
            onClick={handleTimeClick}
            onDoubleClick={handleTimeDoubleClick}
            title={!isActive ? "Click to open picker, Double click to type" : ""}
            style={{ 
              cursor: isActive ? 'default' : 'pointer',
              opacity: isEditing || isEditingCustom ? 0 : 1,
              pointerEvents: isEditingCustom ? 'none' : 'auto'
            }}
          >
            {formatTime(timeLeft)}
          </div>

          {isEditingCustom && (
            <input 
              type="number" 
              className="time-text time-text-input" 
              autoFocus
              defaultValue=""
              onBlur={handleCustomInputBlur}
              onKeyDown={handleCustomInputKeyDown}
              placeholder={Math.floor(timeLeft / 60).toString()}
            />
          )}
        </div>
        {isEditing && (
          <WheelPicker 
            value={timeLeft} 
            onChange={(val) => setTimeLeft(val)} 
            onClose={() => setIsEditing(false)} 
          />
        )}
        <div className="time-subtext">
          {state === 'focus' ? `Focus — block ${currentBlockIndex + 1}/${blocks.length || 1}` : state === 'break' ? 'Break' : 'Ready'}
        </div>
      </div>

      <div className="action-buttons">
        <div className="action-left"></div>
        <div className="action-center">
          <button className="play-pause-btn" onClick={handlePlayPause}>
            {isActive ? <Pause size={20} /> : <Play size={20} />}
          </button>
        </div>
        <div className="action-right">
          {state !== 'idle' && (
            <button className="stop-btn" onClick={stopTimer} title="Stop Timer">
              <Square size={18} fill="currentColor" />
            </button>
          )}
        </div>
      </div>

      <div style={{ position: 'relative', marginTop: 'auto' }}>
        <div style={{ position: 'absolute', bottom: '100%', left: '-24px', right: '-24px', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 24px', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 500 }}>
            <span>{formatTotalTime(todayTotalTime)}</span>
            <span>
              {todayTotalTime >= dailyTarget 
                ? `+${formatTotalTime(todayTotalTime - dailyTarget)} over` 
                : `${formatTotalTime(dailyTarget - todayTotalTime)} left`}
            </span>
          </div>
          <div style={{ height: '1px', background: 'var(--grid-base)' }}>
            <div 
              style={{ 
                height: '100%', 
                background: 'var(--grid-active)', 
                width: `${Math.min((todayTotalTime / (dailyTarget || 1)) * 100, 100)}%`,
                transition: 'width 0.5s ease' 
              }} 
            />
          </div>
        </div>
        <ContributionGrid />
      </div>

      {showCatPopup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--dropdown-bg)', border: '1px solid var(--el-border)', padding: '16px', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: 'var(--el-shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                {editingCatId ? 'Edit Category' : 'New Category'}
              </div>
              {editingCatId && (
                <button 
                  onClick={() => {
                    deleteCategory(editingCatId);
                    if (taskCategory === editingCatId) {
                      setTaskCategory(categories.find(c => c.id !== editingCatId)?.id || "auto");
                    }
                    setShowCatPopup(false);
                  }}
                  title="Delete Category"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input 
                type="color" 
                value={newCatColor} 
                onChange={(e) => setNewCatColor(e.target.value)} 
                style={{ width: '28px', height: '28px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }} 
              />
              <input 
                type="text" 
                value={newCatName} 
                onChange={(e) => setNewCatName(e.target.value)} 
                placeholder="Category Name" 
                autoFocus
                style={{ background: 'transparent', border: '1px solid var(--divider)', color: 'var(--text-primary)', padding: '6px 8px', borderRadius: 0, fontSize: '13px', outline: 'none' }} 
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button onClick={() => setShowCatPopup(false)} style={{ background: 'transparent', border: '1px solid var(--divider)', padding: '4px 10px', borderRadius: 0, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
              <button onClick={() => {
                if (newCatName.trim()) {
                  if (editingCatId) {
                    updateCategory(editingCatId, newCatName.trim(), newCatColor);
                  } else {
                    const id = 'cat_' + Date.now();
                    addCategory({ id, name: newCatName.trim(), color: newCatColor });
                    setTaskCategory(id);
                  }
                  setShowCatPopup(false);
                }
              }} style={{ background: 'var(--text-primary)', border: 'none', padding: '4px 10px', borderRadius: 0, color: 'var(--el-bg)', cursor: 'pointer', fontSize: '12px' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
