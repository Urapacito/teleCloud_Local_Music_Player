import React, { useState } from 'react';

const Login = ({ onLoginSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    setLoading(true);
    try {
      const ipcRenderer = window.ipcRenderer;
      const res = await ipcRenderer.invoke('telegram-send-code', phoneNumber);
      if (res.success) {
        setStep(2);
      } else {
        alert('Error: ' + res.error);
      }
    } catch (err) {
      alert('Error sending code: ' + err.message);
    }
    setLoading(false);
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    try {
      const ipcRenderer = window.ipcRenderer;
      const res = await ipcRenderer.invoke('telegram-verify-code', phoneCode);
      if (res.success) {
        // Wait a second for GramJS to finalize
        setTimeout(() => {
          onLoginSuccess();
          setLoading(false);
        }, 1500);
      } else {
        alert('Error: ' + res.error);
        setLoading(false);
      }
    } catch (err) {
      alert('Error verifying code: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ color: 'white', padding: '20px' }}>
      <h2>Connect to Telegram</h2>
      <p>You only need to do this once. The session will be saved locally.</p>
      
      {step === 1 && (
        <div>
          <input 
            type="text" 
            placeholder="Phone Number (e.g. +1234567890)" 
            value={phoneNumber} 
            onChange={(e) => setPhoneNumber(e.target.value)}
            style={{ padding: '10px', width: '300px', marginBottom: '10px', color: 'black' }}
          />
          <br/>
          <button onClick={handleSendCode} disabled={loading} style={{ padding: '10px 20px', cursor: 'pointer', color: 'black' }}>
            {loading ? 'Sending...' : 'Send Code'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <input 
            type="text" 
            placeholder="Telegram Code" 
            value={phoneCode} 
            onChange={(e) => setPhoneCode(e.target.value)}
            style={{ padding: '10px', width: '300px', marginBottom: '10px', color: 'black' }}
          />
          <br/>
          <button onClick={handleVerifyCode} disabled={loading} style={{ padding: '10px 20px', cursor: 'pointer', color: 'black' }}>
            {loading ? 'Verifying...' : 'Verify & Login'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Login;
