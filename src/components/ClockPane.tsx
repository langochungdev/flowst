import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square } from 'lucide-react';
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

export default function ClockPane() {
  const { state, timeLeft, isActive, startTimer, pauseTimer, resumeTimer, stopTimer, setTimeLeft } = usePomodoroStore();
  const [focusTime, setFocusTime] = useState("25");
  const [breakTime, setBreakTime] = useState("5");
  const [taskCategory, setTaskCategory] = useState("work");

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
      startTimer(parseInt(focusTime) || 25, 'focus');
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
            {label: 'Work', value: 'work'}, 
            {label: 'Study', value: 'study'},
            {label: 'Other', value: 'other'}
          ]}
          value={taskCategory}
          onChange={setTaskCategory}
          width="auto"
        />
      </div>

      <div className="timer-display">
        <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
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
          {state === 'focus' ? 'Focus — block 1/2' : state === 'break' ? 'Break' : 'Ready'}
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

      <ContributionGrid />
    </div>
  );
}
