/**
 * Constantes y plantillas institucionales para Bitácora Hablada
 */
export const WORKSPACES = {
  PERSONAL: 'personal',
  ENTERPRISE: 'enterprise'
};

export const DEFAULT_PERSONAL_FOLDERS = [
  { name: 'General', color: null },
  { name: 'Ideas', color: null },
  { name: 'Trabajo', color: null },
  { name: 'Personal', color: null },
  { name: 'Lecturas', color: null }
];

export const DEFAULT_ENTERPRISE_FOLDERS = [
  { name: 'Dirección General', code: 'DIR', color: '#1F5E5B' },
  { name: 'Operaciones & Terreno', code: 'OPE', color: '#C77A2B' },
  { name: 'Recursos Humanos', code: 'RRHH', color: '#5B7FBD' },
  { name: 'Legal & Cumplimiento', code: 'LEG', color: '#8A5FBD' },
  { name: 'Finanzas & Presupuesto', code: 'FIN', color: '#4FA98F' },
  { name: 'Tecnología e Innovación', code: 'TI', color: '#BD5F8A' }
];

export const DEFAULT_TEAM_MEMBERS = [
  { id: 'm1', name: 'Lic. Roberto Méndez', role: 'Director General', dept: 'Dirección General' },
  { id: 'm2', name: 'Ing. Valentina Soto', role: 'Jefa de Operaciones', dept: 'Operaciones & Terreno' },
  { id: 'm3', name: 'Dra. Camila Morales', role: 'Asesora Legal & Cumplimiento', dept: 'Legal & Cumplimiento' },
  { id: 'm4', name: 'Lic. Javier Silva', role: 'Especialista en RRHH', dept: 'Recursos Humanos' }
];

export const DEFAULT_LETTERHEAD = {
  orgName: 'INSTITUCIÓN / CORPORACIÓN OFICIAL',
  orgDept: 'Dirección General de Operaciones',
  orgSub: 'Sistema Institucional de Gestión y Control Documental',
  orgLogo: './app_icon.jpg',
  sigAuthor: 'Responsable de Emisión / Inspector',
  sigReviewer: 'Dirección General / Jefatura',
  footerLegal: 'Documento oficial generado por BH Enterprise. Confidencial y de uso institucional.'
};

export const INSTITUTIONAL_TEMPLATES = {
  minuta: {
    type: 'minuta',
    title: 'MINUTA DE REUNIÓN EJECUTIVA',
    priority: 'normal',
    content: `MINUTA DE REUNIÓN EJECUTIVA

1. OBJETIVO DE LA REUNIÓN:
Definir los lineamientos operativos y dar seguimiento a los compromisos del período.

2. ASISTENTES Y CONVOCADOS:
- Convocó: Dirección General
- Participantes: Equipo de Operaciones, Finanzas y Legal

3. PUNTOS TRATADOS:
- Revisión de indicadores clave de desempeño (KPIs).
- Estado de avance de los proyectos en terreno.
- Requerimientos presupuestarios extraordinarios.

4. ACUERDOS Y COMPROMISOS ALCANZADOS:
- [ ] Acuerdo 1: Validación del cronograma de trabajo para el próximo trimestre.
- [ ] Acuerdo 2: Envío de informe financiero consolidado antes del viernes.
- [ ] Acuerdo 3: Coordinación de inspección técnica en terreno.

5. PRÓXIMA REUNIÓN:
Fecha tentativa: Lunes de la próxima semana a las 09:30 hrs.`
  },
  incidencia: {
    type: 'incidencia',
    title: 'REPORTE DE INCIDENCIA / INSPECCIÓN',
    priority: 'alta',
    content: `REPORTE DE INCIDENCIA Y HALLAZGOS EN TERRENO

1. DATOS GENERALES:
- Sector / Área afectada: Operaciones / Faena Principal
- Nivel de Criticidad: Alta
- Fecha y Hora del evento: ${new Date().toLocaleDateString('es-ES')}

2. DESCRIPCIÓN DE LOS HECHOS:
Se detecta una desviación respecto al estándar operativo durante la ronda de supervisión programada.

3. CAUSA RAÍZ ESTIMADA:
Falla de calibración en equipo secundario y retraso en suministro de insumos críticos.

4. MEDIDAS CORRECTIVAS INMEDIATAS ADOPTADAS:
- Detención preventiva de la línea afectada.
- Notificación al personal de turno y aislamiento del sector.
- Activación de protocolo de contingencia N° 4.

5. ACCIONES PREVENTIVAS Y SEGUIMIENTO:
- Subsanar mantenimiento correctivo en un plazo máximo de 24 horas.
- Re-entrenamiento al operador a cargo.`
  },
  acta: {
    type: 'acta',
    title: 'ACTA FORMAL DE ACUERDOS Y RESOLUCIONES',
    priority: 'media',
    content: `ACTA DE SESIÓN Y RESOLUCIONES FORMALES

1. ANTECEDENTES Y QUÓRUM:
En dependencias institucionales se constituye la mesa de trabajo con el quórum reglamentario para sesionar.

2. TABLA DE PUNTOS A TRATAR:
1. Aprobación del acta anterior.
2. Propuesta de actualización reglamentaria.
3. Asignación de recursos y designación de comisiones.

3. DELIBERACIÓN:
Los miembros presentes analizan los antecedentes técnicos expuestos por la jefatura de área, valorando la factibilidad y cumplimiento normativo.

4. RESOLUCIONES VINCULANTES:
- RESOLUCIÓN 01: Se aprueba por unanimidad el plan de trabajo presentado.
- RESOLUCIÓN 02: Se encomienda a la unidad legal la redacción del convenio respectivo.

5. CIERRE DE SESIÓN:
Habiéndose cumplido el objeto de la convocatoria, se levanta la sesión en conformidad de todos los intervinientes.`
  },
  turno: {
    type: 'turno',
    title: 'BITÁCORA DE TURNO Y RELEVO OPERATIVO',
    priority: 'normal',
    content: `BITÁCORA DE TURNO Y RELEVO OPERATIVO

1. DATOS DEL SERVICIO:
- Turno: Diurno (08:00 - 18:00 hrs)
- Supervisor a cargo: Responsable de Operaciones
- Dotación de personal activa: 100% operativo

2. RESUMEN DE NOVEDADES OPERATIVAS:
- Inicio de jornada sin contratiempos.
- Verificación de inventario de herramientas y equipos críticos conforme.
- Cumplimiento de la pauta de tareas asignadas al 95%.

3. INCIDENCIAS O ANOMALÍAS REGISTRADAS:
- Variación temporal de suministro eléctrico a las 11:20 hrs (subsanada de inmediato).

4. TAREAS PENDIENTES PARA EL TURNO ENTRANTE:
- [ ] Recibir despacho de materiales programado para las 20:00 hrs.
- [ ] Monitorear lectura de sensores en sala técnica.
- [ ] Realizar cierre de bitácora nocturna.

5. CONFORMIDAD DE ENTREGA:
Se entrega el puesto en orden y en condiciones seguras de operatividad.`
  },
  inspeccion: {
    type: 'inspeccion',
    title: 'PAUTA DE INSPECCIÓN TÉCNICA EN TERRENO',
    priority: 'media',
    content: `PAUTA DE INSPECCIÓN TÉCNICA Y AUDITORÍA EN TERRENO

1. IDENTIFICACIÓN DE LA VISITA:
- Unidad / Instalación: Faena / Oficinas Centrales
- Motivo: Inspección periódica de control de calidad y seguridad
- Inspector responsable: Equipo de Fiscalización

2. CRITERIOS EVALUADOS:
[C = Conforme | NC = No Conforme | NA = No Aplica]
- [C] Elementos de Protección Personal (EPP) y protocolos de seguridad.
- [C] Señalética institucional y vías de evacuación despejadas.
- [NC] Registro de mantenimiento de extintores (plazo de recarga próximo a vencer).
- [C] Orden y limpieza en puestos de trabajo.

3. OBSERVACIONES Y NO CONFORMIDADES DETECTADAS:
Se requiere actualizar la bitácora física de inspecciones y reubicar kit de primeros auxilios.

4. CONCLUSIÓN Y PLAZO DE REGULARIZACIÓN:
Se fija un plazo de 72 horas para subsanar los puntos observados.`
  }
};
