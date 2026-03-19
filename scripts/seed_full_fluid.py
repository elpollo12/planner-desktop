import sqlite3, uuid, random

conn = sqlite3.connect(r'C:\Users\plxus\AppData\Roaming\d-planner-temp\planner.db')
cur = conn.cursor()
now = '2026-03-19T10:00:00+00:00'

cur.execute('SELECT id, name FROM rigs WHERE active = 1 LIMIT 1')
rig = cur.fetchone()
cur.execute('SELECT id FROM users WHERE (is_deleted IS NULL OR is_deleted = 0) LIMIT 1')
usr = cur.fetchone()
cur.execute('SELECT COALESCE(MAX(report_number), 0) + 1 FROM fluid_reports')
next_num = cur.fetchone()[0]

rid = str(uuid.uuid4())
cur.execute('''INSERT INTO fluid_reports (
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
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,0)''',
(rid, rig[0], next_num, '2026-03-19', 'POZ-COMPLETO-001', rig[1],
 'CONT-2026-045', 'Halliburton', 'PDVSA Exploracion', 'Distrito Anaco', 'Ing. Jose Martinez',
 'WBM - Disperso', '12 1/4"', 'Ing. Roberto Gonzalez', 'Tec. Maria Lopez', 'Tec. Andres Perez', 'Br. Carlos Ruiz', 'Sup. Fernando Diaz',
 45, 1350, 55, 1650, 100, 3000, 120, 3600,
 850, 15, 25, 80, 0, 40, 5, 925,
 9.8, 10.2, 0.65, 0.48, 120, 85,
 'Fluido estable durante la operacion. Se mantuvo densidad en rango 9.2-9.5 lpg.',
 'Se consumieron 30 sacos de Bentonita y 50 sacos de Barita. Inventario de CaCO3 bajo.',
 'Volumen total del sistema estable. Perdidas por filtracion dentro de parametros normales.',
 usr[0], usr[0], now, now))
print(f'Created report #{next_num}')

# Props: 3 shifts ALL fields
shifts = [
    ('06:00','Linea de Flujo',125,8500,8200,9.2,42,28,18,14,10,4,3,10,8,4,8,12,7.5,1.5,0.5,8,2,90,9.5,0.8,0.4,3.2,280,45000,22.5,18,0.28),
    ('14:00','Linea de Flujo',128,8520,8215,9.3,44,30,19,15,11,5,3,11,8,5,9,13,7.0,1.5,0.4,7,2,91,9.6,0.7,0.3,3.0,260,44000,21.0,17,0.27),
    ('22:00','Embudo',130,8550,8230,9.4,46,32,20,16,12,5,4,12,8,5,10,14,6.8,1.8,0.5,7,3,90,9.4,0.9,0.5,3.4,300,46000,23.0,19,0.29),
]
for h,src,temp,md,tvd,dens,marsh,r600,r300,r200,r100,r6,r3,pv,yp,g10s,g10m,g30m,filt,cake,sand,sol,oil,water,ph,pm,pf,mf,ca,cl,mbt,brook,lub in shifts:
    cur.execute('''INSERT INTO fluid_props (
        id,fluid_report_id,sample_hour,sample_source,temperature_f,depth_md,depth_tvd,
        density,marsh_viscosity,rpm_600,rpm_300,rpm_200,rpm_100,rpm_6,rpm_3,
        pv,yp,gel_10s,gel_10m,gel_30m,api_filtrate,filter_cake,sand_content,
        solids_retort,oil_retort,water_retort,ph,alkalinity_pm,alkalinity_pf,alkalinity_mf,
        calcium_ppm,chlorides_ppm,mbt,brookfield_visc,lubricity_coef,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
    (str(uuid.uuid4()),rid,h,src,temp,md,tvd,dens,marsh,r600,r300,r200,r100,r6,r3,
     pv,yp,g10s,g10m,g30m,filt,cake,sand,sol,oil,water,ph,pm,pf,mf,ca,cl,mbt,brook,lub,now,now))
print('3 props rows')

# Solids: 7
for eq,mesh,ht,ha in [('Shaker 1','140/120',24,360),('Shaker 2','140/120',24,340),('Shaker 3','200/170',24,280),
    ('Shaker 4','200/170',20,200),('3 en 1','API 200',18,150),('Desa./Desi.','N/A',12,100),('Centrifuga','N/A',16,120)]:
    cur.execute('INSERT INTO fluid_solids_control (id,fluid_report_id,equipment,design_mesh,hours_today,hours_accumulated,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
        (str(uuid.uuid4()),rid,eq,mesh,ht,ha,now,now))
print('7 solids')

# Activity
cur.execute('''INSERT INTO fluid_activity (id,fluid_report_id,hours_moving,hours_circulating,hours_drilling,hours_tripping,
    hours_cleaning,hours_backreaming,hours_cementing,hours_running_csg,hours_other,hours_total,created_at,updated_at)
    VALUES (?,?,1.5,5.0,8.5,3.0,1.0,2.0,0.5,1.0,1.5,24.0,?,?)''',
    (str(uuid.uuid4()),rid,now,now))
print('Activity')

# Inventory: all products
cur.execute('SELECT id, code FROM fluid_product_catalog WHERE active = 1')
products = cur.fetchall()
for pid,code in products:
    ini=random.randint(20,200); rec=random.randint(0,80); tr=random.randint(0,20); cons=random.randint(5,50)
    fin=max(ini+rec-tr-cons,0); rt=rec+random.randint(100,500); tt=tr+random.randint(0,50)
    ct=cons+random.randint(50,300); cost=round(random.uniform(50,2000),2)
    cur.execute('''INSERT INTO fluid_inventory (id,fluid_report_id,product_id,inv_inicial,received_today,transferred_today,
        consumed_today,inv_final,received_total,transferred_total,consumed_total,daily_cost,notes,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
        (str(uuid.uuid4()),rid,pid,ini,rec,tr,cons,fin,rt,tt,ct,cost,f'Nota {code}',now,now))
print(f'{len(products)} inventory rows')

# Services: 4
for sn,hrs,qty,dt,dtot,bsf,usd,daily,accum in [
    ('Servicio Tecnico de Fluidos',24,2,1,19,18500,620,620,11780),
    ('Ingenieria de Fluidos',12,1,1,19,9800,330,330,6270),
    ('Pruebas de Laboratorio',8,3,1,7,5400,180,540,3780),
    ('Supervision de Campo',24,1,1,19,7200,240,240,4560)]:
    cur.execute('''INSERT INTO fluid_services (id,fluid_report_id,service_name,hours_per_day,quantity,days_today,days_total,
        cost_bsf,cost_usd,daily_cost,accumulated_cost,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)''',
        (str(uuid.uuid4()),rid,sn,hrs,qty,dt,dtot,bsf,usd,daily,accum,now,now))
print('4 services')

# Tanks: 10
for i,(tn,ts,tv,tl,tf) in enumerate([
    ('TK-VIAJE','active',120,9.2,'WBM'),('TK-TRAMPA','active',85,9.3,'WBM'),
    ('TK-ASENTAMIENTO','active',150,9.2,'WBM'),('TK-SUCCION 1','active',200,9.2,'WBM'),
    ('TK-SUCCION 2','active',180,9.1,'WBM'),('TK-MEZCLA','active',95,9.0,'WBM'),
    ('TK-RESERVA 1','reserve',300,9.0,'WBM'),('TK-RESERVA 2','reserve',250,8.8,'WBM'),
    ('TK-CONTINGENCIA 1','contingency',150,8.8,'WBM'),('TK-CONTINGENCIA 2','contingency',120,8.5,'Agua')]):
    cur.execute('INSERT INTO fluid_tanks (id,fluid_report_id,name,system_status,volume_bls,lpg,fluid_type,sort_order,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
        (str(uuid.uuid4()),rid,tn,ts,tv,tl,tf,i,now,now))
print('10 tanks')

# Vol stats: ALL fields
cur.execute('PRAGMA table_info(fluid_vol_stats)')
cols = [r[1] for r in cur.fetchall()]
vals = {
    'id': str(uuid.uuid4()), 'fluid_report_id': rid,
    'vol_cap_sarta':85,'vol_desp_sarta':120,'vol_revestidor':45,'vol_hoyo_desnudo':180,
    'vol_pozo_sin_tuberia':305,'vol_pozo_con_tuberia':225,
    'vol_sistema_activo':830,'vol_sistema_reserva':550,'vol_sistema_contingencia':270,'vol_hoyo_abandonado':0,
    'vol_agua_agregado_hoy':18,'vol_agua_agregado_acum':145,
    'vol_productos_hoy':12.5,'vol_productos_acum':88,'vol_aceite_acum':0,
    'vol_recibido_hoy':40,'vol_recibido_acum':380,
    'vol_procesado_hoy':55,'vol_procesado_acum':320,'vol_manejado_hoy':35,
    'vol_total_agregado_hoy':70.5,'vol_total_agregado_acum':613,'vol_transferido_fuera':0,
    'vol_perdido_ecs':8,'vol_perdido_ecs_acum':65,
    'vol_perdido_humectacion':3,'vol_perdido_humectacion_acum':22,
    'vol_perdido_formacion_hoy':5,'vol_perdido_formacion_acum':42,
    'vol_perdido_permeabilidad':2,'vol_perdido_permeabilidad_acum':15,
    'vol_descartado':25,'vol_entrampado':0,
    'vol_perdido_superficie':5,'vol_perdido_superficie_acum':38,
    'vol_otras_perdidas':1.5,
    'vol_total_perdido_hoy':49.5,'vol_total_perdido_acum':222,
    'vol_inicial_diario':850,'vol_final_diario':925,
    'created_at':now,'updated_at':now,
}
ic = [c for c in cols if c in vals]
cur.execute(f'INSERT INTO fluid_vol_stats ({",".join(ic)}) VALUES ({",".join(["?"]*len(ic))})', [vals[c] for c in ic])
print(f'Vol stats ({len(ic)} fields)')

conn.commit()
print(f'\nReport #{next_num} POZ-COMPLETO-001 ready with ALL data')
conn.close()
