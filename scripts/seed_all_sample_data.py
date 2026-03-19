"""
Seed script: 3 DDR reports, 3 API reports, 18 logistics entries, 10 incidents
Uses real IDs from synced config data + correct column names.
"""
import sqlite3, uuid, random
from datetime import datetime, timedelta

DB = r'C:\Users\plxus\AppData\Roaming\d-planner-temp\planner.db'
conn = sqlite3.connect(DB)
cur = conn.cursor()

def uid(): return str(uuid.uuid4())
def ts(d): return d.strftime('%Y-%m-%dT%H:%M:%S+00:00')
def ds(d): return d.strftime('%Y-%m-%d')

# Load reference data
cur.execute("SELECT id FROM users WHERE username='admin'")
ADMIN = cur.fetchone()[0]
cur.execute("SELECT id, username FROM users WHERE role='operator' AND (is_deleted IS NULL OR is_deleted=0)")
OPERATORS = cur.fetchall()
cur.execute("SELECT id, name FROM rigs WHERE active=1 AND (is_deleted IS NULL OR is_deleted=0) LIMIT 3")
RIGS = cur.fetchall()
cur.execute("SELECT id, code, name FROM operation_codes WHERE (is_deleted IS NULL OR is_deleted=0)")
OP_CODES = cur.fetchall()
cur.execute("SELECT id, name FROM crew_positions")
POSITIONS = cur.fetchall()
cur.execute("SELECT id, name FROM incident_types")
INC_TYPES = cur.fetchall()
cur.execute("SELECT id, rig_id, name, ci, default_position FROM rig_personnel WHERE (is_deleted IS NULL OR is_deleted=0)")
RIG_PERSONNEL = cur.fetchall()
cur.execute("SELECT id, code, name FROM fluid_product_catalog WHERE active=1 ORDER BY code")
FLUID_PRODUCTS = cur.fetchall()

now = datetime(2026, 3, 19, 12, 0, 0)
RIG1, RIG1_NAME = RIGS[0]
RIG2, RIG2_NAME = RIGS[1] if len(RIGS) > 1 else RIGS[0]

print(f"Rigs: {RIG1_NAME}, {RIG2_NAME} | Operators: {len(OPERATORS)}")

# ============================================================================
# 1. DDR REPORTS (3 complete)
# ============================================================================
print("\n=== DDR REPORTS ===")
DDR_DATES = [datetime(2026,3,17), datetime(2026,3,18), datetime(2026,3,19)]

for idx, rd in enumerate(DDR_DATES):
    rid = uid()
    t = ts(rd)
    created_by = OPERATORS[idx % len(OPERATORS)][0] if OPERATORS else ADMIN

    cur.execute("""INSERT INTO reports (
        id, report_number, report_date, well_number, api_number,
        contract, contractor, operator, field_district, municipality,
        rig_number, supervisor_24h, status, created_by,
        created_at, updated_at, synced, is_deleted
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0)""", (
        rid, idx+1, ds(rd), 'POZ-ANACO-1501', 'API-VE-2026-001',
        'CONT-2026-100', 'Halliburton', 'PDVSA', 'Distrito Anaco', 'Anaco',
        RIG1_NAME, 'Ing. Jose Martinez', 'submitted', created_by, t, t
    ))

    # Crew shifts (3)
    shifts = ['morning', 'afternoon', 'night']
    for si, shift in enumerate(shifts):
        sid = uid()
        cur.execute("""INSERT INTO crew_shifts (id, report_id, shift, shift_start, shift_end, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?)""", (
            sid, rid, shift, ['07:00','13:00','19:00'][si], ['13:00','19:00','07:00'][si], t, t))

        # Crew members (3 per shift)
        personnel = [p for p in RIG_PERSONNEL if p[1] == RIG1]
        for pi in range(min(3, max(len(personnel), 3))):
            if pi < len(personnel):
                p = personnel[pi]
                pname, pci, ppos = p[2], p[3], p[4]
            else:
                pname = f'Trabajador {pi+1}'
                pci = f'{20000000+pi}'
                ppos = POSITIONS[pi % len(POSITIONS)][1]
            cur.execute("""INSERT INTO crew_members (id, crew_shift_id, position, ci, name, hours, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?)""", (uid(), sid, ppos, pci, pname, 6.0, t, t))

    # Time distribution (6 operation codes with hours per shift)
    for oi in range(6):
        op = OP_CODES[oi % len(OP_CODES)]
        cur.execute("""INSERT INTO time_distribution (id, report_id, operation_code_id, hours_shift1, hours_shift2, hours_shift3, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?)""", (uid(), rid, op[0], round(random.uniform(0,3),1), round(random.uniform(0,3),1), round(random.uniform(0,3),1), t, t))

    # Bit records (2)
    for bi in range(2):
        cur.execute("""INSERT INTO bit_records (
            id, report_id, shift, size, manufacturer_code, brand, bit_type, serial_number,
            jets, tfa, depth_in, depth_out, footage, hours_total, dp_tubos, kelly,
            created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
            uid(), rid, shifts[bi%3], '12 1/4"', 'MX-20', 'Baker Hughes', 'PDC', f'SN-{idx+1}{bi+1}',
            '3x12+2x14', 0.85, 8000+idx*200, 8100+idx*200+bi*50,
            100+bi*50, round(random.uniform(8,24),1), random.randint(80,120), 1, t, t))

    # Mud records (3)
    for si in range(3):
        cur.execute("""INSERT INTO mud_records (
            id, report_id, shift, hour, weight, viscosity, pvp, gels, filtrate, ph, solids,
            created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
            uid(), rid, shifts[si], ['08:00','14:00','20:00'][si],
            str(round(9.0+random.uniform(0,0.5),1)), str(random.randint(38,48)),
            str(random.randint(8,14)), f'{random.randint(3,6)}/{random.randint(7,12)}',
            str(round(random.uniform(5,9),1)), str(round(random.uniform(9.0,10.0),1)),
            str(random.randint(5,12)), t, t))

    # Mud additives (3)
    for ai, additive in enumerate(['Bentonita','Barita','Soda Caustica']):
        cur.execute("""INSERT INTO mud_additives (id, report_id, shift, additive_type, quantity, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?)""", (uid(), rid, shifts[ai%3], additive, f'{random.randint(10,80)} sacos', t, t))

    # Drilling parameters (3)
    for si in range(3):
        cur.execute("""INSERT INTO drilling_parameters (
            id, report_id, shift, depth_from, depth_to, rotary_rpm, bit_weight,
            pump_pressure, pump_spm, total_gpm, created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""", (
            uid(), rid, shifts[si], 8000+idx*200+si*30, 8030+idx*200+si*30,
            random.randint(80,140), random.randint(15,35),
            random.randint(2000,3500), random.randint(80,120), random.randint(400,700), t, t))

    # Deviation history (3)
    for di in range(3):
        depth = 8000 + idx*200 + di*50
        cur.execute("""INSERT INTO deviation_history (id, report_id, depth, deviation, direction, tvo, horizontal_displacement, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?)""", (
            uid(), rid, depth, round(random.uniform(0.5,3),2), round(random.uniform(0,360),1),
            depth-random.randint(5,20), round(random.uniform(10,80),1), t, t))

    # Operations log (6)
    hour = 7
    for li in range(6):
        dur = round(random.uniform(1,4),1)
        op = OP_CODES[li % len(OP_CODES)]
        cur.execute("""INSERT INTO operations_log (id, report_id, shift, time_from, time_to, duration, operation_code, details, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?)""", (
            uid(), rid, shifts[li%3], f'{int(hour):02d}:00', f'{int(hour+dur)%24:02d}:00',
            dur, op[1], f'{op[2]} - Sin novedad', t, t))
        hour = (hour + dur) % 24

    # Drill string (6 components)
    comps = ['Broca PDC 12 1/4"','Motor de Fondo','MWD/LWD','Estabilizador','HWDP 5"','DP 5"']
    for ci, comp in enumerate(comps):
        cur.execute("""INSERT INTO drill_string_components (id, report_id, entry_number, piece_name, length, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?)""", (uid(), rid, ci+1, comp, round(random.uniform(0.3,300),1), t, t))

    print(f"  DDR #{idx+1}: {ds(rd)} - {RIG1_NAME}")

# ============================================================================
# 2. FLUID / API REPORTS (3 complete)
# ============================================================================
print("\n=== API REPORTS ===")

for idx in range(3):
    rd = DDR_DATES[idx]
    frid = uid()
    t = ts(rd)

    cur.execute("""INSERT INTO fluid_reports (
        id, rig_id, report_number, report_date, well_number, rig_number,
        contract, contractor, operator, field_district, supervisor_24h,
        fluid_type, well_phase, fluid_coordinator, tech_rep_1, tech_rep_2, trainee, ops_supervisor,
        bottom_down_min, bottom_down_emb, bottom_up_min, bottom_up_emb,
        well_cycle_min, well_cycle_emb, total_cycle_min, total_cycle_emb,
        vol_inicial, vol_perdido_hoyo, vol_descartado, vol_preparado,
        vol_transferido, vol_recibido, vol_perdido_sup, vol_final,
        esd, ecd, emb_n_tuberia, emb_n_anular, emb_k_tuberia, emb_k_anular,
        fluid_comments, product_comments, vol_comments,
        is_deleted, created_by, updated_by, created_at, updated_at, synced
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,0)""", (
        frid, RIG1, idx+1, ds(rd), 'POZ-ANACO-1501', RIG1_NAME,
        'CONT-2026-100', 'Halliburton', 'PDVSA', 'Distrito Anaco', 'Ing. Jose Martinez',
        ['WBM','WBM','OBM'][idx], ['17 1/2"','12 1/4"','8 1/2"'][idx],
        'Ing. Roberto Gonzalez', 'Tec. Maria Lopez', 'Tec. Andres Perez', 'Br. Carlos Ruiz', 'Sup. Fernando Diaz',
        45+idx*5, 1350+idx*100, 55+idx*5, 1650+idx*100,
        100+idx*10, 3000+idx*200, 120+idx*10, 3600+idx*200,
        850+idx*25, 15+idx*3, 25-idx*5, 80+idx*10,
        0, 40+idx*5, 5+idx, 925+idx*30,
        9.8+idx*0.1, 10.2+idx*0.1, 0.65, 0.48, 120+idx*5, 85+idx*5,
        f'Fluido estable dia {idx+1}.', f'Consumo normal dia {idx+1}.', f'Volumetria estable dia {idx+1}.',
        ADMIN, ADMIN, t, t
    ))

    # Props (3 shifts)
    for si in range(3):
        cur.execute("""INSERT INTO fluid_props (
            id, fluid_report_id, sample_hour, sample_source, temperature_f, depth_md, depth_tvd,
            density, marsh_viscosity, rpm_600, rpm_300, rpm_200, rpm_100, rpm_6, rpm_3,
            pv, yp, gel_10s, gel_10m, gel_30m, api_filtrate, filter_cake,
            sand_content, solids_retort, oil_retort, water_retort,
            ph, alkalinity_pm, alkalinity_pf, alkalinity_mf,
            calcium_ppm, chlorides_ppm, mbt, brookfield_visc, lubricity_coef,
            created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
            uid(), frid, ['06:00','14:00','22:00'][si], 'Linea de Flujo',
            125+si*3+idx*2, 8000+idx*200, 7800+idx*195,
            9.2+si*0.1+idx*0.05, 42+si*2+idx, 28+si+idx, 18+si+idx, 14+si, 10+si, 4+si, 3+si,
            10+si+idx, 8+si, 4+si, 8+si, 12+si,
            7.5-si*0.2, 1.5+si*0.1, 0.5, 8-si, 2+si, 90-si,
            9.5+idx*0.1, 0.8, 0.4, 3.2, 280+si*10, 45000-si*1000,
            22.5+si, 18-si, 0.28, t, t))

    # Solids (5)
    for eq, mesh in [('Shaker 1','140/120'),('Shaker 2','140/120'),('Shaker 3','200/170'),('3 en 1','API 200'),('Centrifuga','N/A')]:
        cur.execute("INSERT INTO fluid_solids_control (id,fluid_report_id,equipment,design_mesh,hours_today,hours_accumulated,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)",
            (uid(), frid, eq, mesh, 24, 240+idx*24, t, t))

    # Activity
    cur.execute("""INSERT INTO fluid_activity (id,fluid_report_id,hours_moving,hours_circulating,hours_drilling,hours_tripping,
        hours_cleaning,hours_backreaming,hours_cementing,hours_running_csg,hours_other,hours_total,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (uid(), frid, 1.5, 5+idx, 8.5-idx, 3, 1, 2, 0.5, 1, 1.5, 24, t, t))

    # Inventory (8 products)
    for pi in range(min(8, len(FLUID_PRODUCTS))):
        p = FLUID_PRODUCTS[pi]
        ini = random.randint(30,200); rec = random.randint(0,60); cons = random.randint(5,40)
        cur.execute("""INSERT INTO fluid_inventory (id,fluid_report_id,product_id,inv_inicial,received_today,transferred_today,
            consumed_today,inv_final,received_total,transferred_total,consumed_total,daily_cost,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""", (
            uid(), frid, p[0], ini, rec, 0, cons, max(ini+rec-cons,0),
            rec+random.randint(100,400), 0, cons+random.randint(50,200),
            round(random.uniform(100,1500),2), t, t))

    # Services (2)
    for sn, hrs in [('Servicio Tecnico de Fluidos',24),('Ingenieria de Fluidos',12)]:
        cur.execute("""INSERT INTO fluid_services (id,fluid_report_id,service_name,hours_per_day,quantity,days_today,days_total,
            cost_bsf,cost_usd,daily_cost,accumulated_cost,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (uid(), frid, sn, hrs, 1, 1, idx+1, 8500, 280, 280, 280*(idx+1), t, t))

    # Tanks (6)
    for ti, (tn, st, vol, lpg) in enumerate([
        ('TK-VIAJE','active',120+idx*5,9.2),('TK-SUCCION 1','active',200+idx*10,9.2),
        ('TK-SUCCION 2','active',180+idx*5,9.1),('TK-MEZCLA','active',95,9.0),
        ('TK-RESERVA 1','reserve',300,9.0),('TK-CONTINGENCIA','contingency',150,8.8)]):
        cur.execute("INSERT INTO fluid_tanks (id,fluid_report_id,name,system_status,volume_bls,lpg,fluid_type,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (uid(), frid, tn, st, vol, lpg, 'WBM', ti, t, t))

    # Vol stats
    vsid = uid()
    cur.execute('PRAGMA table_info(fluid_vol_stats)')
    cols = [r[1] for r in cur.fetchall()]
    vals = {
        'id': vsid, 'fluid_report_id': frid,
        'vol_cap_sarta':85, 'vol_desp_sarta':120, 'vol_revestidor':45, 'vol_hoyo_desnudo':180,
        'vol_pozo_sin_tuberia':305, 'vol_pozo_con_tuberia':225,
        'vol_sistema_activo':830+idx*20, 'vol_sistema_reserva':300, 'vol_sistema_contingencia':150, 'vol_hoyo_abandonado':0,
        'vol_agua_agregado_hoy':15+idx*2, 'vol_agua_agregado_acum':100+idx*30,
        'vol_productos_hoy':10+idx, 'vol_productos_acum':60+idx*15, 'vol_aceite_acum':0,
        'vol_recibido_hoy':40+idx*5, 'vol_recibido_acum':300+idx*50,
        'vol_procesado_hoy':50+idx*3, 'vol_procesado_acum':280+idx*40, 'vol_manejado_hoy':30+idx*2,
        'vol_total_agregado_hoy':65+idx*5, 'vol_total_agregado_acum':460+idx*80, 'vol_transferido_fuera':0,
        'vol_perdido_ecs':8+idx, 'vol_perdido_ecs_acum':50+idx*10,
        'vol_perdido_humectacion':3, 'vol_perdido_humectacion_acum':18+idx*3,
        'vol_perdido_formacion_hoy':5+idx, 'vol_perdido_formacion_acum':30+idx*8,
        'vol_perdido_permeabilidad':2, 'vol_perdido_permeabilidad_acum':12+idx*3,
        'vol_descartado':25-idx*5, 'vol_entrampado':0,
        'vol_perdido_superficie':5, 'vol_perdido_superficie_acum':30+idx*5,
        'vol_otras_perdidas':1.5,
        'vol_total_perdido_hoy':44+idx*3, 'vol_total_perdido_acum':170+idx*30,
        'vol_inicial_diario':850+idx*25, 'vol_final_diario':925+idx*30,
        'created_at':t, 'updated_at':t,
    }
    ic = [c for c in cols if c in vals]
    cur.execute(f'INSERT INTO fluid_vol_stats ({",".join(ic)}) VALUES ({",".join(["?"]*len(ic))})', [vals[c] for c in ic])

    print(f"  API #{idx+1}: {ds(rd)} - {['WBM','WBM','OBM'][idx]}")

# ============================================================================
# 3. LOGISTICS (18 entries)
# ============================================================================
print("\n=== LOGISTICS ===")

# Create materials first
mat_ids = []
for name, unit in [('Tuberia 5"','unidad'),('Cemento Clase G','sacos'),('Arena Silica','kg'),
                    ('Grasa Industrial','galones'),('Diesel','litros'),('Aceite Hidraulico','litros')]:
    mid = uid()
    mat_ids.append(mid)
    cur.execute("INSERT INTO logistics_materials (id, name, unit, active, is_deleted, created_by, created_at, updated_at) VALUES (?,?,?,1,0,?,?,?)",
        (mid, name, unit, ADMIN, ts(now), ts(now)))
print(f"  6 materials created")

# Water bottles (6)
for wi in range(6):
    d = now - timedelta(days=5-wi)
    cur.execute("INSERT INTO logistics_water_bottles_movements (id, rig_id, movement_type, quantity, notes, created_by, created_at, updated_at, is_deleted) VALUES (?,?,?,?,?,?,?,?,0)",
        (uid(), RIG1, ['entry','exit'][wi%2], random.randint(5,30), f'Botellones dia {wi+1}', ADMIN, ts(d), ts(d)))
print(f"  6 water bottle movements")

# Fuel (4)
for fi in range(4):
    d = now - timedelta(days=3-fi)
    cur.execute("INSERT INTO logistics_fuel_movements (id, rig_id, movement_type, amount, notes, created_by, created_at, updated_at, is_deleted) VALUES (?,?,?,?,?,?,?,?,0)",
        (uid(), RIG1, ['entry','exit'][fi%2], random.randint(100,500),
         f'Combustible {["Generador 1","Generador 2","Bomba Principal","Malacate"][fi]}', ADMIN, ts(d), ts(d)))
print(f"  4 fuel movements")

# Vacuum (4)
for vi in range(4):
    d = now - timedelta(days=3-vi)
    cur.execute("INSERT INTO logistics_vacuum_actions (id, rig_id, action_name, notes, created_by, created_at, updated_at, is_deleted) VALUES (?,?,?,?,?,?,?,0)",
        (uid(), RIG1, ['Extraccion Fosa 1','Transporte a disposicion','Limpieza tanque','Extraccion Fosa 2'][vi],
         f'Accion vacuum dia {vi+1}', ADMIN, ts(d), ts(d)))
print(f"  4 vacuum actions")

# Material movements (4)
for mi in range(4):
    d = now - timedelta(days=3-mi)
    cur.execute("INSERT INTO logistics_materials_movements (id, material_id, rig_id, movement_type, quantity, notes, created_by, created_at, updated_at, is_deleted) VALUES (?,?,?,?,?,?,?,?,?,0)",
        (uid(), mat_ids[mi%len(mat_ids)], RIG1, ['entry','exit'][mi%2], random.randint(10,100),
         f'Material dia {mi+1}', ADMIN, ts(d), ts(d)))
print(f"  4 material movements")

# ============================================================================
# 4. INCIDENTS (10)
# ============================================================================
print("\n=== INCIDENTS ===")

incidents_data = [
    "Falla en bomba de lodo #2 - vibracion excesiva durante circulacion",
    "Derrame menor de aceite hidraulico en area del malacate - 5 galones",
    "Lesion menor - corte en mano durante manejo de tuberia",
    "Falla electrica en generador principal - se activo respaldo",
    "Amago de incendio en area de quimicos por cortocircuito",
    "Rotura parcial de cable de grua durante izaje",
    "Presion anormal en anular durante perforacion",
    "Caida de herramienta desde planchada - sin lesionados",
    "Falla en sistema de alarma contra incendio - sensor defectuoso",
    "Lectura de H2S por encima de limite en flowline",
]

for ii in range(10):
    iid = uid()
    d = now - timedelta(days=random.randint(0,14))
    inc_type = INC_TYPES[ii % len(INC_TYPES)]
    rig = RIGS[ii % len(RIGS)]

    cur.execute("""INSERT INTO incidents (id, rig_id, incident_type, description, created_by, created_at, updated_at, is_deleted)
        VALUES (?,?,?,?,?,?,?,0)""", (iid, rig[0], inc_type[1], incidents_data[ii], ADMIN, ts(d), ts(d)))

    # Personnel (1-2 per incident)
    personnel = [p for p in RIG_PERSONNEL if p[1] == rig[0]]
    for pi in range(min(random.randint(1,2), max(len(personnel),1))):
        pid = personnel[pi][0] if pi < len(personnel) else uid()
        cur.execute("INSERT INTO incident_personnel (id, incident_id, personnel_id, created_at, updated_at) VALUES (?,?,?,?,?)",
            (uid(), iid, pid, ts(d), ts(d)))

    print(f"  {ii+1}. {incidents_data[ii][:55]}...")

# ============================================================================
conn.commit()
print("\n=== SUMMARY ===")
for table in ['reports','crew_shifts','crew_members','time_distribution','bit_records',
              'mud_records','mud_additives','drilling_parameters','deviation_history',
              'operations_log','drill_string_components',
              'fluid_reports','fluid_props','fluid_solids_control','fluid_activity',
              'fluid_inventory','fluid_services','fluid_tanks','fluid_vol_stats',
              'logistics_materials','logistics_water_bottles_movements','logistics_fuel_movements',
              'logistics_vacuum_actions','logistics_materials_movements',
              'incidents','incident_personnel']:
    cur.execute(f'SELECT COUNT(*) FROM {table}')
    c = cur.fetchone()[0]
    if c > 0: print(f"  {table}: {c}")
conn.close()
print("\nDone!")
