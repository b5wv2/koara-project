const fs = require('fs');

const path = 'src/pages/Admin.jsx';
let content = fs.readFileSync(path, 'utf-8');

// 1. Add state
const stateInjection = `  const [submittingSub, setSubmittingSub] = useState(false);
  const [isReportDownloading, setIsReportDownloading] = useState(false);`;
content = content.replace('  const [submittingSub, setSubmittingSub] = useState(false);', stateInjection);

// 2. Add download function
const handlerCode = `
  const downloadMonthlyReport = async () => {
    if (!isPlusActive) {
      setUpgradeModalOpen(true);
      return;
    }
    
    try {
      setIsReportDownloading(true);
      const res = await fetch(\`\${API_BASE_URL}/api/merchant/reports\`, {
        credentials: 'include'
      });
      
      if (res.status === 403) {
        setUpgradeModalOpen(true);
        return;
      }
      
      if (res.status === 429) {
        const errorData = await res.json();
        alert(errorData.error || 'You have reached your report generation limit for this subscription cycle.');
        return;
      }
      
      if (!res.ok) {
        throw new Error('Failed to generate report');
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      // Extract filename from Content-Disposition if possible, otherwise use fallback
      let filename = 'Koara_Report.pdf';
      const disposition = res.headers.get('content-disposition');
      if (disposition && disposition.includes('filename=')) {
        const parts = disposition.split('filename=');
        if (parts.length > 1) {
          filename = parts[1].replace(/['"]/g, '');
        }
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Error downloading report:', err);
      alert('An error occurred while generating the report. Please try again.');
    } finally {
      setIsReportDownloading(false);
    }
  };
`;
content = content.replace('  const handleSubSubmit = async (e) => {', handlerCode + '\n  const handleSubSubmit = async (e) => {');

// 3. Update UI
const oldUI = `                  {/* Monthly Reports (Premium Feature) */}
                  <div className="lg:col-span-3">
                    <PremiumLockOverlay isPlusActive={isPlusActive} onUpgrade={() => setUpgradeModalOpen(true)}>
                      <div className="dash-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)' }}>
                            <FileText size={24} style={{ color: '#60A5FA' }} />
                          </div>
                          <div>
                            <h3 className="font-bold text-white">Automatic Monthly Reports</h3>
                            <p className="text-sm" style={{ color: '#94A3B8' }}>AI-generated insights on your top products, sales trends, and profit margins.</p>
                          </div>
                        </div>
                        <button className="dash-btn dash-btn-primary shrink-0" disabled>Download Latest Report</button>
                      </div>
                    </PremiumLockOverlay>
                  </div>`;

const newUI = `                  {/* Monthly Reports (Premium Feature) */}
                  <div className="lg:col-span-3">
                    <div className="dash-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.1)' }}>
                          <FileText size={24} style={{ color: '#60A5FA' }} />
                        </div>
                        <div>
                          <h3 className="font-bold text-white flex items-center gap-2">
                            Automatic Monthly Reports
                          </h3>
                          <p className="text-sm" style={{ color: '#94A3B8' }}>AI-generated insights on your top products, sales trends, and profit margins.</p>
                        </div>
                      </div>
                      <button 
                        onClick={downloadMonthlyReport}
                        disabled={isReportDownloading}
                        className="dash-btn shrink-0 relative overflow-hidden group font-medium px-4 py-2 rounded-lg flex items-center justify-center"
                        style={{ 
                          background: isPlusActive ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#1e293b',
                          color: isPlusActive ? '#ffffff' : '#94a3b8',
                          border: isPlusActive ? 'none' : '1px solid #334155',
                          cursor: isReportDownloading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {isReportDownloading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Generating...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            Download Latest Report
                            {!isPlusActive && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff' }}>PLUS</span>
                            )}
                          </div>
                        )}
                      </button>
                    </div>
                  </div>`;

content = content.replace(oldUI, newUI);
fs.writeFileSync(path, content, 'utf-8');
console.log('Frontend updated!');
