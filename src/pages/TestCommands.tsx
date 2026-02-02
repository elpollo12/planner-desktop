import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface LoginResponse {
  session_token: string;
  user: {
    id: string;
    username: string;
    full_name: string;
    role: string;
  };
}

function TestCommands() {
  const [sessionToken, setSessionToken] = useState<string>('');
  const [output, setOutput] = useState<string>('');

  const log = (message: string, data?: any) => {
    const logMessage = data
      ? `${message}\n${JSON.stringify(data, null, 2)}`
      : message;
    setOutput(prev => prev + '\n' + logMessage + '\n---');
    console.log(message, data);
  };

  const handleLogin = async () => {
    try {
      const result = await invoke<LoginResponse>('login', {
        username: 'admin',
        password: 'admin123'
      });
      log('✅ Login exitoso:', result);
      setSessionToken(result.session_token);
    } catch (error) {
      log('❌ Error en login:', error);
    }
  };

  const handleGetCurrentUser = async () => {
    try {
      const user = await invoke('get_current_user', {
        sessionToken
      });
      log('✅ Usuario actual:', user);
    } catch (error) {
      log('❌ Error obteniendo usuario:', error);
    }
  };

  const handleCreateReport = async () => {
    try {
      const report = await invoke('create_report', {
        sessionToken,
        reportData: {
          report_number: 1,
          report_date: '2024-01-15',
          well_number: 'WELL-001',
          rig_number: 'TAL-01',
          operator: 'YPFB',
          contract: 'CONT-2024-001',
          field_district: 'Distrito Norte',
          company: 'Mi Empresa'
        }
      });
      log('✅ Reporte creado:', report);
    } catch (error) {
      log('❌ Error creando reporte:', error);
    }
  };

  const handleListReports = async () => {
    try {
      const reports = await invoke('list_reports', {
        sessionToken,
        filters: {}
      });
      log('✅ Reportes listados:', reports);
    } catch (error) {
      log('❌ Error listando reportes:', error);
    }
  };

  const handleCreateUser = async () => {
    try {
      const user = await invoke('create_user', {
        sessionToken,
        userData: {
          username: 'operator1',
          password: 'operator123',
          full_name: 'Juan Pérez',
          ci: '1234567',
          role: 'operator',
          position: 'Perforador'
        }
      });
      log('✅ Usuario creado:', user);
    } catch (error) {
      log('❌ Error creando usuario:', error);
    }
  };

  const handleListUsers = async () => {
    try {
      const users = await invoke('list_users', {
        sessionToken
      });
      log('✅ Usuarios listados:', users);
    } catch (error) {
      log('❌ Error listando usuarios:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await invoke('logout', {
        sessionToken
      });
      log('✅ Logout exitoso');
      setSessionToken('');
    } catch (error) {
      log('❌ Error en logout:', error);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Test de Comandos Tauri</h1>

      <div style={{ marginBottom: '20px' }}>
        <strong>Session Token:</strong> {sessionToken ? `${sessionToken.slice(0, 20)}...` : 'No autenticado'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
        <button onClick={handleLogin} style={buttonStyle}>
          1. Login (admin/admin123)
        </button>
        <button onClick={handleGetCurrentUser} disabled={!sessionToken} style={buttonStyle}>
          2. Get Current User
        </button>
        <button onClick={handleCreateReport} disabled={!sessionToken} style={buttonStyle}>
          3. Crear Reporte
        </button>
        <button onClick={handleListReports} disabled={!sessionToken} style={buttonStyle}>
          4. Listar Reportes
        </button>
        <button onClick={handleCreateUser} disabled={!sessionToken} style={buttonStyle}>
          5. Crear Usuario (Admin)
        </button>
        <button onClick={handleListUsers} disabled={!sessionToken} style={buttonStyle}>
          6. Listar Usuarios (Admin)
        </button>
        <button onClick={handleLogout} disabled={!sessionToken} style={buttonStyle}>
          7. Logout
        </button>
      </div>

      <div style={{
        backgroundColor: '#1a1a1a',
        color: '#00ff00',
        padding: '15px',
        borderRadius: '5px',
        maxHeight: '600px',
        overflowY: 'auto',
        whiteSpace: 'pre-wrap',
        fontSize: '12px'
      }}>
        {output || 'Los resultados aparecerán aquí...'}
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p><strong>Instrucciones:</strong></p>
        <ol>
          <li>Haz clic en "Login" para autenticarte como admin</li>
          <li>Prueba los demás comandos (se habilitarán después del login)</li>
          <li>Revisa los resultados en el panel negro</li>
          <li>Puedes hacer logout cuando termines</li>
        </ol>
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '10px 15px',
  fontSize: '14px',
  backgroundColor: '#1E3A5F',
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  transition: 'all 0.2s'
};

export default TestCommands;
