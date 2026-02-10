// Script de diagnóstico para verificar el estado de los taladros
// Ejecutar en la consola del navegador (F12) cuando la app esté abierta

(async function debugRigs() {
  try {
    console.log('=== DIAGNÓSTICO DE TALADROS ===\n');

    // Importar invoke de Tauri
    const { invoke } = window.__TAURI__.core;

    // 1. Obtener información general
    console.log('1. Información General:');
    const syncInfo = await invoke('debug_get_sync_info');
    console.log('   Total de taladros:', syncInfo.total_rigs);
    console.log('   Taladros activos:', syncInfo.active_rigs);
    console.log('   Taladros inactivos:', syncInfo.inactive_rigs);
    console.log('   Total de reportes:', syncInfo.total_reports);
    console.log('');

    // 2. Listar todos los taladros
    console.log('2. Lista de Todos los Taladros:');
    const allRigs = await invoke('debug_list_all_rigs');

    console.table(allRigs.map(rig => ({
      'Nombre': rig.name,
      'Operador': rig.operator,
      'Estado': rig.active ? 'ACTIVO ✅' : 'INACTIVO ❌',
      'Tiene Área': rig.area_id ? 'Sí' : 'No',
      'ID': rig.id.substring(0, 8) + '...'
    })));

    console.log('');
    console.log('=== DIAGNÓSTICO COMPLETO ===');

    // 3. Análisis
    const inactiveRigs = allRigs.filter(r => !r.active);
    if (inactiveRigs.length > 0) {
      console.warn('⚠️ ENCONTRADO:', inactiveRigs.length, 'taladro(s) inactivo(s)');
      console.warn('   Para verlos en la UI, marca el checkbox "Incluir taladros inactivos"');
      console.warn('   Taladros inactivos:', inactiveRigs.map(r => r.name).join(', '));
    }

    if (syncInfo.total_rigs === 1) {
      console.error('❌ Solo hay 1 taladro en la base de datos local');
      console.log('   Solución: Ve a Admin → Sincronización → "Recibir de la Nube"');
    }

  } catch (error) {
    console.error('Error ejecutando diagnóstico:', error);
  }
})();
