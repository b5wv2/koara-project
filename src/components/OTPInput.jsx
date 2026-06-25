import React, { useState, useRef, useEffect } from 'react';

const OTPInput = ({ length = 6, onComplete, value, onChange }) => {
  const [otp, setOtp] = useState(new Array(length).fill(""));
  const inputRefs = useRef([]);

  useEffect(() => {
    if (value !== undefined) {
      const valArray = value.split('').slice(0, length);
      const newOtp = [...otp];
      for(let i=0; i<length; i++) {
         newOtp[i] = valArray[i] || "";
      }
      setOtp(newOtp);
    }
  }, [value, length]);

  const handleChange = (e, index) => {
    const val = e.target.value;
    if (isNaN(val)) return;

    const newOtp = [...otp];
    // take only the last character in case they type fast
    newOtp[index] = val.substring(val.length - 1);
    
    setOtp(newOtp);
    if (onChange) onChange(newOtp.join(""));

    // Move to next input if current field is filled
    if (val && index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }

    // Trigger onComplete if all fields are filled
    if (newOtp.every(v => v !== "") && newOtp.join("").length === length) {
      if (onComplete) {
        onComplete(newOtp.join(""));
      }
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && inputRefs.current[index - 1]) {
      // Move focus to the previous input field on backspace if current is empty
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text/plain").trim();
    if (!pasteData || isNaN(pasteData)) return;

    const pasteArray = pasteData.split("").slice(0, length);
    const newOtp = [...otp];
    
    pasteArray.forEach((char, i) => {
      newOtp[i] = char;
    });

    setOtp(newOtp);
    if (onChange) onChange(newOtp.join(""));

    // Focus the next empty input or the last one
    const nextIndex = pasteArray.length < length ? pasteArray.length : length - 1;
    if (inputRefs.current[nextIndex]) {
      inputRefs.current[nextIndex].focus();
    }

    if (newOtp.every(v => v !== "") && newOtp.join("").length === length) {
      if (onComplete) {
        onComplete(newOtp.join(""));
      }
    }
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {otp.map((data, index) => (
        <input
          key={index}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          ref={(ref) => (inputRefs.current[index] = ref)}
          value={data}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className="w-10 h-12 text-center text-xl font-semibold text-black bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-koara-blue focus:ring-2 focus:ring-koara-blue/20 transition-all"
        />
      ))}
    </div>
  );
};

export default OTPInput;
