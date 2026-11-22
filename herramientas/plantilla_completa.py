"""Plantilla completa (de pago): ventas, compras, abonos, gastos, caja, productos, clientes, estado de cuenta y resumen del mes,
todo conectado. Se publica con contraseña de apertura.
Uso: CLAVE_COMPLETA='…' python3 herramientas/plantilla_completa.py
La contraseña NO va en este repositorio (es público): se pasa por la variable CLAVE_COMPLETA.
Sin la variable solo se crea la copia sin contraseña en /tmp (para revisar)."""
import os, sys
from pathlib import Path
from datetime import date
sys.path.insert(0, str(Path(__file__).resolve().parent))
import plantillas
sys.modules['plantillas'] = plantillas
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side
from openpyxl.formatting.rule import FormulaRule
from openpyxl.utils import get_column_letter as L
from plantillas import VINO, MAGENTA, ORO, TINTA, GRIS, AMARILLO, ABIERTA, F, relleno, borde, encabezado, hoja_ayuda, proteger, SALIDA
from otras_plantillas import tabla, cifras, celda, validacion, colorear, CATEGORIAS, MESES, LPS, DIF, ROJO, AMBAR, VERDE

d = lambda dd, mm=11: date(2026, mm, dd)
NV, NC, NA, NG, NP, NCL, NCJ = 2000, 1000, 1000, 1000, 200, 300, 366
P = 9  # primera fila de datos en todas las hojas


def rng(hoja, col, n):
    h = f"'{hoja}'" if ' ' in hoja else hoja
    return f'{h}!${col}${P}:${col}${P + n - 1}'


def construir():
    wb = Workbook()
    res = wb.active; res.title = 'Resumen'
    ven = wb.create_sheet('Ventas'); com = wb.create_sheet('Compras'); abo = wb.create_sheet('Abonos'); gas = wb.create_sheet('Gastos')
    caj = wb.create_sheet('Caja'); pro = wb.create_sheet('Productos'); cli = wb.create_sheet('Clientes'); ec = wb.create_sheet('Estado de cuenta'); aj = wb.create_sheet('Ajustes')
    # ---------------- Ajustes
    encabezado(aj, 'Ajustes', 'Cambia aquí tus reglas. Todo lo demás las usa solo.', 7)
    for k, (t, v, nf, tipo) in enumerate([('Avísame cuando queden (unidades)', 5, '0', 'num'), ('Margen que quieres ganar', 0.40, '0%', 'pct'), ('Redondear precios hacia arriba a (L)', 5, '0.##', 'num'),
                                         ('Límite de crédito general (L)', 1500, LPS, 'num'), ('Aviso de atraso (días sin abonar)', 30, '0', 'num')]):
        f = P + k; c = aj.cell(f, 1, t); c.font = Font(name=F, size=10, bold=True, color=TINTA); c.border = borde
        celda(aj.cell(f, 2), v, entrada=True, nf=nf); validacion(aj, tipo).add(f'B{f}')
    aj.column_dimensions['A'].width = 36; aj.column_dimensions['B'].width = 12
    c = aj['A8']; c.value = 'Reglas'; c.font = Font(name=F, size=11, bold=True, color=VINO)
    AV, MG, RD, LG, DA = (f'Ajustes!$B${P + k}' for k in range(5))
    aj.column_dimensions['C'].width = 3
    tabla(aj, [('Tipos de gasto', 28, None, 'in')], 15, [(c,) for c in CATEGORIAS], c0=4, color=VINO, congelar=False)
    aj.column_dimensions['F'].width = 3
    tabla(aj, [('Cliente con límite propio', 24, None, ('lista', 'Clientes!$A$9:$A$308')), ('Límite (L)', 12, LPS, 'num')], 50, [('María López', 2000)], c0=7, color=VINO, congelar=False)
    TIPOS = 'Ajustes!$D$9:$D$23'; LIMC, LIMV = 'Ajustes!$G$9:$G$58', 'Ajustes!$H$9:$H$58'
    # ---------------- Compras  (J: numeración de productos)
    encabezado(com, 'Compras', 'Lo que compras para vender. El primer día anota lo que ya tienes como «Inventario inicial».', 7)
    cols = [('Fecha', 12, 'dd/mm/yyyy', 'fecha'), ('Producto', 28, None, ('lista', 'Productos!$A$9:$A$208')), ('Cantidad', 10, '#,##0.##', 'num'), ('Costo unitario (L)', 13, LPS, 'num'),
            ('Total (L)', 13, LPS, ('calc', '=IF(OR({C}{f}="",{D}{f}=""),"",{C}{f}*{D}{f})')),
            ('Forma de pago', 16, None, ('lista', '"Efectivo,Transferencia,Tarjeta,Inventario inicial"', True)), ('Proveedor', 24, None, 'in')]
    ej = [(d(1), 'Blusa', 30, 60, None, 'Inventario inicial', None), (d(1), 'Pantalón de mezclilla', 15, 260, None, 'Inventario inicial', None), (d(1), 'Zapatos de mujer', 10, 450, None, 'Inventario inicial', None),
          (d(1), 'Cartera', 8, 300, None, 'Inventario inicial', None), (d(12), 'Blusa', 12, 60, None, 'Transferencia', 'Distribuidora El Centro'), (d(12), 'Cartera', 4, 300, None, 'Efectivo', 'Distribuidora El Centro')]
    tabla(com, cols, NC, ej)
    cifras(com, [('A', 'Compras anotadas', f'=COUNT(C{P}:C{P + NC - 1})', '0', False), ('B', 'Total comprado (L)', f'=SUM(E{P}:E{P + NC - 1})', LPS, False)])
    for f in range(P, P + NC): com.cell(f, 10, f'=IF(TRIM(B{f})="","",IF(COUNTIF($B${P}:B{f},B{f})=1,MAX($J$8:J{f - 1})+1,""))')
    com['J7'] = f'=MAX(J{P}:J{P + NC - 1})'; com['J8'] = 'n'; com.column_dimensions['J'].hidden = True
    # ---------------- Ventas  (H costo, I ganancia; K numeración de productos que no están en compras; L clientes al crédito; M movimientos del cliente del estado de cuenta)
    encabezado(ven, 'Ventas', 'Una fila por venta o por producto vendido. Si es al crédito, escribe el cliente.', 9)
    cB = rng('Compras', 'B', NC)
    cols = [('Fecha', 12, 'dd/mm/yyyy', 'fecha'), ('Producto', 26, None, ('lista', 'Productos!$A$9:$A$208')), ('Cantidad', 10, '#,##0.##', 'num'), ('Precio unitario (L)', 13, LPS, 'num'),
            ('Total (L)', 13, LPS, ('calc', '=IF(OR({C}{f}="",{D}{f}=""),"",{C}{f}*{D}{f})')),
            ('Forma de pago', 14, None, ('lista', '"Efectivo,Tarjeta,Transferencia,Crédito"', True)), ('Cliente (si es al crédito)', 22, None, ('lista', 'Clientes!$A$9:$A$308')),
            ('Costo unitario (L)', 12, LPS, ('calc', '=IF({B}{f}="","",IFERROR(INDEX(Productos!$E$9:$E$208,MATCH({B}{f},Productos!$A$9:$A$208,0)),""))')),
            ('Ganancia (L)', 12, LPS, ('calc', '=IF(OR({E}{f}="",{H}{f}=""),"",{E}{f}-{C}{f}*{H}{f})'))]
    ej = [(d(3), 'Blusa', 4, 100, None, 'Efectivo'), (d(3), 'Pantalón de mezclilla', 2, 435, None, 'Tarjeta'), (d(5), 'Zapatos de mujer', 1, 750, None, 'Crédito', 'María López'),
          (d(5), 'Blusa', 3, 100, None, 'Efectivo'), (d(8), 'Cartera', 2, 500, None, 'Transferencia'), (d(10), 'Pantalón de mezclilla', 3, 435, None, 'Efectivo'),
          (d(12), 'Blusa', 6, 100, None, 'Efectivo'), (d(12), 'Zapatos de mujer', 2, 750, None, 'Efectivo'), (d(14), 'Cartera', 3, 500, None, 'Crédito', 'Carlos Mejía'),
          (d(15), 'Blusa', 9, 100, None, 'Tarjeta'), (d(18), 'Pantalón de mezclilla', 4, 435, None, 'Efectivo'), (d(19), 'Zapatos de mujer', 3, 750, None, 'Efectivo')]
    tabla(ven, cols, NV, ej)
    U = P + NV - 1
    cifras(ven, [('A', 'Ventas anotadas', f'=COUNT(E{P}:E{U})', '0', False), ('B', 'Total vendido (L)', f'=SUM(E{P}:E{U})', LPS, False), ('F', 'Ganancia (L)', f'=SUM(I{P}:I{U})', LPS, False)])
    for f in range(P, P + NV):
        ven.cell(f, 11, f'=IF(TRIM(B{f})="","",IF(AND(COUNTIF($B${P}:B{f},B{f})=1,COUNTIF({cB},B{f})=0),MAX(10000,$K$8:K{f - 1})+1,""))')
        ven.cell(f, 12, f'=IF(OR(TRIM(G{f})="",F{f}<>"Crédito"),"",IF(COUNTIFS($G${P}:G{f},G{f},$F${P}:F{f},"Crédito")=1,MAX($L$8:L{f - 1})+1,""))')
        ven.cell(f, 13, f"=IF(OR(F{f}<>\"Crédito\",G{f}<>'Estado de cuenta'!$B$5),\"\",COUNTIFS($G${P}:G{f},'Estado de cuenta'!$B$5,$F${P}:F{f},\"Crédito\"))")
    ven['L7'] = f'=MAX(L{P}:L{U})'
    for c in 'KLM': ven[f'{c}8'] = 'n'; ven.column_dimensions[c].hidden = True
    ven.conditional_formatting.add(f'G{P}:G{U}', FormulaRule(formula=[f'AND($F{P}="Crédito",TRIM($G{P})="")'], fill=relleno('FDE7EA'), font=ROJO))
    ven.conditional_formatting.add(f'B{P}:B{U}', FormulaRule(formula=[f'AND($B{P}<>"",COUNTIF(Productos!$A$9:$A$208,$B{P})=0)'], fill=relleno('FDE7EA'), font=ROJO))
    # ---------------- Abonos (F: clientes que no tienen ventas al crédito; G: movimientos del cliente del estado de cuenta)
    encabezado(abo, 'Abonos', 'Lo que te pagan tus clientes de lo que te deben.', 4)
    cols = [('Fecha', 12, 'dd/mm/yyyy', 'fecha'), ('Cliente', 26, None, ('lista', 'Clientes!$A$9:$A$308')), ('Monto (L)', 13, LPS, 'num'), ('Forma de pago', 14, None, ('lista', '"Efectivo,Tarjeta,Transferencia"', True))]
    tabla(abo, cols, NA, [(d(15), 'María López', 300, 'Efectivo'), (d(20), 'Carlos Mejía', 500, 'Transferencia')])
    cifras(abo, [('A', 'Abonos anotados', f'=COUNT(C{P}:C{P + NA - 1})', '0', False), ('C', 'Total abonado (L)', f'=SUM(C{P}:C{P + NA - 1})', LPS, False)])
    vG, vF = rng('Ventas', 'G', NV), rng('Ventas', 'F', NV)
    for f in range(P, P + NA):
        abo.cell(f, 6, f'=IF(TRIM(B{f})="","",IF(AND(COUNTIF($B${P}:B{f},B{f})=1,COUNTIFS({vG},B{f},{vF},"Crédito")=0),MAX(10000,$F$8:F{f - 1})+1,""))')
        abo.cell(f, 7, f"=IF(OR(TRIM(B{f})=\"\",B{f}<>'Estado de cuenta'!$B$5),\"\",COUNTIF($B${P}:B{f},'Estado de cuenta'!$B$5))")
    for c in 'FG': abo[f'{c}8'] = 'n'; abo.column_dimensions[c].hidden = True
    # ---------------- Gastos
    encabezado(gas, 'Gastos', 'Lo que pagas para que el negocio funcione. Comprar mercadería para vender va en «Compras».', 5)
    cols = [('Fecha', 12, 'dd/mm/yyyy', 'fecha'), ('Tipo de gasto', 26, None, ('lista', TIPOS)), ('Detalle', 28, None, 'in'), ('Monto (L)', 12, LPS, 'num'),
            ('Forma de pago', 14, None, ('lista', '"Efectivo,Transferencia,Tarjeta"', True))]
    tabla(gas, cols, NG, [(d(1), 'Alquiler del local', 'Alquiler de noviembre', 3000, 'Transferencia'), (d(5), 'Luz y agua', 'Recibo de luz', 650, 'Efectivo'),
                          (d(10), 'Internet y recargas', 'Internet del local', 500, 'Transferencia'), (d(12), 'Bolsas y empaques', 'Bolsas de regalo', 250, 'Efectivo')])
    cifras(gas, [('A', 'Gastos anotados', f'=COUNT(D{P}:D{P + NG - 1})', '0', False), ('C', 'Total gastado (L)', f'=SUM(D{P}:D{P + NG - 1})', LPS, False)])
    gas.conditional_formatting.add(f'B{P}:B{P + NG - 1}', FormulaRule(formula=[f'AND($B{P}<>"",COUNTIF({TIPOS},$B{P})=0)'], font=ROJO, fill=relleno('FDE7EA')))
    # ---------------- Productos (se llena sola)
    cBn, cC, cE = rng('Compras', 'B', NC), rng('Compras', 'C', NC), rng('Compras', 'E', NC)
    vB, vC, vE = rng('Ventas', 'B', NV), rng('Ventas', 'C', NV), rng('Ventas', 'E', NV)
    encabezado(pro, 'Productos', 'Se llena sola con tus compras y ventas. El aviso, el margen y el redondeo se cambian en «Ajustes».', 9)
    cols = [('Producto', 26, None, ('calc', '=IF({f}-8<=Compras!$J$7,IFERROR(INDEX(' + cBn + ',MATCH({f}-8,' + rng('Compras', 'J', NC) + ',0)),""),IFERROR(INDEX(' + vB + ',MATCH(10000+{f}-8-Compras!$J$7,' + rng('Ventas', 'K', NV) + ',0)),""))')),
            ('Comprado', 11, '#,##0.##', ('calc', '=IF({A}{f}="","",SUMIF(' + cBn + ',{A}{f},' + cC + '))')),
            ('Vendido', 11, '#,##0.##', ('calc', '=IF({A}{f}="","",SUMIF(' + vB + ',{A}{f},' + vC + '))')),
            ('Existencia', 11, '#,##0.##', ('calc', '=IF({A}{f}="","",{B}{f}-{C}{f})')),
            ('Costo promedio (L)', 12, LPS, ('calc', '=IF(OR({A}{f}="",N({B}{f})=0),"",SUMIF(' + cBn + ',{A}{f},' + cE + ')/{B}{f})')),
            ('Precio sugerido (L)', 12, LPS, ('calc', '=IF({E}{f}="","",IF(N(' + RD + ')>0,CEILING({E}{f}/(1-' + MG + '),' + RD + '),ROUND({E}{f}/(1-' + MG + '),2)))')),
            ('Precio promedio de venta (L)', 13, LPS, ('calc', '=IF(OR({A}{f}="",N({C}{f})=0),"",SUMIF(' + vB + ',{A}{f},' + vE + ')/{C}{f})')),
            ('Valor al costo (L)', 13, LPS, ('calc', '=IF(OR({A}{f}="",{E}{f}=""),"",MAX({D}{f},0)*{E}{f})')),
            ('Estado', 12, None, ('calc', '=IF({A}{f}="","",IF({D}{f}<0,"Revisar",IF({D}{f}=0,"Agotado",IF({D}{f}<=' + AV + ',"Comprar","Bien"))))'))]
    tabla(pro, cols, NP, [])
    cifras(pro, [('A', 'Productos', f'=COUNTIF(A{P}:A{P + NP - 1},"?*")', '0', False), ('C', 'Valor del inventario al costo (L)', f'=SUM(H{P}:H{P + NP - 1})', LPS, False),
                 ('F', 'Por comprar o agotados', f'=COUNTIF(I{P}:I{P + NP - 1},"Comprar")+COUNTIF(I{P}:I{P + NP - 1},"Agotado")', '0', False)])
    colorear(pro, f'I{P}:I{P + NP - 1}', f'$I{P}', [('Agotado', ROJO), ('Revisar', ROJO), ('Comprar', AMBAR)])
    # ---------------- Clientes (se llena sola)
    aB, aC, aA = rng('Abonos', 'B', NA), rng('Abonos', 'C', NA), rng('Abonos', 'A', NA)
    vA = rng('Ventas', 'A', NV)
    encabezado(cli, 'Clientes', 'Se llena sola con las ventas al crédito y los abonos. Los límites se cambian en «Ajustes».', 9)
    cols = [('Cliente', 24, None, ('calc', '=IF({f}-8<=Ventas!$L$7,IFERROR(INDEX(' + vG + ',MATCH({f}-8,' + rng('Ventas', 'L', NV) + ',0)),""),IFERROR(INDEX(' + aB + ',MATCH(10000+{f}-8-Ventas!$L$7,' + rng('Abonos', 'F', NA) + ',0)),""))')),
            ('Vendido al crédito (L)', 13, LPS, ('calc', '=IF({A}{f}="","",SUMIFS(' + vE + ',' + vG + ',{A}{f},' + vF + ',"Crédito"))')),
            ('Abonado (L)', 12, LPS, ('calc', '=IF({A}{f}="","",SUMIF(' + aB + ',{A}{f},' + aC + '))')),
            ('Saldo (L)', 12, LPS, ('calc', '=IF({A}{f}="","",{B}{f}-{C}{f})')),
            ('Límite (L)', 12, LPS, ('calc', '=IF({A}{f}="","",IFERROR(INDEX(' + LIMV + ',MATCH({A}{f},' + LIMC + ',0)),' + LG + '))')),
            ('Disponible (L)', 12, LPS, ('calc', '=IF({A}{f}="","",MAX({E}{f}-{D}{f},0))')),
            ('Último abono', 12, 'dd/mm/yyyy', ('calc', '=IF({A}{f}="","",IF(SUMPRODUCT(MAX((' + aB + '={A}{f})*' + aA + '))=0,"",SUMPRODUCT(MAX((' + aB + '={A}{f})*' + aA + '))))')),
            ('Días sin abonar', 10, '0', ('calc', '=IF(OR({A}{f}="",{D}{f}<=0),"",TODAY()-MAX({G}{f},SUMPRODUCT(MAX((' + vG + '={A}{f})*(' + vF + '="Crédito")*' + vA + '))))')),
            ('Estado', 15, None, ('calc', '=IF({A}{f}="","",IF({D}{f}<=0,"Pagado",IF({D}{f}>{E}{f},"Pasó el límite",IF({H}{f}>' + DA + ',"Atrasado","Al día"))))'))]
    tabla(cli, cols, NCL, [])
    cifras(cli, [('A', 'Total por cobrar (L)', f'=SUMIF(D{P}:D{P + NCL - 1},">0")', LPS, False), ('C', 'Clientes que deben', f'=COUNTIF(D{P}:D{P + NCL - 1},">0")', '0', False),
                 ('F', 'Atrasados o pasados del límite', f'=COUNTIF(I{P}:I{P + NCL - 1},"Atrasado")+COUNTIF(I{P}:I{P + NCL - 1},"Pasó el límite")', '0', False)])
    colorear(cli, f'I{P}:I{P + NCL - 1}', f'$I{P}', [('Pasó el límite', ROJO), ('Atrasado', AMBAR), ('Pagado', VERDE)])
    # ---------------- Estado de cuenta
    encabezado(ec, 'Estado de cuenta', 'Elige el cliente en la casilla amarilla. Imprímelo o guárdalo en PDF para mandárselo.', 7)
    ec['A5'] = 'Cliente'; ec['A5'].font = Font(name=F, size=9, bold=True, color=VINO)
    x = ec['B5']; x.value = 'María López'; x.font = Font(name=F, size=13, bold=True, color=TINTA); x.fill = relleno(AMARILLO); x.protection = ABIERTA
    x.border = Border(*(Side(style='medium', color=ORO),) * 4); ec.merge_cells('B5:C5'); validacion(ec, ('lista', 'Clientes!$A$9:$A$308', True)).add('B5')
    ec['E5'] = 'Fecha'; ec['E5'].font = Font(name=F, size=9, color=GRIS); ec['F5'] = '=TODAY()'; ec['F5'].number_format = 'dd/mm/yyyy'
    for k, (t, col) in enumerate((('Vendido', 'B'), ('Abonado', 'C'), ('Saldo', 'D'), ('Límite', 'E'), ('Disponible', 'F'))):
        c0 = 1 + k + (1 if k >= 3 else 0)
        ec.cell(7, c0, t).font = Font(name=F, size=9, color=GRIS)
        v = ec.cell(8, c0, f'=IFERROR(INDEX(Clientes!${col}$9:${col}$308,MATCH($B$5,Clientes!$A$9:$A$308,0)),0)'); v.number_format = LPS; v.font = Font(name=F, size=13, bold=True, color=VINO if col == 'D' else TINTA)
    def mov(c0, titulo, color, cols, hoja, helper, n):
        for k in range(len(cols)): ec.cell(10, c0 + k).fill = relleno(color)
        ec.cell(10, c0, titulo).font = Font(name=F, size=11, bold=True, color='FFFFFF')
        for k, (nm, w, nf, scol) in enumerate(cols):
            c = ec.cell(11, c0 + k, nm); c.font = Font(name=F, bold=True, color='FFFFFF', size=10); c.fill = relleno(VINO); c.border = borde; c.alignment = Alignment(horizontal='center')
            ec.column_dimensions[L(c0 + k)].width = w
            for r in range(100):
                celda(ec.cell(12 + r, c0 + k), f'=IFERROR(INDEX({rng(hoja, scol, n)},MATCH({r + 1},{rng(hoja, helper, n)},0)),"")', nf=nf, centro=scol not in ('B',))
        km = [k for k, x in enumerate(cols) if x[0].startswith(('Total', 'Monto'))][0]
        ec.cell(112, c0, 'Total').font = Font(name=F, size=10, bold=True, color=VINO)
        t = ec.cell(112, c0 + km, f'=SUM({L(c0 + km)}12:{L(c0 + km)}111)'); t.number_format = LPS; t.font = Font(name=F, size=10, bold=True, color=VINO)
    mov(1, 'Compras al crédito', ORO, [('Fecha', 12, 'dd/mm/yyyy', 'A'), ('Producto', 26, None, 'B'), ('Total (L)', 13, LPS, 'E')], 'Ventas', 'M', NV)
    ec.column_dimensions['D'].width = 3
    mov(5, 'Abonos', MAGENTA, [('Fecha', 12, 'dd/mm/yyyy', 'A'), ('Monto (L)', 13, LPS, 'C'), ('Forma de pago', 14, None, 'D')], 'Abonos', 'G', NA)
    ec.print_area = 'A1:G112'; ec.freeze_panes = 'A12'
    # ---------------- Caja (una fila por día)
    S = lambda hoja, n, col_m, col_f, col_c, cond: f'SUMIFS({rng(hoja, col_m, n)},{rng(hoja, col_f, n)},{{A}}{{f}},{rng(hoja, col_c, n)},"{cond}")'
    encabezado(caj, 'Caja diaria', 'Escribe la fecha, la apertura, los retiros y lo que contaste. Lo demás sale solo de tus ventas, abonos, compras y gastos.', 13)
    cols = [('Fecha', 12, 'dd/mm/yyyy', 'fecha'), ('Apertura (L)', 11, LPS, 'num'),
            ('Ventas en efectivo (L)', 12, LPS, ('calc', '=IF({A}{f}="","",' + S('Ventas', NV, 'E', 'A', 'F', 'Efectivo') + ')')),
            ('Abonos en efectivo (L)', 12, LPS, ('calc', '=IF({A}{f}="","",' + S('Abonos', NA, 'C', 'A', 'D', 'Efectivo') + ')')),
            ('Compras pagadas en efectivo (L)', 13, LPS, ('calc', '=IF({A}{f}="","",' + S('Compras', NC, 'E', 'A', 'F', 'Efectivo') + ')')),
            ('Gastos en efectivo (L)', 12, LPS, ('calc', '=IF({A}{f}="","",' + S('Gastos', NG, 'D', 'A', 'E', 'Efectivo') + ')')),
            ('Retiros del dueño (L)', 11, LPS, 'num'),
            ('Debería haber (L)', 12, LPS, ('calc', '=IF({A}{f}="","",N({B}{f})+{C}{f}+{D}{f}-{E}{f}-{F}{f}-N({G}{f}))')),
            ('Se contó (L)', 11, LPS, 'num'),
            ('Diferencia (L)', 11, DIF, ('calc', '=IF(OR({H}{f}="",{I}{f}=""),"",ROUND({I}{f}-{H}{f},2))')),
            ('Resultado', 11, None, ('calc', '=IF({J}{f}="","",IF({J}{f}=0,"Cuadra",IF({J}{f}>0,"Sobrante","Faltante")))')),
            ('Tarjeta y transferencias (L)', 13, LPS, ('calc', '=IF({A}{f}="","",' + S('Ventas', NV, 'E', 'A', 'F', 'Tarjeta') + '+' + S('Ventas', NV, 'E', 'A', 'F', 'Transferencia') + '+' + S('Abonos', NA, 'C', 'A', 'D', 'Tarjeta') + '+' + S('Abonos', NA, 'C', 'A', 'D', 'Transferencia') + ')')),
            ('Vendido al crédito (L)', 12, LPS, ('calc', '=IF({A}{f}="","",' + S('Ventas', NV, 'E', 'A', 'F', 'Crédito') + ')'))]
    tabla(caj, cols, NCJ, [(d(3), 500, None, None, None, None, 0, None, 900), (d(5), 500, None, None, None, None, 0, None, 150), (d(12), 500, None, None, None, None, 0, None, 1130)])
    cifras(caj, [('A', 'Días anotados', f'=COUNT(A{P}:A{P + NCJ - 1})', '0', False), ('C', 'Faltantes (L)', f'=-SUMIF(J{P}:J{P + NCJ - 1},"<0")', LPS, False),
                 ('E', 'Sobrantes (L)', f'=SUMIF(J{P}:J{P + NCJ - 1},">0")', LPS, False), ('H', 'Días con faltante', f'=COUNTIF(K{P}:K{P + NCJ - 1},"Faltante")', '0', False)])
    colorear(caj, f'K{P}:K{P + NCJ - 1}', f'$K{P}', [('Faltante', ROJO), ('Sobrante', AMBAR), ('Cuadra', VERDE)])
    # ---------------- Resumen del mes
    encabezado(res, 'Resumen de tu negocio', 'Elige el mes y el año en las casillas amarillas. Todo se calcula con lo que anotas en las demás hojas.', 8)
    for c, t, v in (('A', 'Mes (1 a 12)', 11), ('C', 'Año', 2026)):
        res[f'{c}5'] = t; res[f'{c}5'].font = Font(name=F, size=9, bold=True, color=VINO)
        x = res[f'{c}6']; x.value = v; x.font = Font(name=F, size=14, bold=True, color=TINTA); x.fill = relleno(AMARILLO); x.protection = ABIERTA
        x.alignment = Alignment(horizontal='center'); x.border = Border(*(Side(style='medium', color=ORO),) * 4)
    from openpyxl.worksheet.datavalidation import DataValidation
    for c, a, b in (('A6', '1', '12'), ('C6', '2000', '2100')):
        v = DataValidation(type='whole', operator='between', formula1=a, formula2=b, showErrorMessage=True, errorTitle='Mes o año', error='Escribe el mes de 1 a 12 y el año, por ejemplo 2026.'); res.add_data_validation(v); v.add(c)
    res['B6'] = f'=IFERROR(CHOOSE($A$6,{",".join(chr(34) + m + chr(34) for m in MESES)}),"")'; res['B6'].font = Font(name=F, size=11, color=GRIS)
    INI, FIN = 'DATE($C$6,$A$6,1)', 'EOMONTH(DATE($C$6,$A$6,1),0)'
    mes = lambda hoja, n, colm, cola, extra='': f'SUMIFS({rng(hoja, colm, n)},{rng(hoja, cola, n)},">="&{INI},{rng(hoja, cola, n)},"<="&{FIN}{extra})'
    def bloque(c0, titulo, filas, ancho=(30, 15)):
        res.column_dimensions[L(c0)].width = ancho[0]; res.column_dimensions[L(c0 + 1)].width = ancho[1]
        for k in range(2): res.cell(8, c0 + k).fill = relleno(VINO)
        res.cell(8, c0, titulo).font = Font(name=F, size=11, bold=True, color='FFFFFF')
        for k, (t, fx, nf, bold) in enumerate(filas):
            a = res.cell(9 + k, c0, t); a.font = Font(name=F, size=10, bold=bold, color=VINO if bold else TINTA); a.border = borde
            celda(res.cell(9 + k, c0 + 1), fx, nf=nf, negrita=bold)
    vFr = rng('Ventas', 'F', NV)
    bloque(1, 'El mes', [('Ventas', '=' + mes('Ventas', NV, 'E', 'A'), LPS, False),
                         ('Costo de lo vendido', '=B9-B11', LPS, False),
                         ('Ganancia en ventas', '=' + mes('Ventas', NV, 'I', 'A'), LPS, True),
                         ('Gastos', '=' + mes('Gastos', NG, 'D', 'A'), LPS, False),
                         ('Ganancia del mes (después de gastos)', '=B11-B12', LPS, True),
                         ('Compras de mercadería (sin inventario inicial)', '=' + mes('Compras', NC, 'E', 'A', f',{rng("Compras", "F", NC)},"<>Inventario inicial"'), LPS, False),
                         ('Por día: lo que debes ganar para cubrir gastos', f'=IF(B12=0,0,B12/DAY({FIN}))', LPS, False)], ancho=(44, 15))
    res.conditional_formatting.add('B13', FormulaRule(formula=['$B$13<0'], font=ROJO))
    bloque(4, 'Ventas del mes por forma de pago', [(fp, '=' + mes('Ventas', NV, 'E', 'A', f',{vFr},"{fp}"'), LPS, False) for fp in ('Efectivo', 'Tarjeta', 'Transferencia', 'Crédito')] +
           [('Abonos recibidos', '=' + mes('Abonos', NA, 'C', 'A'), LPS, False)], ancho=(30, 15))
    res.column_dimensions['C'].width = 10
    bloque(7, 'Hoy en tu negocio', [('Te deben (total por cobrar)', '=Clientes!A6', LPS, True), ('Clientes atrasados o pasados del límite', '=Clientes!F6', '0', False),
                                    ('Valor del inventario al costo', '=Productos!C6', LPS, True), ('Productos por comprar o agotados', '=Productos!F6', '0', False),
                                    ('Días con faltante en caja (este mes)', f'=COUNTIFS({rng("Caja", "K", NCJ)},"Faltante",{rng("Caja", "A", NCJ)},">="&{INI},{rng("Caja", "A", NCJ)},"<="&{FIN})', '0', False)], ancho=(34, 15))
    res.column_dimensions['F'].width = 4
    # Gastos del mes por tipo
    for k in range(2): res.cell(17, 1 + k).fill = relleno(VINO)
    res.cell(17, 1, 'Gastos del mes por tipo').font = Font(name=F, size=11, bold=True, color='FFFFFF')
    for k in range(15):
        f = 18 + k
        celda(res.cell(f, 1), f'=IF(Ajustes!$D${9 + k}="","",Ajustes!$D${9 + k})', centro=False)
        celda(res.cell(f, 2), f'=IF(A{f}="","",' + mes('Gastos', NG, 'D', 'A', f',{rng("Gastos", "B", NG)},A{f}') + ')', nf=LPS)
    # ---------------- Ayuda, orden y protección
    hoja_ayuda(wb, 'Plantilla completa para tu negocio', [
        ('Solo escribes en las celdas amarillas', 'Ventas, Compras, Abonos, Gastos y Caja. Productos, Clientes, Estado de cuenta y Resumen se llenan solos.'),
        ('Empieza con lo que ya tienes', 'En «Compras», anota tu mercadería de hoy con la forma de pago «Inventario inicial». No sale de la caja.'),
        ('Anota cada venta', 'Producto, cantidad, precio y forma de pago. Si es al crédito, escribe el cliente: pasa solo a su cuenta. Cada venta calcula su ganancia.'),
        ('Anota compras, abonos y gastos', 'Las compras suben tu inventario; los abonos bajan lo que te deben; los gastos van al resumen. Lo que se paga en efectivo entra o sale de la caja solo.'),
        ('Cierra la caja cada día', 'En «Caja», escribe la fecha, la apertura, los retiros y lo que contaste. La hoja te dice cuánto debería haber y si cuadra.'),
        ('Mira el «Resumen»', 'Elige el mes: ventas, ganancia, gastos, ganancia del mes, lo que te deben y lo que hay que comprar. Tus reglas (aviso, margen, límites, tipos de gasto) van en «Ajustes».'),
    ], ('Guías para tu negocio', '/guias/'), 'Con Gestión de Negocio VM todo esto pasa desde tu celular, con tienda en línea, recibos y recordatorios por WhatsApp.')
    orden = ['Cómo usarla', 'Resumen', 'Ventas', 'Compras', 'Abonos', 'Gastos', 'Caja', 'Productos', 'Clientes', 'Estado de cuenta', 'Ajustes']
    wb._sheets = [wb[n] for n in orden]
    for h in wb.worksheets:
        h.sheet_view.showGridLines = False
        h.page_setup.fitToWidth = 1; h.page_setup.fitToHeight = 0; h.sheet_properties.pageSetUpPr.fitToPage = True
        if h.title not in ('Cómo usarla', 'Estado de cuenta'): h.page_setup.orientation = 'landscape'
        proteger(h)
    for n in ('Ventas', 'Compras', 'Abonos', 'Gastos', 'Caja'): wb[n].sheet_properties.tabColor = ORO
    for n in ('Resumen', 'Productos', 'Clientes', 'Estado de cuenta'): wb[n].sheet_properties.tabColor = MAGENTA
    wb.active = 1
    wb.properties.creator = 'Molina Soluciones Digitales'; wb.properties.title = 'Plantilla completa para tu negocio'
    return wb


if __name__ == '__main__':
    # Paso 1 (sin argumentos): crea la copia sin contraseña en /tmp. Recalcúlala con LibreOffice para que lleve los valores.
    # Paso 2: CLAVE_COMPLETA='…' python3 herramientas/plantilla_completa.py /tmp/plantilla-completa-sin-clave.xlsx  → la cifra en descargas/
    clave = os.environ.get('CLAVE_COMPLETA')
    if len(sys.argv) > 1 and clave:
        from msoffcrypto.format.ooxml import OOXMLFile
        with open(sys.argv[1], 'rb') as fi, open(SALIDA / 'plantilla-completa-negocio.xlsx', 'wb') as fo:
            OOXMLFile(fi).encrypt(clave, fo)
        print('con contraseña:', SALIDA / 'plantilla-completa-negocio.xlsx')
    else:
        construir().save('/tmp/plantilla-completa-sin-clave.xlsx')
        print('sin contraseña: /tmp/plantilla-completa-sin-clave.xlsx')
