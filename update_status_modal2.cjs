const fs = require('fs');
let code = fs.readFileSync('src/components/StoreStatusModal.jsx', 'utf8');

const startIdx = code.indexOf('if (status === \\'pending\\') {');
const endIdx = code.indexOf('if (status === \\'rejected\\') {');

if (startIdx !== -1 && endIdx !== -1) {
  const oldPending = code.substring(startIdx, endIdx);
  const newPending = `if (status === 'pending') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Application Status">
        <div className="text-center py-8 bg-slate-900 border border-slate-800 rounded-2xl animate-warning-box">
          <div className="mx-auto mb-6 flex justify-center">
            <div className="relative w-20 h-20 flex items-center justify-center rounded-full" style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)' }}>
              <svg className="w-10 h-10 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle className="animate-warning-circle" cx="12" cy="12" r="10" />
                <path className="animate-warning-icon" d="M12 8v4" />
                <path className="animate-warning-icon" d="M12 16h.01" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Pending Review</h2>
          <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto leading-relaxed">
            Your store application has been submitted successfully and is currently under review by the Koara administration team.
          </p>
          <div className="bg-slate-800/50 p-4 rounded-lg text-start text-sm mb-8 max-w-sm mx-auto border border-slate-700/50">
            <p className="mb-2"><span className="font-semibold text-slate-300">Store Name:</span> <span className="text-white">{request.store_name}</span></p>
            <p className="mb-2"><span className="font-semibold text-slate-300">Subdomain:</span> <span className="text-white">{request.store_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}</span></p>
            <p className="mb-0"><span className="font-semibold text-slate-300">Submitted:</span> <span className="text-white">{new Date(request.created_at).toLocaleDateString()}</span></p>
          </div>
          <div className="px-6 max-w-sm mx-auto">
            <DashButton onClick={onClose} className="dash-btn dash-btn-primary w-full justify-center py-3 font-semibold rounded-xl cursor-pointer">
              Close
            </DashButton>
          </div>
        </div>
      </Modal>
    );
  }

  `;
  
  code = code.replace(oldPending, newPending);
  fs.writeFileSync('src/components/StoreStatusModal.jsx', code);
  console.log('Successfully updated StoreStatusModal.jsx');
} else {
  console.log('Could not find boundaries.');
}
