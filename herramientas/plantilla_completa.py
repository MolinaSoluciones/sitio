"""Plantilla completa (de pago): ventas, compras, abonos, gastos, caja, productos, clientes, estado de cuenta y resumen del mes,
todo conectado. Se publica con prueba gratis de 10 días; después, para seguir anotando, pide la contraseña de activación.
Uso: ver el final del archivo (se crea con la variable CLAVE_COMPLETA, que NO va en este repositorio porque es público).
"""
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
    rd = wb.create_sheet('Resumen del día')
    ven = wb.create_sheet('Ventas'); com = wb.create_sheet('Compras'); abo = wb.create_sheet('Abonos'); gas = wb.create_sheet('Gastos')
    caj = wb.create_sheet('Caja'); arq = wb.create_sheet('Arqueo'); pro = wb.create_sheet('Productos'); cli = wb.create_sheet('Clientes'); ec = wb.create_sheet('Estado de cuenta'); aj = wb.create_sheet('Ajustes')
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
    for f in range(P, P + NV): ven.cell(f, 14, f"=IF(OR(TRIM(B{f})=\"\",A{f}<>'Resumen del día'!$B$5),\"\",COUNTIF($A${P}:A{f},'Resumen del día'!$B$5))")
    ven['L7'] = f'=MAX(L{P}:L{U})'
    for c in 'KLMN': ven[f'{c}8'] = 'n'; ven.column_dimensions[c].hidden = True
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
        abo.cell(f, 8, f'=IF(OR(TRIM(B{f})="",A{f}<>Arqueo!$B$5),"",COUNTIF($A${P}:A{f},Arqueo!$B$5))')
    for c in 'FGH': abo[f'{c}8'] = 'n'; abo.column_dimensions[c].hidden = True
    # ---------------- Gastos
    encabezado(gas, 'Gastos', 'Lo que pagas para que el negocio funcione. Comprar mercadería para vender va en «Compras».', 5)
    cols = [('Fecha', 12, 'dd/mm/yyyy', 'fecha'), ('Tipo de gasto', 26, None, ('lista', TIPOS)), ('Detalle', 28, None, 'in'), ('Monto (L)', 12, LPS, 'num'),
            ('Forma de pago', 14, None, ('lista', '"Efectivo,Transferencia,Tarjeta"', True))]
    tabla(gas, cols, NG, [(d(1), 'Alquiler del local', 'Alquiler de noviembre', 3000, 'Transferencia'), (d(5), 'Luz y agua', 'Recibo de luz', 650, 'Efectivo'),
                          (d(10), 'Internet y recargas', 'Internet del local', 500, 'Transferencia'), (d(12), 'Bolsas y empaques', 'Bolsas de regalo', 250, 'Efectivo')])
    cifras(gas, [('A', 'Gastos anotados', f'=COUNT(D{P}:D{P + NG - 1})', '0', False), ('C', 'Total gastado (L)', f'=SUM(D{P}:D{P + NG - 1})', LPS, False)])
    for f in range(P, P + NG): gas.cell(f, 6, f"=IF(OR(TRIM(B{f})=\"\",A{f}<>'Resumen del día'!$B$5),\"\",COUNTIF($A${P}:A{f},'Resumen del día'!$B$5))")
    gas['F8'] = 'n'; gas.column_dimensions['F'].hidden = True
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
    tabla(caj, cols, NCJ, [(d(3), 500, None, None, None, None, 0, None, 900), (d(5), 500, None, None, None, None, 0, None, 150), (d(12), 500, None, None, None, None, 0, None, 1130), (d(15), 500, None, None, None, None, 0, None, 800)])
    cifras(caj, [('A', 'Días anotados', f'=COUNT(A{P}:A{P + NCJ - 1})', '0', False), ('C', 'Faltantes (L)', f'=-SUMIF(J{P}:J{P + NCJ - 1},"<0")', LPS, False),
                 ('E', 'Sobrantes (L)', f'=SUMIF(J{P}:J{P + NCJ - 1},">0")', LPS, False), ('H', 'Días con faltante', f'=COUNTIF(K{P}:K{P + NCJ - 1},"Faltante")', '0', False)])
    colorear(caj, f'K{P}:K{P + NCJ - 1}', f'$K{P}', [('Faltante', ROJO), ('Sobrante', AMBAR), ('Cuadra', VERDE)])
    # ---------------- Arqueo (eliges el día; lo que debería haber sale de las otras hojas, el conteo se escribe)
    from datetime import time
    for col, w in zip('ABCD', (46, 16, 16, 4)): arq.column_dimensions[col].width = w
    encabezado(arq, 'Arqueo de caja', 'Elige el día. Lo que debería haber sale solo de tus hojas; tú cuentas billetes y monedas.', 3)
    def et(f, t, bold=False, color=TINTA):
        c = arq[f'A{f}']; c.value = t; c.font = Font(name=F, size=10, bold=bold, color=color); c.border = borde
    def tit(f, t):
        for k in range(3): arq.cell(f, 1 + k).fill = relleno(MAGENTA)
        arq[f'A{f}'] = t; arq[f'A{f}'].font = Font(name=F, size=11, bold=True, color='FFFFFF')
    f = 5
    for t, v, nf in [('Día del arqueo', d(15), 'dd/mm/yyyy'), ('Hora', time(18, 0), 'h:mm AM/PM'), ('Quién estaba en caja', 'Karla', None), ('Quién hizo el arqueo', 'Dueño', None)]:
        et(f, t, bold=True); celda(arq[f'B{f}'], v, entrada=True, nf=nf); arq.merge_cells(f'B{f}:C{f}'); f += 1
    validacion(arq, 'fecha').add('B5')
    SD = lambda hoja, n, cm, cf, cond: f'SUMIFS({rng(hoja, cm, n)},{rng(hoja, "A", n)},$B$5,{rng(hoja, cf, n)},"{cond}")'
    CJ = lambda col: f'IFERROR(INDEX({rng("Caja", col, NCJ)},MATCH($B$5,{rng("Caja", "A", NCJ)},0)),0)'
    f = 10; tit(f, '1. Lo que debería haber en la gaveta (sale de tus hojas)'); f += 1; D1 = f
    for t, fx in (('+ Apertura (de «Caja»)', '=N(' + CJ('B') + ')'), ('+ Ventas en efectivo', '=' + SD('Ventas', NV, 'E', 'F', 'Efectivo')),
                  ('+ Abonos de clientes en efectivo', '=' + SD('Abonos', NA, 'C', 'D', 'Efectivo')), ('− Compras pagadas en efectivo', '=' + SD('Compras', NC, 'E', 'F', 'Efectivo')),
                  ('− Gastos pagados en efectivo', '=' + SD('Gastos', NG, 'D', 'E', 'Efectivo')), ('− Retiros del dueño (de «Caja»)', '=N(' + CJ('G') + ')')):
        et(f, t); celda(arq[f'B{f}'], fx, nf=LPS); f += 1
    et(f, 'Debería haber', bold=True, color=VINO); celda(arq[f'B{f}'], f'=B{D1}+B{D1 + 1}+B{D1 + 2}-B{D1 + 3}-B{D1 + 4}-B{D1 + 5}', nf=LPS, negrita=True); DEB = f
    f += 1; arq[f'A{f}'] = 'Si ese día no está anotado en «Caja», la apertura y los retiros salen en cero.'; arq[f'A{f}'].font = Font(name=F, size=8, color=GRIS)
    f += 2; tit(f, '2. Abonos de clientes de ese día (de «Abonos»)'); f += 1
    for col, t in zip('ABC', ('Cliente', 'Monto (L)', 'Cómo pagó')):
        c = arq[f'{col}{f}']; c.value = t; c.font = Font(name=F, size=10, bold=True, color=VINO); c.border = borde; c.alignment = Alignment(horizontal='left' if col == 'A' else 'center')
    f += 1; A0 = f
    for r in range(10):
        for col, sc, nf in (('A', 'B', None), ('B', 'C', LPS), ('C', 'D', None)):
            celda(arq[f'{col}{f}'], f'=IFERROR(INDEX({rng("Abonos", sc, NA)},MATCH({r + 1},{rng("Abonos", "H", NA)},0)),"")', nf=nf, centro=col != 'A')
        f += 1
    et(f, 'Total abonado ese día', bold=True, color=VINO); celda(arq[f'B{f}'], f'=SUM(B{A0}:B{f - 1})', nf=LPS, negrita=True)
    f += 2; tit(f, '3. Cobros que no están en la gaveta'); f += 1; N0 = f
    for t, fx in (('Ventas con tarjeta', '=' + SD('Ventas', NV, 'E', 'F', 'Tarjeta')), ('Ventas por transferencia', '=' + SD('Ventas', NV, 'E', 'F', 'Transferencia')),
                  ('Abonos con tarjeta o transferencia', '=' + SD('Abonos', NA, 'C', 'D', 'Tarjeta') + '+' + SD('Abonos', NA, 'C', 'D', 'Transferencia'))):
        et(f, t); celda(arq[f'B{f}'], fx, nf=LPS); f += 1
    et(f, 'Otros (escríbelos y descríbelos en la nota)'); celda(arq[f'B{f}'], 0, entrada=True, nf=LPS); validacion(arq, 'num').add(f'B{f}'); f += 1
    et(f, 'Total fuera de la gaveta', bold=True, color=VINO); celda(arq[f'B{f}'], f'=SUM(B{N0}:B{f - 1})', nf=LPS, negrita=True); NGT = f; f += 1
    et(f, 'Todo lo cobrado ese día (gaveta y fuera de ella)', bold=True, color=VINO); celda(arq[f'B{f}'], f'=B{D1 + 1}+B{D1 + 2}+B{NGT}', nf=LPS, negrita=True); f += 1
    et(f, 'Vendido al crédito ese día (no es cobro)'); celda(arq[f'B{f}'], '=' + SD('Ventas', NV, 'E', 'F', 'Crédito'), nf=LPS)
    f += 2; tit(f, '4. Conteo del efectivo'); f += 1
    for col, t in zip('ABC', ('Billete o moneda', 'Cantidad', 'Total (L)')):
        c = arq[f'{col}{f}']; c.value = t; c.font = Font(name=F, size=10, bold=True, color=VINO); c.border = borde; c.alignment = Alignment(horizontal='left' if col == 'A' else 'center')
    f += 1; C0 = f
    for v, n in [(500, 1), (200, 0), (100, 3), (50, 0), (20, 0), (10, 0), (5, 0), (2, 0), (1, 0), (0.50, 0), (0.20, 0), (0.10, 0), (0.05, 0)]:
        et(f, f'Billete de L {v:g}' if v >= 1 else f'Moneda de {int(round(v * 100))} centavos'); arq[f'D{f}'] = v
        celda(arq[f'B{f}'], n or None, entrada=True, nf='0'); celda(arq[f'C{f}'], f'=IF(B{f}="","",B{f}*D{f})', nf=LPS); f += 1
    validacion(arq, 'num').add(f'B{C0}:B{f - 1}')
    et(f, 'Total contado', bold=True, color=VINO); celda(arq[f'B{f}'], f'=SUM(B{C0}:B{f - 1})', nf='0'); celda(arq[f'C{f}'], f'=SUM(C{C0}:C{f - 1})', nf=LPS, negrita=True); CON = f
    f += 2; tit(f, '5. Resultado'); f += 1
    et(f, 'Diferencia (contado − debería haber)', bold=True); celda(arq[f'B{f}'], f'=ROUND(C{CON}-B{DEB},2)', nf=DIF, negrita=True); f += 1
    et(f, 'Resultado', bold=True); celda(arq[f'B{f}'], f'=IF(B{f - 1}=0,"La caja cuadra",IF(B{f - 1}>0,"Sobrante","Faltante"))', negrita=True)
    colorear(arq, f'B{f}', f'$B{f}', [('Faltante', ROJO), ('Sobrante', AMBAR), ('La caja cuadra', VERDE)]); f += 1
    et(f, 'Motivo o nota', bold=True); celda(arq[f'B{f}'], None, entrada=True, centro=False); arq.merge_cells(f'B{f}:C{f}')
    arq.column_dimensions['D'].hidden = True
    f += 3
    for t in ('Firma de quien estaba en caja', 'Firma de quien hizo el arqueo'):
        arq[f'A{f}'] = '______________________________'; arq[f'A{f + 1}'] = t; arq[f'A{f + 1}'].font = Font(name=F, size=9, color=GRIS); f += 3
    arq.print_area = f'A1:C{f}'
    # ---------------- Prueba de 10 días: columnas ocultas con las fechas anotadas desde la fecha de corte (los ejemplos son anteriores)
    for hoja, col, n in ((ven, 15, NV), (com, 11, NC), (abo, 9, NA), (gas, 7, NG), (caj, 14, NCJ)):
        for f in range(P, P + n):
            hoja.cell(f, col, f'=IF(AND(ISNUMBER(A{f}),A{f}>=Ajustes!$Z$1),A{f},"")')
        hoja.column_dimensions[L(col)].hidden = True
    # ---------------- Resumen del día (eliges la fecha; todo sale de las otras hojas)
    encabezado(rd, 'Resumen del día', 'Elige el día en la casilla amarilla. Todo sale solo de tus ventas, compras, abonos, gastos y caja.', 8)
    rd['A5'] = 'Día'; rd['A5'].font = Font(name=F, size=9, bold=True, color=VINO)
    x = rd['B5']; x.value = d(12); x.number_format = 'dd/mm/yyyy'; x.font = Font(name=F, size=14, bold=True, color=TINTA); x.fill = relleno(AMARILLO); x.protection = ABIERTA
    x.alignment = Alignment(horizontal='center'); x.border = Border(*(Side(style='medium', color=ORO),) * 4); validacion(rd, 'fecha').add('B5')
    DIA = lambda hoja, n, cm, extra='': f'SUMIFS({rng(hoja, cm, n)},{rng(hoja, "A", n)},$B$5{extra})'
    CJD = lambda col: f'INDEX({rng("Caja", col, NCJ)},MATCH($B$5,{rng("Caja", "A", NCJ)},0))'
    def bl(c0, f0, titulo, filas, ancho=(32, 15)):
        rd.column_dimensions[L(c0)].width = ancho[0]; rd.column_dimensions[L(c0 + 1)].width = ancho[1]
        for k in range(2): rd.cell(f0, c0 + k).fill = relleno(VINO)
        rd.cell(f0, c0, titulo).font = Font(name=F, size=11, bold=True, color='FFFFFF')
        for k, (t, fx, nf, bold) in enumerate(filas):
            a_ = rd.cell(f0 + 1 + k, c0, t); a_.font = Font(name=F, size=10, bold=bold, color=VINO if bold else TINTA); a_.border = borde
            celda(rd.cell(f0 + 1 + k, c0 + 1), fx, nf=nf, negrita=bold)
    bl(1, 7, 'Ventas del día', [('Total vendido', '=' + DIA('Ventas', NV, 'E'), LPS, True), ('Ganancia en ventas', '=' + DIA('Ventas', NV, 'I'), LPS, True),
                                ('Unidades vendidas', '=' + DIA('Ventas', NV, 'C'), '#,##0.##', False), ('Ventas anotadas', f'=COUNTIFS({rng("Ventas", "A", NV)},$B$5,{rng("Ventas", "E", NV)},">0")', '0', False)])
    bl(4, 7, 'Por forma de pago', [(fp, '=' + DIA('Ventas', NV, 'E', f',{rng("Ventas", "F", NV)},"{fp}"'), LPS, False) for fp in ('Efectivo', 'Tarjeta', 'Transferencia', 'Crédito')])
    rd.column_dimensions['C'].width = 4; rd.column_dimensions['F'].width = 4
    bl(7, 7, 'Entradas y salidas del día', [('Abonos recibidos', '=' + DIA('Abonos', NA, 'C'), LPS, False), ('Compras de mercadería', '=' + DIA('Compras', NC, 'E', f',{rng("Compras", "F", NC)},"<>Inventario inicial"'), LPS, False),
                                            ('Gastos', '=' + DIA('Gastos', NG, 'D'), LPS, False), ('Ganancia del día (menos gastos)', '=B9-H10', LPS, True)], ancho=(34, 15))
    bl(1, 13, 'La caja de ese día (de «Caja»)', [('Apertura', f'=IFERROR({CJD("B")},"")', LPS, False), ('Debería haber', f'=IFERROR({CJD("H")},"")', LPS, False),
                                                 ('Se contó', f'=IFERROR(IF({CJD("I")}="","",{CJD("I")}),"")', LPS, False), ('Diferencia', f'=IFERROR({CJD("J")},"")', DIF, True),
                                                 ('Resultado', f'=IFERROR(IF({CJD("K")}="","Sin contar",{CJD("K")}),"Ese día no está en «Caja»")', None, True)])
    colorear(rd, 'B18', '$B18', [('Faltante', ROJO), ('Sobrante', AMBAR), ('Cuadra', VERDE)])
    rd.conditional_formatting.add('H11', FormulaRule(formula=['$H$11<0'], font=ROJO))
    # Detalle: ventas y gastos del día
    def det(c0, f0, titulo, color, cols, hoja, helper, n, filas):
        for k in range(len(cols)): rd.cell(f0, c0 + k).fill = relleno(color)
        rd.cell(f0, c0, titulo).font = Font(name=F, size=11, bold=True, color='FFFFFF')
        for k, (nm, w, nf, sc) in enumerate(cols):
            c = rd.cell(f0 + 1, c0 + k, nm); c.font = Font(name=F, bold=True, color='FFFFFF', size=10); c.fill = relleno(VINO); c.border = borde; c.alignment = Alignment(horizontal='center', wrap_text=True)
            if w: rd.column_dimensions[L(c0 + k)].width = max(rd.column_dimensions[L(c0 + k)].width or 0, w)
            for r in range(filas):
                txt = '' if nf else '&""'  # en columnas de texto, una celda vacía no debe salir como 0
                celda(rd.cell(f0 + 2 + r, c0 + k), f'=IFERROR(INDEX({rng(hoja, sc, n)},MATCH({r + 1},{rng(hoja, helper, n)},0)){txt},"")', nf=nf, centro=sc not in ('B', 'C') or hoja == 'Ventas' and sc == 'C')
    det(1, 21, 'Ventas de ese día', ORO, [('Producto', 0, None, 'B'), ('Cantidad', 0, '#,##0.##', 'C'), ('', 0, None, 'C'), ('Total (L)', 0, LPS, 'E'), ('Forma de pago', 0, None, 'F'), ('', 0, None, 'F'), ('Cliente', 0, None, 'G'), ('Ganancia (L)', 0, LPS, 'I')], 'Ventas', 'N', NV, 30)
    # columnas C y F son separadores: se dejan vacías en el detalle
    for r in range(22, 53):
        for col in (3, 6):
            c = rd.cell(r, col); c.value = None; c.fill = relleno('FFFFFF'); c.border = Border()
    det(1, 55, 'Gastos de ese día', MAGENTA, [('Tipo de gasto', 0, None, 'B'), ('Monto (L)', 0, LPS, 'D'), ('', 0, None, 'D'), ('Detalle', 0, None, 'C'), ('Forma de pago', 0, None, 'E')], 'Gastos', 'F', NG, 15)
    for r in range(56, 72):
        c = rd.cell(r, 3); c.value = None; c.fill = relleno('FFFFFF'); c.border = Border()
    rd.print_area = 'A1:H71'
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
        ('Solo escribes en las celdas amarillas', 'Ventas, Compras, Abonos, Gastos, Caja y el conteo del Arqueo. Productos, Clientes, Estado de cuenta y Resumen se llenan solos.'),
        ('Empieza con lo que ya tienes', 'En «Compras», anota tu mercadería de hoy con la forma de pago «Inventario inicial». No sale de la caja.'),
        ('Anota cada venta', 'Producto, cantidad, precio y forma de pago. Si es al crédito, escribe el cliente: pasa solo a su cuenta. Cada venta calcula su ganancia.'),
        ('Anota compras, abonos y gastos', 'Las compras suben tu inventario; los abonos bajan lo que te deben; los gastos van al resumen. Lo que se paga en efectivo entra o sale de la caja solo.'),
        ('Cierra la caja cada día', 'En «Caja», escribe la fecha, la apertura, los retiros y lo que contaste. La hoja te dice cuánto debería haber y si cuadra.'),
        ('Haz el arqueo cuando quieras', 'En «Arqueo» eliges el día: lo que debería haber, los abonos de cada cliente y los cobros con tarjeta o transferencia salen solos. Tú cuentas billetes y monedas, y lo imprimes para firmarlo.'),
        ('Mira cómo te fue hoy', 'En «Resumen del día» eliges la fecha: ventas, ganancia, formas de pago, abonos, compras, gastos, la caja de ese día y el detalle de cada venta y cada gasto.'),
        ('Mira el «Resumen»', 'Elige el mes: ventas, ganancia, gastos, ganancia del mes, lo que te deben y lo que hay que comprar. Tus reglas (aviso, margen, límites, tipos de gasto) van en «Ajustes».'),
    ], ('Guías para tu negocio', '/guias/'), 'Con Gestión de Negocio VM todo esto pasa desde tu celular, con tienda en línea, recibos y recordatorios por WhatsApp.')
    orden = ['Cómo usarla', 'Resumen', 'Resumen del día', 'Ventas', 'Compras', 'Abonos', 'Gastos', 'Caja', 'Arqueo', 'Productos', 'Clientes', 'Estado de cuenta', 'Ajustes']
    wb._sheets = [wb[n] for n in orden]
    for h in wb.worksheets:
        h.sheet_view.showGridLines = False
        h.page_setup.fitToWidth = 1; h.page_setup.fitToHeight = 0; h.sheet_properties.pageSetUpPr.fitToPage = True
        if h.title not in ('Cómo usarla', 'Estado de cuenta', 'Arqueo'): h.page_setup.orientation = 'landscape'
        if h.title == 'Arqueo': h.page_setup.fitToHeight = 1
        proteger(h)
    for n in ('Ventas', 'Compras', 'Abonos', 'Gastos', 'Caja', 'Arqueo'): wb[n].sheet_properties.tabColor = ORO
    for n in ('Resumen', 'Resumen del día', 'Productos', 'Clientes', 'Estado de cuenta'): wb[n].sheet_properties.tabColor = MAGENTA
    wb.active = 1
    wb.properties.creator = 'Molina Soluciones Digitales'; wb.properties.title = 'Plantilla completa para tu negocio'
    return wb


CORTE = date(2026, 11, 22)  # la prueba cuenta desde el primer dato con fecha igual o posterior (los ejemplos son anteriores)
DIAS = 10


def sumas_clave(clave):
    """Dos sumas de comprobación de la contraseña (así la contraseña no queda escrita en el archivo)."""
    t = (clave.strip().upper() + ' ' * 30)[:30]
    return sum(ord(c) * (i + 1) for i, c in enumerate(t)), sum(ord(c) ** 2 * (i + 1) for i, c in enumerate(t)), len(clave.strip())


def prueba(wb, clave):
    """Prueba gratis de DIAS días: se usa normal; después, las fechas, cantidades y montos nuevos piden la contraseña de activación.
    Lo ya anotado se queda y se puede ver. Las fórmulas quedan protegidas con la contraseña de las hojas."""
    from openpyxl.workbook.defined_name import DefinedName
    from openpyxl.worksheet.datavalidation import DataValidation
    aj = wb['Ajustes']; k1, k2, ln = sumas_clave(clave)
    # Celdas ocultas de control (columna Z de Ajustes)
    aj['Z1'] = CORTE; aj['Z1'].number_format = 'dd/mm/yyyy'
    fechas = ','.join(f"{h}!${c}${P}:${c}${P + n - 1}" for h, c, n in (('Ventas', 'O', NV), ('Compras', 'K', NC), ('Abonos', 'I', NA), ('Gastos', 'G', NG), ('Caja', 'N', NCJ)))
    aj['Z2'] = f'=MIN({fechas})'  # día del primer dato propio (0 = aún no empieza)
    cl = 'UPPER(TRIM($B$28))'
    aj['Z3'] = (f'=AND(LEN(TRIM($B$28))={ln},SUMPRODUCT(CODE(MID({cl}&REPT(" ",30),ROW($Z$1:$Z$30),1))*ROW($Z$1:$Z$30))={k1},'
                f'SUMPRODUCT(CODE(MID({cl}&REPT(" ",30),ROW($Z$1:$Z$30),1))^2*ROW($Z$1:$Z$30))={k2})')
    aj['Z4'] = f'=OR($Z$3,$Z$2=0,TODAY()<=$Z$2+{DIAS - 1})'  # ¿se puede seguir anotando?
    aj.column_dimensions['Z'].hidden = True
    wb.defined_names['PUEDE'] = DefinedName('PUEDE', attr_text='Ajustes!$Z$4')
    # Caja de activación en Ajustes, debajo de las reglas y de los tipos de gasto (que llegan a la fila 23)
    for k in range(2): aj.cell(26, 1 + k).fill = relleno(ORO)
    aj['A26'] = 'Prueba y activación'; aj['A26'].font = Font(name=F, size=11, bold=True, color=TINTA)
    aj['A27'] = 'Estado'; aj['A27'].font = Font(name=F, size=10, bold=True, color=TINTA); aj['A27'].border = borde
    est = (f'=IF($Z$3,"Activada. ¡Gracias por tu compra!",IF($Z$2=0,"Prueba gratis de {DIAS} días: empieza cuando anotes tu primer dato",'
           f'IF(TODAY()<=$Z$2+{DIAS - 1},"Prueba gratis: te quedan "&($Z$2+{DIAS - 1}-TODAY()+1)&" días","Prueba terminada: escribe la contraseña para seguir anotando")))')
    aj['B27'] = est; aj['B27'].font = Font(name=F, size=10, bold=True, color=VINO)
    aj['A28'] = 'Contraseña de activación'; aj['A28'].font = Font(name=F, size=10, bold=True, color=TINTA); aj['A28'].border = borde
    celda(aj['B28'], None, entrada=True); aj['B28'].border = Border(*(Side(style='medium', color=ORO),) * 4)
    aj['A29'] = 'Cómprala por WhatsApp: 3313-0265. La escribes una sola vez y queda activada.'; aj['A29'].font = Font(name=F, size=9, color=GRIS)
    # Aviso en el Resumen
    res = wb['Resumen']
    for f in (5, 6):
        for k in range(5, 9): res.cell(f, k).fill = relleno(ORO)
        res.merge_cells(start_row=f, start_column=5, end_row=f, end_column=8)
    res['E5'] = '=Ajustes!B27'; res['E5'].font = Font(name=F, size=10, bold=True, color=TINTA)
    res['E6'] = '=IF(Ajustes!$Z$3,"","Para seguir anotando después de la prueba: compra la contraseña por WhatsApp 3313-0265 y escríbela en «Ajustes».")'
    res['E6'].font = Font(name=F, size=8, color=TINTA)
    # Las validaciones de fechas y números de las hojas de datos piden la prueba vigente o la contraseña
    msg = (f'Tu prueba gratis de {DIAS} días terminó. Lo que anotaste sigue aquí; para seguir anotando, escribe la contraseña en «Ajustes» '
           '(cómprala por WhatsApp: 3313-0265). Si aún estás en la prueba, revisa que sea un número o una fecha.')
    for nombre in ('Ventas', 'Compras', 'Abonos', 'Gastos', 'Caja', 'Arqueo'):
        ws = wb[nombre]; nuevas = []
        for dv in list(ws.data_validations.dataValidation):
            if dv.type not in ('decimal', 'date'): continue
            if nombre == 'Arqueo' and str(dv.sqref) == 'B5': continue  # elegir el día del arqueo siempre se puede
            x = str(dv.sqref).split()[0].split(':')[0]
            cond = f'{x}>36526' if dv.type == 'date' else (f'{x}>=0,{x}<=0.95' if dv.operator == 'between' else f'{x}>=0')
            n = DataValidation(type='custom', formula1=f'AND(PUEDE,ISNUMBER({x}),{cond})', allow_blank=True, showErrorMessage=True, errorTitle='Prueba terminada o dato no válido', error=msg)
            n.sqref = dv.sqref; nuevas.append(n); ws.data_validations.dataValidation.remove(dv)
        for n in nuevas: ws.add_data_validation(n)
    # Textos de la ayuda
    ay = wb['Cómo usarla']; ay.insert_rows(5, 3)
    for k in range(1, 3): ay.cell(5, k).fill = relleno(ORO); ay.cell(6, k).fill = relleno(ORO)
    ay['B5'] = f'Pruébala gratis {DIAS} días'; ay['B5'].font = Font(name=F, size=12, bold=True, color=TINTA)
    ay['B6'] = (f'La prueba empieza el día que anotas tu primer dato. Al terminar, lo que anotaste se queda y lo puedes ver, pero para seguir anotando '
                'necesitas la contraseña: cómprala por WhatsApp (3313-0265) y escríbela una sola vez en «Ajustes».')
    ay['B6'].font = Font(name=F, size=10, color=TINTA); ay['B6'].alignment = Alignment(wrap_text=True, vertical='top'); ay.row_dimensions[6].height = 30
    for ws in wb.worksheets:
        ws.protection.password = clave
    return wb


if __name__ == '__main__':
    # Se publica con prueba gratis de 10 días. La contraseña NO va en este repositorio (es público): se pasa por la variable CLAVE_COMPLETA.
    # 1) CLAVE_COMPLETA='…' python3 herramientas/plantilla_completa.py   → /tmp/plantilla-completa-prueba.xlsx
    # 2) Recalcularla con LibreOffice y copiarla a descargas/plantilla-completa-negocio.xlsx
    clave = os.environ.get('CLAVE_COMPLETA')
    if not clave: sys.exit('Falta la variable CLAVE_COMPLETA')
    prueba(construir(), clave).save('/tmp/plantilla-completa-prueba.xlsx')
    print('prueba: /tmp/plantilla-completa-prueba.xlsx')
