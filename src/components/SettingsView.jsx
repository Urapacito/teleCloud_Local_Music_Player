import React, { useState, useEffect } from 'react';

const SettingsView = ({ currentView, theme, setTheme, setDisabledDevices: setAppDisabledDevices }) => {
  const [activeTab, setActiveTab] = useState('Downloads');
  const [downloadFolder, setDownloadFolder] = useState('');
  const [audioDevices, setAudioDevices] = useState([]);
  const [disabledDevices, setDisabledDevices] = useState([]);

  useEffect(() => {
    const fetchSettings = async () => {
      const ipcRenderer = window.require('electron').ipcRenderer;
      const settings = await ipcRenderer.invoke('load-store', 'settings');
      if (settings && settings.downloadFolder) {
        setDownloadFolder(settings.downloadFolder);
      }
      if (settings && settings.disabledDevices) {
        setDisabledDevices(settings.disabledDevices);
      }
      
      try {
        const devs = await window.require('electron').ipcRenderer.invoke('get-audio-devices');
        // Auto is default, filter out empty names or irrelevant
        const outputs = devs.filter(d => d.id !== 'auto' && d.name);
        outputs.unshift({ id: '-1', name: 'System Default' });
        setAudioDevices(outputs);
      } catch (e) {
        console.error('Error fetching audio devices', e);
      }
    };
    fetchSettings();
  }, []);

  const toggleDevice = async (deviceId) => {
    const ipcRenderer = window.require('electron').ipcRenderer;
    let newDisabled = [...disabledDevices];
    if (newDisabled.includes(deviceId)) {
      newDisabled = newDisabled.filter(id => id !== deviceId);
    } else {
      newDisabled.push(deviceId);
    }
    setDisabledDevices(newDisabled);
    if (setAppDisabledDevices) {
      setAppDisabledDevices(newDisabled);
    }
    const settings = await ipcRenderer.invoke('load-store', 'settings') || {};
    const newSettings = Array.isArray(settings) ? {} : settings;
    newSettings.disabledDevices = newDisabled;
    await ipcRenderer.invoke('save-store', 'settings', newSettings);
  };

  const handleChangeLocation = async () => {
    const ipcRenderer = window.require('electron').ipcRenderer;
    const folderPath = await ipcRenderer.invoke('select-music-folder');
    if (folderPath) {
      setDownloadFolder(folderPath);
      const settings = await ipcRenderer.invoke('load-store', 'settings') || {};
      const newSettings = Array.isArray(settings) ? {} : settings;
      newSettings.downloadFolder = folderPath;
      await ipcRenderer.invoke('save-store', 'settings', newSettings);
    }
  };

  const tabs = ['General', 'Audio', 'Advanced Audio', 'Downloads', 'Network', 'About'];

  return (
    <div style={{ display: 'flex', height: '100%', color: 'var(--text-main)', padding: '30px' }}>
      
      {/* Left Sidebar */}
      <div style={{ width: '250px', borderRight: '1px solid var(--bg-tertiary)', paddingRight: '20px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px' }}>Settings</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {tabs.map(tab => (
            <li key={tab}>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); setActiveTab(tab); }}
                style={{
                  display: 'block',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  color: activeTab === tab ? 'var(--accent-red)' : 'var(--text-muted)',
                  background: activeTab === tab ? 'rgba(230, 57, 70, 0.1)' : 'transparent',
                  textDecoration: 'none',
                  fontWeight: activeTab === tab ? 'bold' : 'normal',
                  marginBottom: '5px',
                  transition: 'all 0.2s'
                }}
              >
                {tab}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, paddingLeft: '40px', overflowY: 'auto' }}>
        
        {activeTab === 'Downloads' && (
          <div>
            <h3 style={{ fontSize: '20px', marginBottom: '30px', fontWeight: 'bold' }}>Download Management</h3>
            
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--bg-tertiary)', overflow: 'hidden' }}>
              <div style={{ padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ width: '50px', height: '50px', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="var(--text-muted)"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>Default Download Location</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {downloadFolder || 'No location set. Downloads will prompt for a folder.'}
                    </div>
                  </div>
                </div>
                <div>
                  <button 
                    onClick={handleChangeLocation}
                    style={{ 
                      background: 'var(--accent-red)', 
                      color: 'white', 
                      border: 'none', 
                      padding: '10px 24px', 
                      borderRadius: '20px', 
                      fontSize: '13px', 
                      fontWeight: 'bold', 
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#c1121f'}
                    onMouseOut={e => e.currentTarget.style.background = 'var(--accent-red)'}
                  >
                    Change Location
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'General' && (
          <div>
            <h3 style={{ fontSize: '20px', marginBottom: '30px', fontWeight: 'bold' }}>General Settings</h3>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--bg-tertiary)', overflow: 'hidden', padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>Theme</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Switch between Dark and Light mode</div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setTheme('dark')}
                  style={{ background: theme === 'dark' ? 'var(--accent-red)' : 'var(--bg-hover)', color: 'var(--text-main)', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Dark
                </button>
                <button 
                  onClick={() => setTheme('light')}
                  style={{ background: theme === 'light' ? 'var(--accent-red)' : 'var(--bg-hover)', color: 'var(--text-main)', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Light
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Audio' && (
          <div>
            <h3 style={{ fontSize: '20px', marginBottom: '30px', fontWeight: 'bold' }}>Audio Output Devices</h3>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--bg-tertiary)', overflow: 'hidden' }}>
              {audioDevices.map((device, idx) => (
                <div key={device.id} style={{ padding: '20px 25px', borderBottom: idx < audioDevices.length - 1 ? '1px solid var(--bg-tertiary)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '4px', color: disabledDevices.includes(device.id) ? 'var(--text-muted)' : 'var(--text-main)' }}>
                      {device.name}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleDevice(device.id)}
                    style={{
                      background: disabledDevices.includes(device.id) ? 'var(--bg-hover)' : 'transparent',
                      border: `1px solid ${disabledDevices.includes(device.id) ? 'var(--bg-tertiary)' : 'var(--accent-red)'}`,
                      color: disabledDevices.includes(device.id) ? 'var(--text-muted)' : 'var(--accent-red)',
                      padding: '6px 16px',
                      borderRadius: '15px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {disabledDevices.includes(device.id) ? 'Enable' : 'Disable'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {['Network', 'About'].includes(activeTab) && (
          <div style={{ color: 'var(--text-muted)', marginTop: '50px' }}>
            {activeTab} settings coming soon.
          </div>
        )}

        {activeTab === 'Advanced Audio' && (
          <div>
            <h3 style={{ fontSize: '20px', marginBottom: '30px', fontWeight: 'bold' }}>Advanced Audio</h3>
            
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--bg-tertiary)', overflow: 'hidden' }}>
              
              <div style={{ padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bg-tertiary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'var(--bg-main)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-main)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"></path><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"></path><path d="M16 17h4"></path><path d="M4 13h4"></path></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>Parametric EQ & AutoEQ</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Advanced 31-band PEQ with automated target matching</div>
                  </div>
                </div>
                <div>
                  <button 
                    onClick={() => { if (window.openEqSettings) window.openEqSettings(); }}
                    style={{ 
                      background: 'var(--accent-red)', 
                      color: 'white', 
                      border: 'none', 
                      padding: '10px 24px', 
                      borderRadius: '20px', 
                      fontSize: '13px', 
                      fontWeight: 'bold', 
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#c1121f'}
                    onMouseOut={e => e.currentTarget.style.background = 'var(--accent-red)'}
                  >
                    Open EQ Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

export default SettingsView;
