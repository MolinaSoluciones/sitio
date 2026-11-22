"""Plantillas de cierre de caja, arqueo, ventas al crédito, precio de venta, gastos y pedidos.
Mismas reglas que la de inventario: amarillo claro = se escribe (celda abierta); rosado = se calcula (bloqueado).
Se ejecutan desde plantillas.py."""
from datetime import date, time
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side
from openpyxl.formatting.rule import FormulaRule
from openpyxl.worksheet.datavalidation import DataValidation
from plantillas import (SALIDA, VINO, MAGENTA, ORO, ROSA, TINTA, GRIS, AMARILLO, ABIERTA, F, relleno, borde,
                        encabezado, hoja_ayuda, proteger)

d = lambda dd, mm=11: date(2026, mm, dd)
LPS = '#,##0.00'
DIF = '+#,##0.00;-#,##0.00;0.00'
ROJO, AMBAR, VERDE = Font(name=F, bold=True, color='B00020'), Font(name=F, bold=True, color='9A6700'), Font(name=F, bold=True, color='1E6B3A')


def validacion(ws, tipo):
    """tipo: 'num', 'fecha', 'pct', ('lista', fórmula o "A,B,C")."""
    # showErrorMessage=True: sin esto Excel acepta cualquier cosa. Las listas quedan abiertas para escribir un nombre nuevo.
    if tipo == 'num':
        dv = DataValidation(type='decimal', operator='greaterThanOrEqual', formula1='0', allow_blank=True, showErrorMessage=True, errorTitle='Solo números', error='Escribe un número de 0 en adelante.')
    elif tipo == 'fecha':
        dv = DataValidation(type='date', operator='greaterThan', formula1='36526', allow_blank=True, showErrorMessage=True, errorTitle='Fecha', error='Escribe una fecha, por ejemplo 22/11/2026.')
    elif tipo == 'pct':
        dv = DataValidation(type='decimal', operator='between', formula1='0', formula2='0.95', allow_blank=True, showErrorMessage=True, errorTitle='Porcentaje', error='Escribe un porcentaje entre 0 % y 95 %, por ejemplo 40 %.')
    else:  # en el archivo la referencia va sin «=» (con «=» Excel puede pedir reparar el archivo)
        dv = DataValidation(type='list', formula1=tipo[1].lstrip('='), allow_blank=True, showErrorMessage=tipo[2] if len(tipo) > 2 else False,
                            errorTitle='Elige de la lista', error='Elige una opción de la lista.')
    ws.add_data_validation(dv)
    return dv


def celda(c, valor=None, entrada=False, nf=None, negrita=False, centro=True, tam=10):
    if valor is not None: c.value = valor
    c.font = Font(name=F, size=tam, color=TINTA, bold=negrita); c.border = borde
    c.fill = relleno(AMARILLO if entrada else ROSA)
    if entrada: c.protection = ABIERTA
    if nf: c.number_format = nf
    c.alignment = Alignment(horizontal='center' if centro else 'left', vertical='center')


def cifras(ws, items, fila=5):
    """Cifras grandes arriba: [(columna, título, fórmula o valor, formato, ¿se escribe?)]."""
    for col, t, v, nf, ent in items:
        ws[f'{col}{fila}'] = t; ws[f'{col}{fila}'].font = Font(name=F, size=9, color=VINO if ent else GRIS, bold=ent)
        c = ws[f'{col}{fila + 1}']; c.value = v; c.number_format = nf
        if nf == LPS and (ws.column_dimensions[col].width or 0) < 15: ws.column_dimensions[col].width = 15  # que la cifra grande quepa (si no, sale ###)
        c.font = Font(name=F, size=14, bold=True, color=TINTA if ent else VINO)
        c.alignment = Alignment(horizontal='center' if ent else 'left')
        if ent:
            c.fill = relleno(AMARILLO); c.protection = ABIERTA; c.border = Border(*(Side(style='medium', color=ORO),) * 4)


def tabla(ws, cols, N, ejemplos, fila=8, color=MAGENTA, c0=1, congelar=True):
    """cols: [(título, ancho, formato, tipo)] con tipo 'in' | 'num' | 'fecha' | 'pct' | ('lista', …) | ('calc', 'fórmula con {f} y {X} = letra de la columna X relativa')."""
    from openpyxl.utils import get_column_letter as L
    PRI, ULT = fila + 1, fila + N
    letras = [L(c0 + k) for k in range(len(cols))]
    for k, (t, w, nf, tipo) in enumerate(cols):
        c = ws.cell(fila, c0 + k, t); c.font = Font(name=F, bold=True, color='FFFFFF', size=10); c.fill = relleno(color); c.border = borde
        c.alignment = Alignment(wrap_text=True, vertical='center', horizontal='center')
        ws.column_dimensions[letras[k]].width = w
        rango = f'{letras[k]}{PRI}:{letras[k]}{ULT}'
        if tipo in ('num', 'fecha', 'pct') or isinstance(tipo, tuple) and tipo[0] == 'lista':
            validacion(ws, tipo).add(rango)
    ws.row_dimensions[fila].height = 46
    for r, ej in enumerate(ejemplos):
        for k, v in enumerate(ej):
            if v is not None: ws.cell(PRI + r, c0 + k, v)
    for f in range(PRI, ULT + 1):
        for k, (t, w, nf, tipo) in enumerate(cols):
            c = ws.cell(f, c0 + k)
            calc = isinstance(tipo, tuple) and tipo[0] == 'calc'
            if calc: c.value = tipo[1].format(f=f, **{chr(65 + i): letras[i] for i in range(len(cols))})
            celda(c, entrada=not calc, nf=nf, centro=not (tipo == 'in' and w >= 18))
    if congelar: ws.freeze_panes = ws.cell(PRI, 1).coordinate
    return PRI, ULT, letras


def colorear(ws, rango, primera, reglas):
    """reglas: [(texto, fuente)] para la columna de estado."""
    for txt, fuente in reglas:
        ws.conditional_formatting.add(rango, FormulaRule(formula=[f'{primera}="{txt}"'], font=fuente))


def terminar(wb, nombre, titulo, pasos, guia, pitch, apaisada=True, una_pagina=False):
    hoja_ayuda(wb, titulo, pasos, guia, 'plantilla', pitch)
    wb.move_sheet('Cómo usarla', offset=-(len(wb.sheetnames) - 1))
    for h in wb.worksheets:
        h.sheet_view.showGridLines = False
        h.page_setup.fitToWidth = 1; h.page_setup.fitToHeight = 1 if una_pagina else 0; h.sheet_properties.pageSetUpPr.fitToPage = True
        if h.title != 'Cómo usarla' and apaisada: h.page_setup.orientation = 'landscape'
        proteger(h)
    wb.active = 1
    wb.properties.creator = 'Molina Soluciones Digitales'; wb.properties.title = titulo
    wb.save(SALIDA / nombre)


# ---------------------------------------------------------------- Cierre de caja diario
def cierre():
    wb = Workbook(); ws = wb.active; ws.title = 'Cierre de caja'
    cols = [('Fecha', 12, 'dd/mm/yyyy', 'fecha'), ('Apertura (L)', 11, LPS, 'num'), ('Ventas en efectivo (L)', 12, LPS, 'num'), ('Abonos de clientes (L)', 12, LPS, 'num'),
            ('Gastos pagados (L)', 11, LPS, 'num'), ('Retiros y pagos a proveedores (L)', 16, LPS, 'num'),
            ('Debería haber (L)', 12, LPS, ('calc', '=IF(COUNT({B}{f}:{F}{f})=0,"",N({B}{f})+N({C}{f})+N({D}{f})-N({E}{f})-N({F}{f}))')),
            ('Se contó (L)', 11, LPS, 'num'),
            ('Diferencia (L)', 11, DIF, ('calc', '=IF(OR({G}{f}="",{H}{f}=""),"",ROUND({H}{f}-{G}{f},2))')),
            ('Resultado', 11, None, ('calc', '=IF({I}{f}="","",IF({I}{f}=0,"Cuadra",IF({I}{f}>0,"Sobrante","Faltante")))')),
            ('Ventas por transferencia o tarjeta (L)', 14, LPS, 'num'),
            ('Total vendido (L)', 12, LPS, ('calc', '=IF(COUNT({C}{f},{K}{f})=0,"",N({C}{f})+N({K}{f}))')),
            ('Nota', 30, None, 'in')]
    encabezado(ws, 'Cierre de caja diario', 'Una fila por día. Escribe en las celdas amarillas; lo rosado se calcula solo.', len(cols))
    ej = [(d(17), 300, 2450, 200, 180, 500, None, 2290, None, None, 850, None, None),
          (d(18), 300, 1980, 0, 120, 0, None, 2160, None, None, 600, None, None),
          (d(19), 300, 2600, 350, 200, 1000, None, 2000, None, None, 1200, None, 'Faltó anotar un gasto de L 50')]
    PRI, ULT, _ = tabla(ws, cols, 366, ej)
    cifras(ws, [('A', 'Días anotados', f'=COUNT(A{PRI}:A{ULT})', '0', False), ('C', 'Total vendido (L)', f'=SUM(L{PRI}:L{ULT})', LPS, False),
                ('F', 'Faltantes (L)', f'=-SUMIF(I{PRI}:I{ULT},"<0")', LPS, False), ('H', 'Sobrantes (L)', f'=SUMIF(I{PRI}:I{ULT},">0")', LPS, False),
                ('J', 'Días con faltante', f'=COUNTIF(J{PRI}:J{ULT},"Faltante")', '0', False)])
    colorear(ws, f'J{PRI}:J{ULT}', f'$J{PRI}', [('Faltante', ROJO), ('Sobrante', AMBAR), ('Cuadra', VERDE)])
    ws.print_title_rows = '8:8'
    terminar(wb, 'plantilla-cierre-de-caja.xlsx', 'Plantilla de cierre de caja', [
        ('Una fila por cada día', 'Escribe la fecha y con cuánto efectivo abriste la caja.'),
        ('Anota lo que entró en efectivo', 'Ventas en efectivo y abonos de clientes. Las ventas por transferencia o tarjeta van en su propia columna: ese dinero no está en la gaveta.'),
        ('Anota lo que salió', 'Gastos pagados con dinero de la caja, pagos a proveedores y retiros del dueño.'),
        ('Cuenta el efectivo y escríbelo en «Se contó»', 'La hoja te dice cuánto debería haber, la diferencia y si la caja cuadra, sobra o falta.'),
        ('Anota el motivo de la diferencia', 'En «Nota». Arriba ves cuánto ha faltado y sobrado en total y cuántos días hubo faltante.'),
        ('Borra los ejemplos', 'Los tres primeros días son de ejemplo. Borra lo escrito en las celdas amarillas antes de empezar.'),
    ], ('Cómo hacer el cierre de caja de tu negocio', '/guias/como-hacer-el-cierre-de-caja/'),
        'Con Gestión de Negocio VM abres la caja, vendes y registras gastos durante el día, y al cerrar el programa te dice cuánto debería haber.')


# ---------------------------------------------------------------- Arqueo de caja
def arqueo():
    wb = Workbook(); ws = wb.active; ws.title = 'Arqueo'
    for col, w in zip('ABCDE', (44, 16, 16, 4, 30)): ws.column_dimensions[col].width = w
    encabezado(ws, 'Arqueo de caja', 'Escribe en las celdas amarillas.', 3)
    fecha = validacion(ws, 'fecha'); num = validacion(ws, 'num'); forma = validacion(ws, ('lista', '"Efectivo,Tarjeta,Transferencia"', True))
    def etiqueta(f, txt, col='A', bold=False, color=TINTA):
        c = ws[f'{col}{f}']; c.value = txt; c.font = Font(name=F, size=10, bold=bold, color=color); c.border = borde
    def titulo(f, txt, nota=None):
        for k in range(3): ws.cell(f, 1 + k).fill = relleno(MAGENTA)
        c = ws[f'A{f}']; c.value = txt; c.font = Font(name=F, size=11, bold=True, color='FFFFFF')
        if nota: ws[f'B{f}'] = nota; ws[f'B{f}'].font = Font(name=F, size=8, color='F6E3EA')
    def subtitulos(f, textos):
        for col, t in zip('ABC', textos):
            c = ws[f'{col}{f}']; c.value = t; c.font = Font(name=F, size=10, bold=True, color=VINO); c.border = borde
            c.alignment = Alignment(horizontal='left' if col == 'A' else 'center')
    f = 5
    for t, v, nf in [('Fecha', d(19), 'dd/mm/yyyy'), ('Hora', time(18, 0), 'h:mm AM/PM'), ('Quién estaba en caja', 'Karla', None), ('Quién hizo el arqueo', 'Dueño', None)]:
        etiqueta(f, t, bold=True); celda(ws[f'B{f}'], v, entrada=True, nf=nf); ws.merge_cells(f'B{f}:C{f}'); f += 1
    fecha.add('B5')
    # 2. Abonos de clientes (detalle): se escribe antes porque «Lo que debería haber» toma de aquí el abono en efectivo
    AB0 = 21; NAB = 8; AB1 = AB0 + NAB - 1
    # 1. Lo que debería haber
    f = 10; titulo(f, '1. Lo que debería haber (efectivo en la gaveta)'); f += 1
    filas = [('+ Apertura de caja', 500), ('+ Ventas en efectivo', 3200), ('+ Abonos de clientes en efectivo (del detalle)', None), ('− Gastos pagados', 350), ('− Pagos a proveedores', 1000), ('− Retiros del dueño', 0)]
    D1 = f
    for t, v in filas:
        etiqueta(f, t)
        if v is None: celda(ws[f'B{f}'], f'=SUMIF(C{AB0}:C{AB1},"Efectivo",B{AB0}:B{AB1})', nf=LPS)
        else: celda(ws[f'B{f}'], v, entrada=True, nf=LPS); num.add(f'B{f}')
        f += 1
    etiqueta(f, 'Debería haber', bold=True, color=VINO)
    celda(ws[f'B{f}'], f'=N(B{D1})+N(B{D1 + 1})+N(B{D1 + 2})-N(B{D1 + 3})-N(B{D1 + 4})-N(B{D1 + 5})', nf=LPS, negrita=True); DEB = f
    # 2. Detalle de abonos
    f = AB0 - 2; titulo(f, '2. Abonos de clientes'); subtitulos(f + 1, ('Cliente', 'Monto (L)', 'Cómo pagó'))
    abonos = [('María López', 250, 'Efectivo'), ('Carlos Mejía', 150, 'Efectivo'), ('Ana Reyes', 300, 'Transferencia')]
    for k in range(NAB):
        r = AB0 + k; e = abonos[k] if k < len(abonos) else (None, None, None)
        celda(ws[f'A{r}'], e[0], entrada=True, centro=False); celda(ws[f'B{r}'], e[1], entrada=True, nf=LPS); celda(ws[f'C{r}'], e[2], entrada=True)
    num.add(f'B{AB0}:B{AB1}'); forma.add(f'C{AB0}:C{AB1}')
    f = AB1 + 1; etiqueta(f, 'Total abonado', bold=True, color=VINO); celda(ws[f'B{f}'], f'=SUM(B{AB0}:B{AB1})', nf=LPS, negrita=True)
    TAB = f
    # 3. Cobros que no están en la gaveta
    f += 2; titulo(f, '3. Cobros que no están en la gaveta'); f += 1
    NG0 = f
    for t, v in (('Ventas con tarjeta', 1250), ('Ventas por transferencia', 800), ('Otros (descríbelos en la nota)', 0)):
        etiqueta(f, t); celda(ws[f'B{f}'], v, entrada=True, nf=LPS); num.add(f'B{f}'); f += 1
    etiqueta(f, 'Abonos con tarjeta o transferencia (del detalle)'); celda(ws[f'B{f}'], f'=SUMIF(C{AB0}:C{AB1},"Tarjeta",B{AB0}:B{AB1})+SUMIF(C{AB0}:C{AB1},"Transferencia",B{AB0}:B{AB1})', nf=LPS); f += 1
    etiqueta(f, 'Total fuera de la gaveta', bold=True, color=VINO); celda(ws[f'B{f}'], f'=SUM(B{NG0}:B{f - 1})', nf=LPS, negrita=True); NGT = f
    f += 1; etiqueta(f, 'Todo lo cobrado (gaveta y fuera de ella)', bold=True, color=VINO)
    celda(ws[f'B{f}'], f'=N(B{D1 + 1})+N(B{D1 + 2})+B{NGT}', nf=LPS, negrita=True)
    # 4. Conteo del efectivo
    f += 2; titulo(f, '4. Conteo del efectivo'); subtitulos(f + 1, ('Billete o moneda', 'Cantidad', 'Total (L)')); f += 2
    denom = [(500, 3), (200, 3), (100, 4), (50, 2), (20, 4), (10, 1), (5, 1), (2, 0), (1, 4), (0.50, 2), (0.20, 0), (0.10, 0), (0.05, 0)]
    C0 = f
    for v, n in denom:
        etiqueta(f, f'Billete de L {v:g}' if v >= 1 else f'Moneda de {int(round(v * 100))} centavos')
        ws[f'D{f}'] = v
        celda(ws[f'B{f}'], n or None, entrada=True, nf='0'); celda(ws[f'C{f}'], f'=IF(B{f}="","",B{f}*D{f})', nf=LPS); f += 1
    num.add(f'B{C0}:B{f - 1}')
    etiqueta(f, 'Total contado', bold=True, color=VINO); celda(ws[f'B{f}'], f'=SUM(B{C0}:B{f - 1})', nf='0'); celda(ws[f'C{f}'], f'=SUM(C{C0}:C{f - 1})', nf=LPS, negrita=True); CON = f
    # 5. Resultado
    f += 2; titulo(f, '5. Resultado'); f += 1
    etiqueta(f, 'Diferencia (contado − debería haber)', bold=True); celda(ws[f'B{f}'], f'=ROUND(C{CON}-B{DEB},2)', nf=DIF, negrita=True); f += 1
    etiqueta(f, 'Resultado', bold=True); celda(ws[f'B{f}'], f'=IF(B{f - 1}=0,"La caja cuadra",IF(B{f - 1}>0,"Sobrante","Faltante"))', negrita=True)
    colorear(ws, f'B{f}', f'$B{f}', [('Faltante', ROJO), ('Sobrante', AMBAR), ('La caja cuadra', VERDE)]); f += 1
    etiqueta(f, 'Motivo o nota', bold=True); celda(ws[f'B{f}'], 'Falta un recibo de gasto', entrada=True, centro=False); ws.merge_cells(f'B{f}:C{f}')
    ws.column_dimensions['D'].hidden = True
    f += 3
    for t in ('Firma de quien estaba en caja', 'Firma de quien hizo el arqueo'):
        ws[f'A{f}'] = '______________________________'; ws[f'A{f + 1}'] = t; ws[f'A{f + 1}'].font = Font(name=F, size=9, color=GRIS); f += 3
    ws.print_area = f'A1:C{f}'
    ws.page_setup.fitToHeight = 1
    terminar(wb, 'plantilla-arqueo-de-caja.xlsx', 'Plantilla de arqueo de caja', [
        ('Llena los datos del arqueo', 'Fecha, hora, quién estaba en caja y quién hace el arqueo.'),
        ('Escribe lo que debería haber en la gaveta', 'Con cuánto se abrió y las ventas en efectivo; y lo que salió: gastos, pagos a proveedores y retiros.'),
        ('Anota los abonos de clientes', 'Cada cliente que abonó, cuánto y cómo pagó. Los abonos en efectivo pasan solos a «Lo que debería haber»; los de tarjeta o transferencia van a los cobros fuera de la gaveta.'),
        ('Anota los cobros que no están en la gaveta', 'Ventas con tarjeta, transferencias y otros. No se cuentan en la caja, pero quedan escritos y ves todo lo cobrado.'),
        ('Cuenta billetes y monedas', 'Escribe cuántos hay de cada uno. La hoja suma el total y te dice si la caja cuadra, sobra o falta.'),
        ('Imprime y firma; para el siguiente, copia la hoja', 'Cabe en una página. Para guardar cada arqueo: clic derecho en la pestaña › Mover o copiar › Crear una copia.'),
    ], ('Cómo hacer un arqueo de caja', '/guias/como-hacer-un-arqueo-de-caja/'),
        'Con Gestión de Negocio VM el programa lleva la cuenta de apertura, ventas en efectivo, abonos, gastos y pagos del día, y al cerrar te muestra cuánto debería haber.', apaisada=False, una_pagina=True)


# ---------------------------------------------------------------- Ventas al crédito
def credito():
    from openpyxl.utils import get_column_letter as L
    wb = Workbook(); cl = wb.active; cl.title = 'Clientes'
    mv = wb.create_sheet('Créditos y abonos'); R = "'Créditos y abonos'"
    ec = wb.create_sheet('Estado de cuenta'); E = "'Estado de cuenta'"
    encabezado(mv, 'Créditos y abonos', 'Escribe solo en las celdas amarillas. Las hojas «Clientes» y «Estado de cuenta» se llenan solas.', 9)
    N = 1000; PRI, ULT = 9, 9 + N - 1
    lista = ('lista', 'Clientes!$A$9:$A$308')
    cred = [(d(1), 'María López', 'Ropa y zapatos', 1200), (d(20, 10), 'Ana Reyes', 'Juego de sábanas y cortinas', 1800), (d(5), 'José Martínez', 'Mercadería', 650),
            (d(10), 'Carlos Mejía', 'Herramientas', 450), (d(12), 'María López', 'Blusa y cartera', 600)]
    abon = [(d(5), 'José Martínez', 650, 'Efectivo'), (d(8), 'María López', 400, 'Efectivo'), (d(15), 'María López', 300, 'Transferencia')]
    for c0, titulo, color, cols, ej in ((1, 'VENTAS AL CRÉDITO', ORO, [('Fecha', 12, 'dd/mm/yyyy', 'fecha'), ('Cliente', 24, None, lista), ('Qué llevó', 26, None, 'in'), ('Monto (L)', 12, LPS, 'num')], cred),
                                        (6, 'ABONOS', MAGENTA, [('Fecha', 12, 'dd/mm/yyyy', 'fecha'), ('Cliente', 24, None, lista), ('Monto (L)', 12, LPS, 'num'), ('Forma de pago', 14, None, ('lista', '"Efectivo,Transferencia,Tarjeta"', True))], abon)):
        for k in range(4): mv.cell(5, c0 + k).fill = relleno(color)
        t = mv.cell(5, c0, titulo); t.font = Font(name=F, size=12, bold=True, color='FFFFFF')
        tabla(mv, cols, N, ej, color=VINO if c0 == 1 else MAGENTA, c0=c0)
        mcol = L(c0 + 3) if c0 == 1 else L(c0 + 2)
        mv.cell(6, c0, 'Total (L)').font = Font(name=F, size=9, color=GRIS)
        c = mv.cell(6, c0 + 1, f'=SUM({mcol}{PRI}:{mcol}{ULT})'); c.font = Font(name=F, size=14, bold=True, color=VINO); c.number_format = LPS
    mv.column_dimensions['E'].width = 3
    # Columnas ocultas. K, L: numeran cada cliente la primera vez (créditos 1…, solo abonos 10001…) para armar «Clientes».
    # M, N: numeran los movimientos del cliente elegido en «Estado de cuenta».
    for f in range(PRI, ULT + 1):
        mv.cell(f, 11, f'=IF(TRIM(B{f})="","",IF(COUNTIF($B${PRI}:B{f},B{f})=1,MAX($K$8:K{f - 1})+1,""))')
        mv.cell(f, 12, f'=IF(TRIM(G{f})="","",IF(AND(COUNTIF($G${PRI}:G{f},G{f})=1,COUNTIF($B${PRI}:$B${ULT},G{f})=0),MAX(10000,$L$8:L{f - 1})+1,""))')
        mv.cell(f, 13, f'=IF(OR(TRIM(B{f})="",B{f}<>{E}!$B$5),"",COUNTIF($B${PRI}:B{f},{E}!$B$5))')
        mv.cell(f, 14, f'=IF(OR(TRIM(G{f})="",G{f}<>{E}!$B$5),"",COUNTIF($G${PRI}:G{f},{E}!$B$5))')
    mv['K7'] = f'=MAX(K{PRI}:K{ULT})'
    for c in 'KLMN': mv.column_dimensions[c].hidden = True; mv[f'{c}8'] = 'n'
    mv.freeze_panes = 'A9'; mv.print_area = 'A1:I1008'
    # ---- Clientes (se llena sola)
    cB, cD, cA = (f'{R}!${x}${PRI}:${x}${ULT}' for x in 'BDA')
    aG, aH, aF = (f'{R}!${x}${PRI}:${x}${ULT}' for x in 'GHF')
    encabezado(cl, 'Ventas al crédito por cliente', 'Se llena sola con lo que anotas en «Créditos y abonos». Solo lo amarillo se puede cambiar.', 12)
    LIM = '$L$9:$L$58'; LIMC = '$K$9:$K$58'
    cols = [('Cliente', 24, None, ('calc', '=IF({f}-8<=' + R + '!$K$7,IFERROR(INDEX(' + cB + ',MATCH({f}-8,' + R + f'!$K${PRI}:$K${ULT},0)),""),IFERROR(INDEX(' + aG + ',MATCH(10000+{f}-8-' + R + '!$K$7,' + R + f'!$L${PRI}:$L${ULT},0)),""))')),
            ('Vendido al crédito (L)', 13, LPS, ('calc', '=IF({A}{f}="","",SUMIF(' + cB + ',{A}{f},' + cD + '))')),
            ('Abonado (L)', 12, LPS, ('calc', '=IF({A}{f}="","",SUMIF(' + aG + ',{A}{f},' + aH + '))')),
            ('Saldo (L)', 12, LPS, ('calc', '=IF({A}{f}="","",{B}{f}-{C}{f})')),
            ('Límite (L)', 12, LPS, ('calc', '=IF({A}{f}="","",IFERROR(INDEX(' + LIM + ',MATCH({A}{f},' + LIMC + ',0)),$H$6))')),
            ('Disponible (L)', 12, LPS, ('calc', '=IF({A}{f}="","",MAX({E}{f}-{D}{f},0))')),
            ('Último abono', 12, 'dd/mm/yyyy', ('calc', '=IF({A}{f}="","",IF(SUMPRODUCT(MAX((' + aG + '={A}{f})*' + aF + '))=0,"",SUMPRODUCT(MAX((' + aG + '={A}{f})*' + aF + '))))')),
            ('Días sin abonar', 10, '0', ('calc', '=IF(OR({A}{f}="",{D}{f}<=0),"",TODAY()-MAX({G}{f},SUMPRODUCT(MAX((' + cB + '={A}{f})*' + cA + '))))')),
            ('Estado', 15, None, ('calc', '=IF({A}{f}="","",IF({D}{f}<=0,"Pagado",IF({D}{f}>{E}{f},"Pasó el límite",IF({H}{f}>$F$6,"Atrasado","Al día"))))'))]
    P1, P2, _ = tabla(cl, cols, 300, [])
    cifras(cl, [('A', 'Total por cobrar (L)', f'=SUMIF(D{P1}:D{P2},">0")', LPS, False), ('C', 'Clientes que deben', f'=COUNTIF(D{P1}:D{P2},">0")', '0', False),
                ('F', 'Atraso: días sin abonar', 30, '0', True), ('H', 'Límite general (L)', 1500, LPS, True)])
    for c in ('F6', 'H6'): validacion(cl, 'num').add(c)
    cl['H7'] = 'Para quien no tenga límite propio'; cl['H7'].font = Font(name=F, size=8, color=GRIS)
    colorear(cl, f'I{P1}:I{P2}', f'$I{P1}', [('Pasó el límite', ROJO), ('Atrasado', AMBAR), ('Pagado', VERDE)])
    for f in range(P1, P2 + 1):
        cl.cell(f, 1).font = Font(name=F, size=10, bold=True, color=TINTA); cl.cell(f, 1).alignment = Alignment(horizontal='left'); cl.cell(f, 4).font = Font(name=F, size=10, bold=True, color=TINTA)
    # Límite propio de cada cliente (tabla amarilla aparte)
    cl.column_dimensions['J'].width = 3
    for k in range(2): cl.cell(7, 11 + k).fill = relleno(ORO)
    cl['K7'] = 'LÍMITE PROPIO (opcional)'; cl['K7'].font = Font(name=F, size=10, bold=True, color='FFFFFF')
    tabla(cl, [('Cliente', 24, None, ('lista', '$A$9:$A$308')), ('Límite (L)', 12, LPS, 'num')], 50, [('María López', 2000)], c0=11, color=VINO, congelar=False)
    cl.freeze_panes = 'A9'
    # ---- Estado de cuenta de un cliente
    encabezado(ec, 'Estado de cuenta', 'Elige el cliente en la casilla amarilla. Imprímelo o guárdalo en PDF para mandárselo.', 7)
    ec['A5'] = 'Cliente'; ec['A5'].font = Font(name=F, size=9, bold=True, color=VINO)
    x = ec['B5']; x.value = 'María López'; x.font = Font(name=F, size=13, bold=True, color=TINTA); x.fill = relleno(AMARILLO); x.protection = ABIERTA
    x.border = Border(*(Side(style='medium', color=ORO),) * 4); ec.merge_cells('B5:C5')
    validacion(ec, ('lista', 'Clientes!$A$9:$A$308', True)).add('B5')
    ec['E5'] = 'Fecha'; ec['E5'].font = Font(name=F, size=9, color=GRIS); ec['F5'] = '=TODAY()'; ec['F5'].number_format = 'dd/mm/yyyy'; ec['F5'].font = Font(name=F, size=11, color=TINTA)
    busca = lambda col: f'=IFERROR(INDEX(Clientes!${col}$9:${col}$308,MATCH($B$5,Clientes!$A$9:$A$308,0)),0)'
    for k, (t, col) in enumerate((('Vendido', 'B'), ('Abonado', 'C'), ('Saldo', 'D'), ('Límite', 'E'), ('Disponible', 'F'))):
        c0 = 1 + k + (1 if k >= 3 else 0)
        h = ec.cell(7, c0, t); h.font = Font(name=F, size=9, color=GRIS)
        v = ec.cell(8, c0, busca(col)); v.number_format = LPS; v.font = Font(name=F, size=13, bold=True, color=VINO if col == 'D' else TINTA)
    def lista_mov(c0, titulo, color, cols, helper, src):
        for k in range(len(cols)): ec.cell(10, c0 + k).fill = relleno(color)
        t = ec.cell(10, c0, titulo); t.font = Font(name=F, size=11, bold=True, color='FFFFFF')
        for k, (n, w, nf, scol) in enumerate(cols):
            c = ec.cell(11, c0 + k, n); c.font = Font(name=F, bold=True, color='FFFFFF', size=10); c.fill = relleno(VINO); c.border = borde; c.alignment = Alignment(horizontal='center')
            ec.column_dimensions[L(c0 + k)].width = w
            for r in range(100):
                f = 12 + r
                celda(ec.cell(f, c0 + k), f'=IFERROR(INDEX({R}!${scol}${PRI}:${scol}${ULT},MATCH({r + 1},{R}!${helper}${PRI}:${helper}${ULT},0)),"")', nf=nf, centro=scol != 'C')
        f = 112; ec.cell(f, c0, 'Total').font = Font(name=F, size=10, bold=True, color=VINO)
        tc = ec.cell(f, c0 + [k for k, x in enumerate(cols) if x[0].startswith('Monto')][0], f'=SUM({L(c0 + [k for k, x in enumerate(cols) if x[0].startswith("Monto")][0])}12:{L(c0 + [k for k, x in enumerate(cols) if x[0].startswith("Monto")][0])}111)')
        tc.number_format = LPS; tc.font = Font(name=F, size=10, bold=True, color=VINO)
    lista_mov(1, 'Compras al crédito', ORO, [('Fecha', 12, 'dd/mm/yyyy', 'A'), ('Qué llevó', 28, None, 'C'), ('Monto (L)', 13, LPS, 'D')], 'M', 'c')
    ec.column_dimensions['D'].width = 3
    lista_mov(5, 'Abonos', MAGENTA, [('Fecha', 12, 'dd/mm/yyyy', 'F'), ('Monto (L)', 13, LPS, 'H'), ('Forma de pago', 14, None, 'I')], 'N', 'a')
    ec.print_area = 'A1:G112'; ec.freeze_panes = 'A12'
    wb.move_sheet('Créditos y abonos', offset=-1)
    terminar(wb, 'plantilla-ventas-al-credito.xlsx', 'Plantilla de ventas al crédito', [
        ('Todo se anota en «Créditos y abonos»', 'A la izquierda lo que vendes al crédito; a la derecha los abonos que te dan. Una fila por cada venta o abono.'),
        ('Escribe el nombre del cliente siempre igual', 'La primera vez lo escribes; después lo eliges de la lista. «María López» y «Maria Lopez» salen como dos clientes.'),
        ('Mira la hoja «Clientes»', 'Se llena sola: cada cliente una vez, con lo que le vendiste, lo que abonó, su saldo, su límite, lo que le queda disponible y los días que lleva sin abonar.'),
        ('Ponle a cada cliente su límite', 'Arriba de «Clientes» está el límite general. Si un cliente tiene otro, escríbelo en la tabla amarilla «Límite propio». También eliges cuántos días sin abonar son demasiados.'),
        ('Saca el estado de cuenta de un cliente', 'En la hoja «Estado de cuenta» eliges el cliente y salen todas sus compras al crédito y sus abonos, con su saldo. Imprímelo o guárdalo en PDF para mandárselo.'),
        ('Borra los ejemplos', 'Los clientes de ejemplo se borran desde «Créditos y abonos» y la tabla de límites: borra lo escrito en las celdas amarillas y lo demás se vacía solo.'),
    ], ('Cómo controlar las ventas al crédito', '/guias/como-controlar-las-ventas-al-credito/'),
        'Con Gestión de Negocio VM cada cliente tiene su cuenta con lo que debe, sus abonos y su límite, y le mandas un recordatorio por WhatsApp con su saldo.')


# ---------------------------------------------------------------- Calculadora de precio de venta
def precios():
    wb = Workbook(); ws = wb.active; ws.title = 'Precios'
    cols = [('Producto', 38, None, 'in'), ('Costo por unidad (L)', 13, LPS, 'num'), ('Flete, empaque y otros por unidad (L)', 15, LPS, 'num'),
            ('Costo total (L)', 12, LPS, ('calc', '=IF(COUNT({B}{f}:{C}{f})=0,"",N({B}{f})+N({C}{f}))')),
            ('Margen para este producto (opcional)', 14, '0%', 'pct'),
            ('Margen usado', 10, '0%', ('calc', '=IF({D}{f}="","",IF({E}{f}="",$A$6,{E}{f}))')),
            ('Precio sugerido (L)', 12, LPS, ('calc', '=IF(OR({D}{f}="",{F}{f}>=1),"",{D}{f}/(1-{F}{f}))')),
            ('Precio para cobrar (L)', 12, LPS, ('calc', '=IF({G}{f}="","",IF(N($E$6)>0,CEILING({G}{f},$E$6),ROUND({G}{f},2)))')),
            ('Ganancia por unidad (L)', 12, LPS, ('calc', '=IF({H}{f}="","",{H}{f}-{D}{f})'))]
    encabezado(ws, 'Calculadora de precio de venta', 'Precio = costo ÷ (1 − margen). Escribe en las celdas amarillas.', len(cols))
    ej = [('Blusa (docena a L 660 + L 60 de flete)', 55, 5), ('Pantalón de mezclilla', 250, 10), ('Arroz (libra)', 12, None, None, 0.20), ('Refresco 3 litros', 42, None, None, 0.15), ('Pastel mediano', 180, 20, None, 0.50)]
    PRI, ULT, _ = tabla(ws, cols, 200, ej)
    for c, t in (('A5', 'Margen que quieres ganar (para todos los productos)'), ('E5', 'Redondear hacia arriba a (L)')):
        ws[c] = t; ws[c].font = Font(name=F, size=9, bold=True, color=VINO)
    for c, v, nf in (('A6', 0.40, '0%'), ('E6', 5, '0.##')):
        x = ws[c]; x.value = v; x.number_format = nf; x.font = Font(name=F, size=14, bold=True, color=TINTA); x.alignment = Alignment(horizontal='center')
        x.fill = relleno(AMARILLO); x.protection = ABIERTA; x.border = Border(*(Side(style='medium', color=ORO),) * 4)
    validacion(ws, 'pct').add('A6'); validacion(ws, 'num').add('E6')
    ws['F6'] = 'Ej.: con 5, L 98.33 queda en L 100; con 0 no se redondea'; ws['F6'].font = Font(name=F, size=9, color=GRIS)
    for f in range(PRI, ULT + 1): ws.cell(f, 8).font = Font(name=F, size=10, bold=True, color=TINTA)
    ws.print_title_rows = '8:8'
    terminar(wb, 'calculadora-precio-de-venta.xlsx', 'Calculadora de precio de venta', [
        ('Escribe el costo completo', 'Lo que pagaste por cada unidad y, aparte, el flete, el empaque o la bolsa que le toca a cada una.'),
        ('Elige tu margen', 'Arriba, en «Margen que quieres ganar», escribe el porcentaje para todos los productos. Si uno necesita otro margen, escríbelo en su fila.'),
        ('Elige cómo redondear', 'En «Redondear hacia arriba a», con 5 el precio queda en múltiplos de L 5; con 1, en lempiras enteros; con 0, sin redondear.'),
        ('Lee tu precio', '«Precio para cobrar» es el precio ya redondeado y «Ganancia por unidad» lo que te queda de cada venta.'),
        ('Compáralo con la competencia', 'Si te queda muy arriba, revisa si puedes comprar más barato antes de bajar tu margen.'),
        ('Borra los ejemplos', 'Los productos que trae son de ejemplo. Borra lo escrito en las celdas amarillas antes de empezar.'),
    ], ('Cómo calcular el precio de venta de un producto', '/guias/como-calcular-el-precio-de-venta/'),
        'Con Gestión de Negocio VM cada producto lleva su costo y su precio, y en cada venta el programa te dice cuánto ganaste en el día, sin sacar cuentas a mano.')


# ---------------------------------------------------------------- Control de gastos
CATEGORIAS = ['Alquiler del local', 'Luz y agua', 'Internet y recargas', 'Sueldos y ayudantes', 'Transporte y fletes', 'Bolsas y empaques', 'Publicidad', 'Mantenimiento y reparaciones', 'Permisos y trámites', 'Otros']
MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']


def gastos():
    wb = Workbook(); rs = wb.active; rs.title = 'Resumen'
    gs = wb.create_sheet('Gastos')
    cols = [('Fecha', 12, 'dd/mm/yyyy', 'fecha'), ('Tipo de gasto', 26, None, ('lista', '=Resumen!$A$9:$A$23')), ('Detalle', 30, None, 'in'), ('Monto (L)', 12, LPS, 'num'),
            ('Forma de pago', 14, None, ('lista', '"Efectivo,Transferencia,Tarjeta"', True))]
    encabezado(gs, 'Gastos', 'Una fila por cada gasto, el mismo día. Comprar mercadería para vender no es gasto.', len(cols))
    ej = [(d(1), 'Alquiler del local', 'Alquiler de noviembre', 5000, 'Transferencia'), (d(5), 'Luz y agua', 'Recibo de luz', 1100, 'Efectivo'), (d(6), 'Luz y agua', 'Recibo de agua', 400, 'Efectivo'),
          (d(7), 'Transporte y fletes', 'Flete de mercadería', 600, 'Efectivo'), (d(10), 'Internet y recargas', 'Internet del local', 700, 'Transferencia'),
          (d(14), 'Transporte y fletes', 'Flete de mercadería', 600, 'Efectivo'), (d(18), 'Bolsas y empaques', 'Bolsas y etiquetas', 600, 'Efectivo'), (d(25), 'Transporte y fletes', 'Flete de mercadería', 600, 'Efectivo')]
    PRI, ULT, _ = tabla(gs, cols, 1000, ej)
    cifras(gs, [('A', 'Gastos anotados', f'=COUNT(D{PRI}:D{ULT})', '0', False), ('C', 'Total anotado (L)', f'=SUM(D{PRI}:D{ULT})', LPS, False)])
    gs.conditional_formatting.add(f'B{PRI}:B{ULT}', FormulaRule(formula=[f'AND($B{PRI}<>"",COUNTIF(Resumen!$A$9:$A$23,$B{PRI})=0)'], font=ROJO, fill=relleno('FDE7EA')))
    gs.print_title_rows = '8:8'
    # Resumen
    G = lambda x: f'Gastos!${x}${PRI}:${x}${ULT}'
    ini, fin = 'DATE($C$6,$A$6,1)', 'EOMONTH(DATE($C$6,$A$6,1),0)'
    encabezado(rs, 'Control de gastos', 'Elige el mes y el año en las casillas amarillas. Los tipos de gasto también los puedes cambiar.', 6)
    cifras(rs, [('A', 'Mes (1 a 12)', 11, '0', True), ('C', 'Año', 2026, '0', True), ('D', 'Gastos del mes (L)', '=SUM(B9:B23)', LPS, False), ('F', 'Por día (L)', f'=IF(D6=0,0,D6/DAY({fin}))', LPS, False)])
    v = DataValidation(type='whole', operator='between', formula1='1', formula2='12', showErrorMessage=True, errorTitle='Mes', error='Escribe el número del mes, de 1 a 12.'); rs.add_data_validation(v); v.add('A6')
    v = DataValidation(type='whole', operator='between', formula1='2000', formula2='2100', showErrorMessage=True, errorTitle='Año', error='Escribe el año, por ejemplo 2026.'); rs.add_data_validation(v); v.add('C6')
    rs['B6'] = f'=INDEX({{"{chr(34).join([""])}"}},1)' if False else f'=IFERROR(CHOOSE($A$6,{",".join(chr(34) + m + chr(34) for m in MESES)}),"")'
    rs['B6'].font = Font(name=F, size=11, color=GRIS); rs['B6'].alignment = Alignment(horizontal='left')
    cols = [('Tipo de gasto', 28, None, 'in'), ('Gasto del mes (L)', 14, LPS, ('calc', '=IF({A}{f}="","",SUMIFS(' + G('D') + ',' + G('B') + ',{A}{f},' + G('A') + ',">="&' + ini + ',' + G('A') + ',"<="&' + fin + '))')),
            ('Parte del total', 11, '0%', ('calc', '=IF(OR({B}{f}="",$D$6=0),"",{B}{f}/$D$6)'))]
    tabla(rs, cols, 15, [(c,) for c in CATEGORIAS], congelar=False)  # sin inmovilizar: un «quitar inmovilizar» dejaba el archivo dañado para Excel
    # Totales por mes del año elegido
    mcols = [('Mes', 14, None, 'calc'), ('Gastos del año (L)', 16, LPS, 'calc')]
    for k, (t, w, nf, _) in enumerate(mcols):
        c = rs.cell(8, 5 + k, t); c.font = Font(name=F, bold=True, color='FFFFFF', size=10); c.fill = relleno(VINO); c.border = borde; c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    rs.column_dimensions['E'].width = 14; rs.column_dimensions['F'].width = 16; rs.column_dimensions['D'].width = 18
    for i, m in enumerate(MESES, 1):
        f = 8 + i
        celda(rs.cell(f, 5), m, centro=False)
        celda(rs.cell(f, 6), '=SUMIFS(' + G('D') + ',' + G('A') + f',">="&DATE($C$6,{i},1),' + G('A') + f',"<="&EOMONTH(DATE($C$6,{i},1),0))', nf=LPS)
    celda(rs.cell(21, 5), 'Total del año', negrita=True, centro=False); celda(rs.cell(21, 6), '=SUM(F9:F20)', nf=LPS, negrita=True)
    rs.conditional_formatting.add('E9:F20', FormulaRule(formula=['ROW()-8=$A$6'], font=Font(name=F, bold=True, color=VINO)))
    wb.move_sheet('Gastos', offset=-1)
    terminar(wb, 'plantilla-control-de-gastos.xlsx', 'Plantilla de control de gastos', [
        ('Anota cada gasto en la hoja «Gastos»', 'Fecha, tipo de gasto (de la lista), detalle, monto y cómo lo pagaste. Una fila por gasto, el mismo día.'),
        ('No mezcles la casa con el negocio', 'La comida o el recibo de la casa no son gastos del negocio. Y comprar mercadería para vender tampoco: es inventario que vuelve cuando la vendes.'),
        ('Mira el «Resumen»', 'Escribe el mes y el año en las casillas amarillas: ves cuánto gastaste en cada tipo de gasto, qué parte del total es y cuánto te toca ganar por día solo para cubrirlos.'),
        ('Cambia los tipos de gasto si quieres', 'En el «Resumen», la columna «Tipo de gasto» es amarilla: puedes renombrar o agregar los tuyos y aparecen en la lista. Si en «Gastos» un tipo sale en rojo, no está en esa lista.'),
        ('Borra los ejemplos', 'Los gastos de noviembre son de ejemplo. Borra lo escrito en las celdas amarillas de la hoja «Gastos» antes de empezar.'),
    ], ('Cómo llevar el control de gastos de un negocio', '/guias/como-llevar-el-control-de-gastos-de-un-negocio/'),
        'Con Gestión de Negocio VM registras cada gasto desde el celular, se descuenta de la caja del día y «¿Cómo me fue hoy?» te dice cuánto te quedó de ganancia.')


# ---------------------------------------------------------------- Pedidos por encargo y apartados
def pedidos():
    wb = Workbook(); ws = wb.active; ws.title = 'Pedidos'
    cols = [('Fecha del pedido', 12, 'dd/mm/yyyy', 'fecha'), ('Cliente', 20, None, 'in'), ('Teléfono', 12, '@', 'in'), ('Qué pidió (talla, color…)', 36, None, 'in'),
            ('Precio (L)', 11, LPS, 'num'), ('Pagado: anticipo y abonos (L)', 13, LPS, 'num'),
            ('Saldo (L)', 11, LPS, ('calc', '=IF({E}{f}="","",{E}{f}-N({F}{f}))')),
            ('Estado', 12, None, ('lista', '"Pedido,En camino,Llegó,Entregado"', True)),
            ('Retirar a más tardar', 12, 'dd/mm/yyyy', 'fecha'),
            ('Aviso', 16, None, ('calc', '=IF({B}{f}="","",IF({H}{f}="Entregado",IF(N({G}{f})>0,"Entregado con saldo","Completo"),IF(AND({I}{f}<>"",TODAY()>{I}{f}),"Pasó la fecha",IF({H}{f}="Llegó","Avisar al cliente",""))))')),
            ('Nota', 24, None, 'in')]
    encabezado(ws, 'Pedidos por encargo y apartados', 'Una fila por pedido. Cambia el estado cuando avance: Pedido, En camino, Llegó, Entregado.', len(cols))
    ej = [(d(10), 'Sofía Ramos', '9800-0001', 'Vestido azul, talla M', 800, 400, None, 'En camino', d(30), None, 'Anticipo del 50 %'),
          (d(12), 'Luis Castro', '9800-0002', 'Zapatos negros, talla 41', 1200, 600, None, 'Llegó', d(26), None, None),
          (d(15), 'Daniela Paz', '9800-0003', 'Pastel de chocolate para 20 personas', 450, 200, None, 'Pedido', d(28), None, 'Entregar el sábado'),
          (d(3), 'Marco Flores', '9800-0004', 'Camisa blanca, talla L', 350, 350, None, 'Entregado', d(20), None, None)]
    PRI, ULT, _ = tabla(ws, cols, 500, ej)
    cifras(ws, [('A', 'Pedidos sin entregar', f'=COUNTA(B{PRI}:B{ULT})-COUNTIF(H{PRI}:H{ULT},"Entregado")', '0', False),
                ('C', 'Saldo por cobrar (L)', f'=SUMIF(H{PRI}:H{ULT},"<>Entregado",G{PRI}:G{ULT})', LPS, False),
                ('E', 'Llegaron y no los han retirado', f'=COUNTIF(H{PRI}:H{ULT},"Llegó")', '0', False),
                ('H', 'Pasaron la fecha', f'=COUNTIF(J{PRI}:J{ULT},"Pasó la fecha")', '0', False)])
    colorear(ws, f'J{PRI}:J{ULT}', f'$J{PRI}', [('Pasó la fecha', ROJO), ('Entregado con saldo', ROJO), ('Avisar al cliente', AMBAR), ('Completo', VERDE)])
    ws.print_title_rows = '8:8'
    terminar(wb, 'plantilla-pedidos-y-apartados.xlsx', 'Plantilla de pedidos por encargo y apartados', [
        ('Anota el pedido completo', 'Fecha, cliente, teléfono y qué pidió con talla o color. Lo que no está escrito se discute después.'),
        ('Escribe el precio y lo que ya pagó', 'En «Pagado» va el anticipo y, si da más abonos, súmalos ahí. El saldo se calcula solo.'),
        ('Cambia el estado cuando avance', 'Pedido, En camino, Llegó o Entregado (lo eliges de la lista). Cuando dice «Llegó», el aviso te recuerda escribirle al cliente.'),
        ('Pon la fecha límite para retirar', 'Si pasa la fecha y no lo han retirado, el aviso dice «Pasó la fecha». Qué pasa con el anticipo lo decides tú: déjalo claro desde el principio.'),
        ('Mira los totales de arriba', 'Cuántos pedidos faltan por entregar, cuánto te deben de ellos y cuántos llegaron y no los han retirado.'),
        ('Borra los ejemplos', 'Los cuatro pedidos son de ejemplo. Borra lo escrito en las celdas amarillas antes de empezar.'),
    ], ('Cómo manejar pedidos por encargo y apartados', '/guias/como-manejar-pedidos-por-encargo-y-apartados/'),
        'Con Gestión de Negocio VM registras el pedido aunque llegue por WhatsApp, con su estado hasta la entrega, y al entregarlo queda como venta.')
