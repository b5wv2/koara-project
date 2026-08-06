const fs = require('fs');
let code = fs.readFileSync('src/components/OnboardingModal.jsx', 'utf8');

const imports = `import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import OTPInput from './OTPInput';
import { UploadCloud, CheckCircle2, ArrowRight, ArrowLeft, Building2, User, ShieldCheck, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import DashButton from './ui/DashButton';
import { useAsyncAction } from '../hooks/useAsyncAction';

const API_BASE_URL = import.meta.env.VITE_API_URL;

`;

fs.writeFileSync('src/components/OnboardingModal.jsx', imports + code);
console.log('Successfully injected imports');
