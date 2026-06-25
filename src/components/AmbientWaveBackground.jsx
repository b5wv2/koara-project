import React from 'react';

const AmbientWaveBackground = () => {
  return (
    <div className="absolute top-0 right-0 w-full h-[800px] overflow-hidden pointer-events-none z-0">
      <div className="absolute -top-[20%] -right-[10%] w-[80%] h-[100%] bg-gradient-to-br from-[#2563EB]/15 via-[#00BFFF]/10 to-[#4F46E5]/10 blur-[100px] rounded-full animate-float-wave opacity-60"></div>
      <div className="absolute top-[10%] right-[20%] w-[60%] h-[80%] bg-gradient-to-tr from-[#3B82F6]/10 via-[#4F46E5]/8 to-[#38BDF8]/12 blur-[120px] rounded-[100%] animate-float-wave-delayed opacity-50"></div>
      {/* Bottom section ambient glow */}
      <div className="absolute bottom-0 left-[10%] w-[50%] h-[60%] bg-gradient-to-t from-[#2563EB]/8 via-[#4F46E5]/5 to-transparent blur-[140px] rounded-full animate-float-wave opacity-40"></div>
    </div>
  );
};

export default AmbientWaveBackground;
