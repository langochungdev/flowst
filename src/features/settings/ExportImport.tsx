export default function ExportImport() {
  const handleExport = () => {
    // Dummy export logic
    const data = "focus_duration,break_duration\n25,5";
    const blob = new Blob([data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flowst_export.csv";
    a.click();
  };

  return (
    <div style={{ marginTop: "1rem", display: "flex", gap: "8px" }}>
      <button className="secondary" style={{ fontSize: "0.875rem", padding: "6px 12px" }} onClick={handleExport}>
        Export Data
      </button>
      <button className="secondary" style={{ fontSize: "0.875rem", padding: "6px 12px" }} onClick={() => alert("Import not fully implemented yet.")}>
        Import Data
      </button>
    </div>
  );
}
