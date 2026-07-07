
import { Play, Pause } from 'lucide-react';
import ContributionGrid from './ContributionGrid';
import { usePomodoroStore } from '../stores/pomodoroStore';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function ClockPane() {
  const { state, timeLeft, isActive, startTimer, pauseTimer, resumeTimer } = usePomodoroStore();

  const handlePlayPause = () => {
    if (state === 'idle') {
      startTimer(25, 'focus');
    } else if (isActive) {
      pauseTimer();
    } else {
      resumeTimer();
    }
  };

  return (
    <div className="clock-pane">
      <div className="select-group">
        <select defaultValue="25">
          <option value="25">25p</option>
          <option value="45">45p</option>
          <option value="auto">Auto</option>
        </select>
        <select defaultValue="5">
          <option value="5">5p</option>
          <option value="10">10p</option>
        </select>
      </div>

      <div className="timer-display">
        <div className="time-text">{formatTime(timeLeft)}</div>
        <div className="time-subtext">
          {state === 'focus' ? 'Focus — block 1/2' : state === 'break' ? 'Break' : 'Ready'}
        </div>
      </div>

      <button className="play-pause-btn" onClick={handlePlayPause}>
        {isActive ? <Pause size={20} /> : <Play size={20} />}
      </button>

      <div className="divider" />
      <div className="contribution-label">7 ngày gần đây</div>
      <ContributionGrid />
    </div>
  );
}
