import ExportImport from "./features/settings/ExportImport";

export default function SettingsView() {
  return (
    <div className="main-view">
      <div className="panel" style={{ marginTop: "16px" }}>
        <div className="panel-header">Settings</div>
        <ExportImport />
      </div>
      
      <div className="panel">
        <div className="panel-header">About</div>
        <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          Flowst v0.1.0<br/>
          A minimalist Pomodoro timer.
        </div>
      </div>
    </div>
  );
}
