import { useState } from 'react';
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
    if (!isActive) {
      setIsEditing(true);
    }
  };


  return (
    <div className="clock-pane">
      <div className="select-group">
        <CustomSelect 
          options={[{label: '25p', value: '25'}, {label: '45p', value: '45'}, {label: 'Auto', value: 'auto'}]}
          value={focusTime}
          onChange={setFocusTime}
          width="auto"
        />
        <CustomSelect 
          options={[{label: '5p', value: '5'}, {label: '10p', value: '10'}]}
          value={breakTime}
          onChange={setBreakTime}
          width="auto"
        />
        <CustomSelect 
          options={[
            {label: 'Làm việc', value: 'work'}, 
            {label: 'Học tập', value: 'study'},
            {label: 'Khác', value: 'other'}
          ]}
          value={taskCategory}
          onChange={setTaskCategory}
          width="auto"
        />
      </div>

      <div className="timer-display">
        <div 
          className="time-text editable" 
          onClick={handleTimeClick}
          title={!isActive ? "Click to edit" : ""}
          style={{ 
            cursor: isActive ? 'default' : 'pointer',
            opacity: isEditing ? 0 : 1
          }}
        >
          {formatTime(timeLeft)}
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

      <div className="divider" />
      <div className="contribution-label">7 ngày gần đây</div>
      <ContributionGrid />
    </div>
  );
}
