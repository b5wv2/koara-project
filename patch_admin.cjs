const fs = require('fs');

const path = 'src/pages/Admin.jsx';
let content = fs.readFileSync(path, 'utf-8');

// 1. Add state for Language Modal
const stateInjection = `  const [submittingSub, setSubmittingSub] = useState(false);
  const [isReportDownloading, setIsReportDownloading] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);`;
content = content.replace('  const [submittingSub, setSubmittingSub] = useState(false);\n  const [isReportDownloading, setIsReportDownloading] = useState(false);', stateInjection);


// 2. Change downloadMonthlyReport logic
const oldDownloadFunc = `  const downloadMonthlyReport = async () => {
    console.log('[DEBUG] downloadMonthlyReport() clicked!');
    if (!isPlusActive) {
      console.log('[DEBUG] User is not active Plus, opening upgrade modal.');
      setUpgradeModalOpen(true);
      return;
    }
    
    try {
      console.log('[DEBUG] Starting PDF generation request...');
      setIsReportDownloading(true);
      const res = await fetch(\`\${API_BASE_URL}/api/merchant/reports\`, {
        credentials: 'include'
      });
      
      console.log('[DEBUG] Response received with status:', res.status);
      
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
  };`;

const newDownloadFunc = `  const downloadMonthlyReport = () => {
    if (!isPlusActive) {
      setUpgradeModalOpen(true);
      return;
    }
    setIsLanguageModalOpen(true);
  };

  const executeDownloadMonthlyReport = async (lang) => {
    setIsLanguageModalOpen(false);
    try {
      setIsReportDownloading(true);
      const res = await fetch(\`\${API_BASE_URL}/api/merchant/reports?lang=\${lang}\`, {
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
  };`;

content = content.replace(oldDownloadFunc, newDownloadFunc);

// 3. Inject Language Modal Component
const modalJSX = `
      {/* Report Language Modal */}
      {isLanguageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full border border-slate-700 shadow-2xl relative">
            <button 
              onClick={() => setIsLanguageModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(59,130,246,0.1)' }}>
                <FileText size={24} style={{ color: '#60A5FA' }} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Select Language</h3>
              <p className="text-sm text-slate-400">Choose the language for your generated report.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => executeDownloadMonthlyReport('en')}
                className="w-full py-3 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium flex items-center justify-center gap-2 transition-colors border border-slate-600"
              >
                English
              </button>
              <button 
                onClick={() => executeDownloadMonthlyReport('ar')}
                className="w-full py-3 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium flex items-center justify-center gap-2 transition-colors border border-slate-600"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              >
                العربية
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace('{/* Upgrade Modal */}', modalJSX + '\n      {/* Upgrade Modal */}');

fs.writeFileSync(path, content, 'utf-8');
console.log('Admin.jsx patched');
