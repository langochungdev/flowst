

export default function SettingsPane() {
  return (
    <div className="settings-pane">
      <div className="setting-item">
        <span>Âm thanh bắt đầu/kết thúc</span>
        <input type="checkbox" defaultChecked />
      </div>

      <div className="setting-item-col">
        <span>Mục tiêu focus mỗi ngày (phút)</span>
        <input type="number" defaultValue={120} />
      </div>

      <div className="setting-item-col">
        <span>Focus mặc định</span>
        <select defaultValue="25">
          <option value="25">25 phút</option>
          <option value="auto">Auto theo tổng thời gian</option>
        </select>
      </div>
    </div>
  );
}
